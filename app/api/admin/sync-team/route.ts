import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { 
  createDiscordRole, 
  createDiscordChannel, 
  createDiscordVoiceChannel, 
  autoSortTeamRoles,
  sendTeamTracker 
} from '@/lib/discord';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) {
      return NextResponse.json({ error: 'Slug tim tidak diberikan.' }, { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(kvKey),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) return NextResponse.json({ error: 'Tim tidak ditemukan.' }, { status: 404 });

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const namaTim = team.namaTim as string;
    const warna = team.warna as string;
    const logoTim = team.logoTim as string;
    const createdAt = team.createdAt as string;
    const updatedAt = team.updatedAt as string || new Date().toISOString();
    
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    let rolesCreated = false;
    let fixMessage = "";

    // =========================================================================
    // 1. FIX BUG: BUAT ROLE & CHANNEL JIKA SEBELUMNYA KOSONG
    // =========================================================================
    if (!team.discordRoleId) {
      try {
        const roleId = await createDiscordRole(namaTim, warna);
        let channelId = "";
        let voiceChannelId = ""; 
        let trackerMsgId = ""; 

        if (roleId) {
          rolesCreated = true;
          channelId = await createDiscordChannel(namaTim, roleId) || "";
          voiceChannelId = await createDiscordVoiceChannel(namaTim, roleId) || ""; 
          
          if (channelId) {
            trackerMsgId = await sendTeamTracker({ channelId, namaTim, warna, roleId, players, createdAt });
          }

          // Update Database lokal tim
          await kv.hset(kvKey, { 
            discordRoleId: roleId,
            discordChannelId: channelId, 
            discordVoiceChannelId: voiceChannelId, 
            trackerMsgId: trackerMsgId 
          });

          // Injeksi id baru ke memori untuk proses sync di bawahnya
          team.discordRoleId = roleId;
          team.discordChannelId = channelId;
          team.trackerMsgId = trackerMsgId;
          fixMessage = " (Infrastruktur Discord yang hilang berhasil dibuat!)";
        }
      } catch (err) {
        console.error(`Gagal memperbaiki infrastruktur tim ${namaTim}:`, err);
        return NextResponse.json({ error: `Gagal membuat role/channel untuk tim ${namaTim}` }, { status: 500 });
      }
    }

    const teamRoleId = team.discordRoleId || team.roleId;

        // Fungsi pembantu untuk memberi jeda agar tidak terkena limit Discord
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // =========================================================================
    // 2. AUTO-DISCOVERY & SYNC DATABASE GLOBAL (FORCE SYNC & AUTO CLEAN)
    // =========================================================================
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();
      const duelId = p.idDuelLinks || p.duelId;

      // --- A. INJEK DB GLOBAL ---
      if (originalDiscord) await kv.sadd('global:discord', originalDiscord);
      if (originalIgn) await kv.sadd('global:ign', originalIgn);
      if (duelId) await kv.sadd('global:duellinks', duelId.toString().trim());

      if (originalDiscord) {
        try {
          // Jeda 500ms agar Discord tidak memblokir karena spam (Rate Limit)
          await sleep(500);

          const searchRes = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/search?query=${encodeURIComponent(originalDiscord)}&limit=5`, 'GET');
          const member = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
          
          if (member) {
            const userId = member.user.id;
            const roleJabatan = (p.role || '');

            try { await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}`, 'PATCH', { nick: originalIgn }); } catch (e) {}
            
            try {
              if (teamRoleId) await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${teamRoleId}`, 'PUT');
              
              await sleep(100); // Jeda kecil antar role
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT');
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT');

              if (roleJabatan === 'Ketua') {
                await sleep(100);
                await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_KETUA}`, 'PUT');
              } else if (roleJabatan === 'Wakil Ketua') {
                await sleep(100);
                await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_WAKIL}`, 'PUT');
              }

              // Jika berhasil, pastikan dicatat di database
              await kv.hset('global:verified_users', { [originalDiscord]: userId });
              await kv.sadd('global:discord_ids', userId);
              
              verifiedMap[originalDiscord] = userId;
              verifiedMap[searchKeyDiscord] = userId;

            } catch (roleError) {
              console.error(`Gagal memberi role ke @${originalDiscord}`, roleError);
            }
          } else {
            // JIKA TIDAK KETEMU (Belum join / typo): Hapus dari memori lokal agar centangnya dicabut (jadi ❌)
            delete verifiedMap[originalDiscord];
            delete verifiedMap[searchKeyDiscord];
            // Hapus juga "data hantu" dari database KV
            await kv.hdel('global:verified_users', originalDiscord);
            await kv.hdel('global:verified_users', searchKeyDiscord);
          }
        } catch (err) {
          console.error(`[Auto-Sync] Gagal mencari user @${originalDiscord} di server:`, err);
        }
      }
    }

    // =========================================================================
    // 3. SYNC EMBED ROSTER DI DISCORD
    // =========================================================================
    if (team.adminMsgId) {
      const ketua = players.find((p: any) => p.role === 'Ketua') || { ign: "-" };
      const wakil = players.find((p: any) => p.role === 'Wakil Ketua') || { ign: "-" };
      
      let playerListString = "";
      players.forEach((p: any) => { 
        playerListString += `${p.ign} (${p.idDuelLinks || p.duelId})\n`; 
      });
      
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${team.adminMsgId}`, 'PATCH', rosterPayload).catch(() => {});
    }

    // =========================================================================
    // 4. SYNC EMBED TRACKER DI DISCORD
    // =========================================================================
    if (team.discordChannelId && team.trackerMsgId) {
      let verifiedCount = 0;
      let rosterText = "";

      players.forEach((p: any) => {
        const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
        const searchKeyDiscord = originalDiscord.toLowerCase();
        
        const isVerified = !!(verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord]);
        if (isVerified) verifiedCount++;
        
        rosterText += `${isVerified ? '✅' : '❌'} ${p.ign} (@${originalDiscord}) - ${p.role}\n`;
      });

      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `DAFTAR ROSTER:\n${rosterText}`,
          color: hexToDecimal(warna),
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '(Belum Ada)', inline: true },
            { name: "📊 Status", value: `${verifiedCount} / ${players.length} Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt, new Date().toISOString() ) }
        }]
      };
      await discordAPI(`/channels/${team.discordChannelId}/messages/${team.trackerMsgId}`, 'PATCH', trackerPayload).catch(() => {});
    }

    // =========================================================================
    // 5. AUTO SORT ROLE (HANYA DIEKSEKUSI JIKA ROLE BARU DIBUAT)
    // =========================================================================
    if (rolesCreated) {
      try { await autoSortTeamRoles(); } catch (e) { console.error(e); }
    }

    return NextResponse.json({ success: true, message: `"${namaTim}" berhasil disinkronisasi!${fixMessage}` });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi.' }, { status: 500 });
  }
                         }
        
