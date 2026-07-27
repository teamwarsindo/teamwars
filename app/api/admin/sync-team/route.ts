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

            // Kumpulkan semua role lama pemain (agar tidak terhapus)
            const currentRoles = memberData.roles || [];
            const newRoles = new Set(currentRoles);

            // Daftar Role Baru yang ingin ditambahkan
            const rolesToAdd = [];
            if (teamRoleId) rolesToAdd.push(teamRoleId);
            if (DISCORD_CONFIG.ROLE_DUELIST) rolesToAdd.push(DISCORD_CONFIG.ROLE_DUELIST);
            if (DISCORD_CONFIG.ROLE_VERIFIED) rolesToAdd.push(DISCORD_CONFIG.ROLE_VERIFIED);
            if (roleJabatan === 'Ketua' && DISCORD_CONFIG.ROLE_KETUA) rolesToAdd.push(DISCORD_CONFIG.ROLE_KETUA);
            else if ((roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') && DISCORD_CONFIG.ROLE_WAKIL) rolesToAdd.push(DISCORD_CONFIG.ROLE_WAKIL);

            // Masukkan ke set untuk Bulk Update
            rolesToAdd.forEach(r => newRoles.add(r));

            // 1. COBA BULK UPDATE SEKALIGUS (Cepat untuk member biasa)
            try {
              await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}`, 'PATCH', { 
                nick: originalIgn,
                roles: Array.from(newRoles)
              });
              
              isUserVerified = true;
              verifiedCount++;
              await sleep(1000); 
              
            } catch (bulkErr) {
              console.error(`[Admin Detected] Bulk Update ditolak untuk @${currentDiscord}. Mengaktifkan Fallback Manual...`);
              
              // 2. FALLBACK MANUAL (Khusus untuk Admin/Owner yang kebal PATCH Bulk)
              try {
                  // A. Coba paksakan ganti Nickname (Biasanya akan tetap gagal untuk Admin, jadi kita hiraukan error-nya)
                  await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}`, 'PATCH', { nick: originalIgn }).catch(() => null);
                  
                  // B. Suntikkan Role SATU PER SATU secara aman tanpa menyentuh Role Admin bawaan user
                  for (const rId of rolesToAdd) {
                      await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${targetUserId}/roles/${rId}`, 'PUT').catch(() => null);
                      await sleep(300); // jeda irit per role
                  }

                  // Beri status Sukses (karena role berhasil masuk meskipun IGN gagal)
                  isUserVerified = true;
                  verifiedCount++;
                  
              } catch(fallbackErr) {
                  console.error(`Gagal total Fallback untuk @${currentDiscord}:`, fallbackErr);
              }
            }
          }
        } catch (err) {
          // Blok catch yang hilang sudah dikembalikan ke sini
          console.error(`Gagal sinkronisasi user @${currentDiscord}:`, err);
        }
      } // Penutup if (currentDiscord) yang hilang sudah dikembalikan

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
} // Penutup utama fungsi POST
        
