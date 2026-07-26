import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Fungsi jeda agar tidak di-limit oleh Discord (Anti-Spam)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) return NextResponse.json({ error: 'Slug tim tidak diberikan.' }, { status: 400 });

    const kvKey = `teams:${teamSlug}`;
    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(kvKey),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) return NextResponse.json({ error: 'Tim tidak ditemukan.' }, { status: 404 });

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const namaTim = team.namaTim as string;
    const warna = team.warna as string;
    const createdAt = team.createdAt as string;
    const teamRoleId = team.discordRoleId || team.roleId;
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    let verifiedCount = 0;
    let rosterText = "";
    let teamDataChanged = false; // Tanda jika ada username Discord yang ter-update otomatis

    // =========================================================================
    // 1. UPDATE GLOBAL DB, CEK DISCORD ID, GANTI NICKNAME & KASIH ROLE
    // =========================================================================
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      let currentDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const duelId = p.idDuelLinks || p.duelId;
      let isUserVerified = false;

      // Update IGN & Duel ID Global (SADD anti-dobel otomatis)
      if (originalIgn) await kv.sadd('global:ign', originalIgn);
      if (duelId) await kv.sadd('global:duellinks', duelId.toString().trim());

      if (currentDiscord) {
        const searchKeyDiscord = currentDiscord.toLowerCase();
        // Cek apakah kita sudah punya Discord ID-nya dari database
        const knownUserId = verifiedMap[currentDiscord] || verifiedMap[searchKeyDiscord];
        let targetUserId = knownUserId;
        let memberData = null;

        try {
          if (knownUserId) {
            // SKENARIO A: Punya Discord ID. Cek langsung ke server Discord-nya!
            await sleep(500);
            memberData = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${knownUserId}`, 'GET');
            
            if (memberData && memberData.user) {
              const realDiscordUsername = memberData.user.username;
              
              // DETEKSI AUTO-UPDATE: Jika username di Discord ternyata beda dengan di database tim
              if (realDiscordUsername.toLowerCase() !== searchKeyDiscord) {
                console.log(`[Auto-Update] Username berubah! Lama: ${currentDiscord} -> Baru: ${realDiscordUsername}`);
                
                // Hapus username lama dari Database Global
                await kv.srem('global:discord', currentDiscord);
                await kv.hdel('global:verified_users', currentDiscord);
                await kv.hdel('global:verified_users', searchKeyDiscord);

                // Update variabel dengan username yang baru
                currentDiscord = realDiscordUsername;
                p.discord = realDiscordUsername; // Update langsung di roster tim
                teamDataChanged = true;
                
                // Tambah username baru ke Database Global
                verifiedMap[realDiscordUsername] = knownUserId;
                verifiedMap[realDiscordUsername.toLowerCase()] = knownUserId;
                await kv.hset('global:verified_users', { [realDiscordUsername]: knownUserId });
              }
            }
          } else {
            // SKENARIO B: Belum tahu Discord ID (Pemain Baru). Cari lewat fitur Search.
            await sleep(500);
            const searchRes = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/search?query=${encodeURIComponent(currentDiscord)}&limit=5`, 'GET');
            memberData = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
            
            if (memberData) {
              targetUserId = memberData.user.id;
              
              // Simpan Discord ID yang baru ditemukan ke Database Global
              await kv.hset('global:verified_users', { [currentDiscord]: targetUserId });
              await kv.sadd('global:discord_ids', targetUserId);
              verifiedMap[currentDiscord] = targetUserId;
              verifiedMap[searchKeyDiscord] = targetUserId;
            }
          }

          // JIKA MEMBER DITEMUKAN (via ID atau Search), LANJUTKAN EKSEKUSI!
          if (memberData && targetUserId) {
            // Kunci username (yang valid) ke Global DB
            await kv.sadd('global:discord', currentDiscord);
            const roleJabatan = (p.role || '');

            // 1. GANTI NICKNAME (Ign)
            try {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}`, 'PATCH', { nick: originalIgn });
              await sleep(400); // Jeda agar tidak dianggap spam
            } catch (nickErr) {
              // Jika bot gagal ganti nick (misal: user adalah admin/owner), biarkan saja dan lanjut
              console.error(`Info: Gagal ubah nickname untuk @${currentDiscord}`);
            }

            // 2. KASIH ROLE TIM
            if (teamRoleId) {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${teamRoleId}`, 'PUT').catch(() => null);
              await sleep(400);
            }
            
            // 3. KASIH ROLE DUELIST & VERIFIED
            await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'PUT').catch(() => null);
            await sleep(400);
            await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${DISCORD_CONFIG.ROLE_VERIFIED}`, 'PUT').catch(() => null);
            await sleep(400);

            // 4. KASIH ROLE JABATAN
            if (roleJabatan === 'Ketua') {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${DISCORD_CONFIG.ROLE_KETUA}`, 'PUT').catch(() => null);
            } else if (roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${DISCORD_CONFIG.ROLE_WAKIL}`, 'PUT').catch(() => null);
            }

            // Tandai Berhasil
            isUserVerified = true;
            verifiedCount++;
          }
        } catch (err) {
          console.error(`Gagal sinkronisasi user @${currentDiscord}:`, err);
        }
      }

      // Susun teks untuk di Embed Tracker (✅ / ❌)
      rosterText += `${isUserVerified ? '✅' : '❌'} ${p.ign} (@${currentDiscord}) - ${p.role}\n`;
    }

    // Jika ada username yang ter-update otomatis dari Discord, Simpan JSON Players terbaru ke Tim!
    if (teamDataChanged) {
       await kv.hset(kvKey, { players: JSON.stringify(players) });
    }

    // =========================================================================
    // 2. UPDATE EMBED TRACKER
    // =========================================================================
    if (team.discordChannelId && team.trackerMsgId) {
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

    return NextResponse.json({ success: true, message: `Sinkronisasi Cerdas untuk "${namaTim}" selesai!` });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi.' }, { status: 500 });
  }
          }
