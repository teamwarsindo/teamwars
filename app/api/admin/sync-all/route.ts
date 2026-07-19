import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Matikan cache
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
// Izinkan Vercel mengeksekusi lebih lama (opsional, batas maksimal tergantung paket Vercel)
export const maxDuration = 60; 

export async function GET() {
  const processLogs: string[] = [];
  
  try {
    processLogs.push("🚀 [MULAI] Inisialisasi Sinkronisasi Terpadu (Sapu Jagat)...");
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      return NextResponse.json({ error: "Missing Discord Credentials" }, { status: 500 });
    }

    // ==========================================================
    // 1. TARIK SEMUA MEMBER DISCORD (Paginasi)
    // ==========================================================
    processLogs.push("📥 Menarik data seluruh member dari Discord...");
    let allMembers: any[] = [];
    let lastId = "0";
    let isFetching = true;

    while (isFetching) {
      const resMembers = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${lastId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bot ${botToken}` },
        cache: 'no-store'
      });

      if (!resMembers.ok) throw new Error("Gagal fetch Discord Members");

      const data = await resMembers.json();
      if (data.length === 0) {
        isFetching = false;
        break;
      }
      allMembers = allMembers.concat(data);
      lastId = data[data.length - 1].user.id;
      if (data.length < 1000) isFetching = false;
    }
    processLogs.push(`👥 Total member ditarik: ${allMembers.length} orang.`);

    // ==========================================================
    // 2. PETAKAN DATABASE TIM (Untuk Pencarian Instan)
    // ==========================================================
    processLogs.push("🗄️ Memuat seluruh data tim dari Database KV...");
    const allTeamSlugs = await kv.smembers('global:teams');
    const dbPlayersMap = new Map(); // Kunci: username, Nilai: Data Tim & Player
    const dbTeamsMap = new Map();   // Kunci: slug, Nilai: Data Tim utuh

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      if (!teamData || !teamData.players) continue;
      
      const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      dbTeamsMap.set(slug, { ...teamData, parsedPlayers: players });

      players.forEach((p: any) => {
        const cleanUsername = p.discord?.toLowerCase().trim().replace(/^@/, '') || "";
        dbPlayersMap.set(cleanUsername, { teamSlug: slug, player: p, teamData });
      });
    }

    // ==========================================================
    // 3. SCANNING & PENCOCOKAN (Roles & Nickname)
    // ==========================================================
    processLogs.push("🔍 Mulai pemindaian silang (Cross-Match) dan Update Role/Nickname...");
    const updatedVerifiedUsers: Record<string, string> = {};
    const teamsToUpdateTracker = new Set<string>();
    
    let stats = { rolesAssigned: 0, nicksUpdated: 0, alreadySynced: 0 };

    for (const member of allMembers) {
      const rawUsername = member.user.username || "";
      const cleanUsername = rawUsername.toLowerCase().trim().replace(/^@/, '');
      
      const dbMatch = dbPlayersMap.get(cleanUsername);
      if (!dbMatch) continue; 

      const { teamSlug, player, teamData } = dbMatch;
      const currentRoles = member.roles || [];
      const userId = member.user.id;
      const currentNick = member.nick || member.user.username;

      // Kumpulkan role wajib (Tambahkan fallback properti roleId jika ada)
      const rolesToAssign = [DISCORD_CONFIG.ROLE_DUELIST];
      if (player.role === 'Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_KETUA);
      if (player.role === 'Wakil Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_WAKIL);
      if (teamData.roleId) rolesToAssign.push(teamData.roleId);
      if (teamData.discordRoleId) rolesToAssign.push(teamData.discordRoleId);

      // 🔥 FIX: Filter untuk memastikan ID Role tidak kosong/undefined
      const missingRoles = rolesToAssign.filter(r => r && !currentRoles.includes(r));
      const needsNickUpdate = currentNick !== player.ign;

      if (missingRoles.length > 0 || needsNickUpdate) {
        try {
          let roleErrorMsg = "";
          // Tembak API Role (Satu per satu dengan jeda)
          for (const rId of missingRoles) {
            const resRole = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${rId}`, {
              method: 'PUT',
              headers: { 
                'Authorization': `Bot ${botToken}`,
                'Content-Length': '0' // Mencegah error HTTP 411 Length Required
              }
            });
            
            if (!resRole.ok) {
              const errTxt = await resRole.text();
              roleErrorMsg += `[ID ${rId}: ${resRole.status} - ${errTxt}] `;
            } else {
              stats.rolesAssigned++;
            }
            await new Promise(r => setTimeout(r, 100)); // Jeda 100ms
          }

          let nickErrorMsg = "";
          // Tembak API Nickname
          if (needsNickUpdate) {
            const resNick = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ nick: player.ign })
            });
            
            if (!resNick.ok) {
              const errTxt = await resNick.text();
              nickErrorMsg = `[Nick: ${resNick.status} - ${errTxt}]`;
            } else {
              stats.nicksUpdated++;
            }
            await new Promise(r => setTimeout(r, 100)); // Jeda 100ms
          }

          // Pencatatan Log Super Detail
          if (roleErrorMsg || nickErrorMsg) {
             processLogs.push(`⚠️ [PARTIAL] @${cleanUsername} -> Ada yg gagal. Error: ${roleErrorMsg} ${nickErrorMsg}`);
          } else {
             processLogs.push(`✅ [ACTION] @${cleanUsername} -> Role/Nick berhasil disuntikkan.`);
          }
          
        } catch (e: any) {
          processLogs.push(`❌ [ERROR] @${cleanUsername} -> Sistem fetch error: ${e.message}`);
        }
      } else {
        stats.alreadySynced++;
      }

      // Pastikan masuk ke daftar terverifikasi
      updatedVerifiedUsers[cleanUsername] = userId;
      teamsToUpdateTracker.add(teamSlug); 
    }

    // ==========================================================
    // 4. UPDATE GLOBAL MAP
    // ==========================================================
    if (Object.keys(updatedVerifiedUsers).length > 0) {
      await kv.hset('global:verified_users', updatedVerifiedUsers);
      processLogs.push("💾 Data 'global:verified_users' berhasil diperbarui di memori inti.");
    }

    // ==========================================================
    // 5. RENDER ULANG TRACKER TIM TERKAIT
    // ==========================================================
    processLogs.push(`🔄 Memperbarui Tracker untuk ${teamsToUpdateTracker.size} tim...`);
    const verifiedMap = (await kv.hgetall('global:verified_users')) || {};
    let trackersUpdated = 0;

    for (const slug of teamsToUpdateTracker) {
      const team = dbTeamsMap.get(slug);
      if (!team || !team.trackerMsgId || !team.discordChannelId) continue;

      let verifiedCount = 0;
      let rosterText = "";

      team.parsedPlayers.forEach((p: any) => {
        const pDiscord = p.discord?.toLowerCase().trim().replace(/^@/, '') || "";
        const isVerified = !!verifiedMap[pDiscord];
        if (isVerified) verifiedCount++;
        const statusIcon = isVerified ? '✅' : '❌';
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
      const parsedColor = parseInt(team.warna?.replace('#', ''), 16) || 3447003;

      const expectedDescription = `**DAFTAR ROSTER:**\n${rosterText}`;

      try {
        await fetch(`https://discord.com/api/v10/channels/${team.discordChannelId}/messages/${team.trackerMsgId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            embeds: [{
              title: `🛡️ DATABASE TIM: ${team.namaTim.toUpperCase()}`,
              description: expectedDescription,
              color: parsedColor,
              fields: [
                { name: "📌 Role Tim", value: team.discordRoleId ? `<@&${team.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
                { name: "📊 Status", value: `**${verifiedCount} / ${team.parsedPlayers.length}** Terverifikasi`, inline: true }
              ],
              footer: { text: `Diperbarui pada ${dateFormatter.format(now)} pukul ${timeFormatter.format(now).replace(':', '.')} WIB` }
            }]
          })
        });
        
        await new Promise(r => setTimeout(r, 150)); // Jeda aman Tracker Patch
        trackersUpdated++;
      } catch (err) {
        processLogs.push(`❌ [ERROR] Tracker tim '${team.namaTim}' gagal dirender.`);
      }
    }

    processLogs.push("🏁 SINKRONISASI TERPADU SELESAI!");

    return NextResponse.json({ 
      success: true, 
      message: "Mass Sync Berhasil Dieksekusi!",
      statistik: {
        total_role_ditambahkan: stats.rolesAssigned,
        total_nickname_diubah: stats.nicksUpdated,
        user_sudah_sinkron_sebelumnya: stats.alreadySynced,
        tracker_tim_diperbarui: trackersUpdated
      },
      detail_log: processLogs
    });

  } catch (error: any) {
    processLogs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: String(error), detail_log: processLogs }, { status: 500 });
  }
      }
          
