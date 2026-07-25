import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) return NextResponse.json({ error: 'Tim tidak ditemukan.' }, { status: 404 });

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);
    
    const namaTim = team.namaTim as string;
    const warna = team.warna as string;
    const logoTim = team.logoTim as string;
    const teamRoleId = team.discordRoleId || team.roleId;
    const createdAt = team.createdAt as string;
    const updatedAt = team.updatedAt as string;

    // =========================================================================
    // 1. AUTO-DISCOVERY & SYNC DATABASE GLOBAL
    // Mempertahankan huruf kapital, auto-search member Discord, auto-verify!
    // =========================================================================
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();

      // --- A. SYNC GLOBAL DB (SELF-HEALING) ---
      if (originalDiscord) {
        await kv.sadd('global:discord', originalDiscord);
      }
      if (originalIgn) {
        await kv.sadd('global:ign', originalIgn);
      }
      if (p.idDuelLinks) {
        await kv.sadd('global:duellinks', p.idDuelLinks.toString().trim());
      }

      // --- B. DISCORD AUTO-VERIFIKASI (INTEL MODE) ---
      let isVerified = !!(verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord]);

      if (!isVerified && originalDiscord) {
        try {
          // Cari user di server Discord berdasarkan username-nya
          const searchRes = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/search?query=${encodeURIComponent(originalDiscord)}&limit=5`, 'GET');
          const member = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
          
          if (member) {
            const userId = member.user.id;
            const roleJabatan = (p.role || '').toLowerCase();

            // 1. Ubah Nickname jadi IGN
            await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}`, 'PATCH', { nick: originalIgn }).catch(() => {});
            
            // 2. Berikan Role Tim (Jika tim sudah punya role)
            if (teamRoleId) {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${teamRoleId}`, 'PUT').catch(() => {});
            }
            
            // 3. Berikan Role Duelist & Verified
            await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => {});
            await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => {});

            // 4. Berikan Role Ketua / Wakil sesuai jabatannya
            if (roleJabatan === 'ketua') {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_KETUA}`, 'PUT').catch(() => {});
            } else if (roleJabatan === 'wakil' || roleJabatan === 'wakil ketua') {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${userId}/roles/${DISCORD_CONFIG.ROLE_WAKIL}`, 'PUT').catch(() => {});
            }

            // 5. Catat otomatis ke database Global Verified
            await kv.hset('global:verified_users', { [originalDiscord]: userId });
            await kv.sadd('global:discord_ids', userId);
            
            // Update map lokal agar Tracker langsung valid
            verifiedMap[originalDiscord] = userId;
            verifiedMap[searchKeyDiscord] = userId;
          }
        } catch (err) {
          console.error(`[Auto-Sync] Gagal memproses auto-verify untuk ${originalDiscord}:`, err);
        }
      }
    }

    // =========================================================================
    // 2. SYNC EMBED ROSTER DI DISCORD
    // =========================================================================
    if (team.adminMsgId) {
      const ketua = players.find((p: any) => p.role?.toLowerCase() === 'ketua') || players[0];
      const wakil = players.find((p: any) => p.role?.toLowerCase() === 'wakil' || p.role?.toLowerCase() === 'wakil ketua') || players[1];
      
      let playerListString = "";
      players.forEach((p: any) => { playerListString += `${p.ign} (${p.idDuelLinks})\n`; });
      
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketua?.ign || '-', inline: true },
            { name: "Wakil", value: wakil?.ign || '-', inline: true },
            { name: "Players", value: playerListString || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${team.adminMsgId}`, 'PATCH', rosterPayload).catch(console.error);
    }

    // =========================================================================
    // 3. SYNC EMBED TRACKER DI DISCORD
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
      await discordAPI(`/channels/${team.discordChannelId}/messages/${team.trackerMsgId}`, 'PATCH', trackerPayload).catch(console.error);
    }

    return NextResponse.json({ success: true, message: `"${namaTim}" berhasil sinkron ke Database Global.` });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi.' }, { status: 500 });
  }
                                  }
