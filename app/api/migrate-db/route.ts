import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// 🔥 WAJIB: Matikan semua sistem cache Next.js untuk rute ini
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const processLogs: string[] = []; // Menampung semua riwayat proses
  
  try {
    processLogs.push("🚀 Mulai proses migrasi dan sinkronisasi...");
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      processLogs.push("❌ GAGAL: Kredensial Discord (GUILD_ID / BOT_TOKEN) tidak ditemukan di .env");
      return NextResponse.json({ error: "Missing Discord Credentials", detail_log: processLogs }, { status: 500 });
    }

    // ==========================================================
    // 1. REVERSE-SYNC (AMBIL SEMUA MEMBER TANPA TERPOTONG)
    // ==========================================================
    processLogs.push("📥 Mengambil data member dari Discord (Paginasi aktif)...");
    let allMembers: any[] = [];
    let lastId = "0";
    let isFetching = true;

    while (isFetching) {
      const resMembers = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${lastId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bot ${botToken}` },
        cache: 'no-store'
      });

      if (!resMembers.ok) {
        const errText = await resMembers.text();
        processLogs.push(`❌ GAGAL: Error API Discord saat ambil member. Status: ${resMembers.status} - ${errText}`);
        return NextResponse.json({ error: "Discord API Error", detail_log: processLogs }, { status: 500 });
      }

      const data = await resMembers.json();
      if (data.length === 0) {
        isFetching = false;
        break;
      }

      allMembers = allMembers.concat(data);
      lastId = data[data.length - 1].user.id;
      
      if (data.length < 1000) {
        isFetching = false;
      }
    }
    
    processLogs.push(`✅ Berhasil menarik total ${allMembers.length} member dari server Discord.`);
    
    const duelistRoleId = DISCORD_CONFIG.ROLE_DUELIST;
    const verifiedMembers = allMembers.filter((m: any) => m.roles?.includes(duelistRoleId));
    processLogs.push(`✅ Ditemukan ${verifiedMembers.length} member yang memiliki Role Duelist.`);

    const updatedVerifiedUsers: Record<string, string> = {};
    verifiedMembers.forEach((m: any) => {
      const rawUsername = m.user.username || "";
      const cleanUsername = rawUsername.toLowerCase().trim().replace(/^@/, '');
      updatedVerifiedUsers[cleanUsername] = m.user.id;
    });

    if (Object.keys(updatedVerifiedUsers).length > 0) {
      await kv.hset('global:verified_users', updatedVerifiedUsers);
      processLogs.push("✅ Database 'global:verified_users' berhasil diperbarui dengan data terbaru.");
    }

    // ==========================================================
    // 2. SINKRONISASI TRACKER TIM
    // ==========================================================
    processLogs.push("🔍 Memulai inspeksi tracker ke setiap tim...");
    const allTeamSlugs = await kv.smembers('global:teams');
    const verifiedMap = (await kv.hgetall('global:verified_users')) || {};
    
    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      
      if (!teamData || !teamData.players || !teamData.trackerMsgId || !teamData.discordChannelId) {
        processLogs.push(`⚠️ [SKIP] Tim slug '${slug}': Data tim tidak lengkap atau belum ada channel/tracker.`);
        continue;
      }
      
      let players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      let verifiedCount = 0;
      let rosterText = "";
      
      players.forEach((p: any) => {
        const dbUsername = p.discord?.toLowerCase().trim().replace(/^@/, '') || "";
        const isVerified = !!verifiedMap[dbUsername];
        
        if (isVerified) verifiedCount++;
        const statusIcon = isVerified ? '✅' : '❌';
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const expectedDescription = `**DAFTAR ROSTER:**\n${rosterText}`;

      try {
        const resTracker = await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bot ${botToken}` },
          cache: 'no-store'
        });

        if (!resTracker.ok) {
          processLogs.push(`❌ [ERROR] Tim '${teamData.namaTim}': Gagal membaca pesan dari Discord. HTTP ${resTracker.status}`);
          failedCount++;
          continue;
        }

        const messageData = await resTracker.json();
        const currentDescription = messageData.embeds?.[0]?.description || "";

        if (currentDescription === expectedDescription) {
          processLogs.push(`✅ [AMAN] Tim '${teamData.namaTim}': Data sudah sinkron (${verifiedCount}/${players.length} terverifikasi).`);
          skippedCount++;
          continue;
        }

        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
        const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
        const parsedColor = parseInt(teamData.warna?.replace('#', ''), 16) || 3447003;

        const patchRes = await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            embeds: [{
              title: `🛡️ DATABASE TIM: ${teamData.namaTim.toUpperCase()}`,
              description: expectedDescription,
              color: parsedColor,
              fields: [
                { name: "📌 Role Tim", value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
                { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
              ],
              footer: { text: `Diperbarui pada ${dateFormatter.format(now)} pukul ${timeFormatter.format(now).replace(':', '.')} WIB` }
            }]
          }),
          cache: 'no-store'
        });
        
        if (patchRes.ok) {
          processLogs.push(`🔄 [UPDATE] Tim '${teamData.namaTim}': Tracker berhasil diperbarui ke Discord.`);
          syncedCount++;
        } else {
          processLogs.push(`❌ [ERROR] Tim '${teamData.namaTim}': Gagal melakukan PATCH ke Discord. HTTP ${patchRes.status}`);
          failedCount++;
        }
      } catch (err: any) {
        processLogs.push(`❌ [EXCEPTION] Tim '${teamData.namaTim}': Sistem error - ${err.message}`);
        failedCount++;
      }
    }

    processLogs.push("🏁 Semua proses selesai dieksekusi.");

    return NextResponse.json({ 
      success: true, 
      message: "Proses Sinkronisasi dan Evaluasi Tracker Selesai!",
      statistik: {
        total_member_server: allMembers.length,
        total_duelist_terdeteksi: verifiedMembers.length,
        tracker_diperbarui: syncedCount,
        tracker_sudah_sinkron: skippedCount,
        tracker_gagal_diproses: failedCount
      },
      detail_log: processLogs // 👈 Hasil log terperinci akan muncul di sini
    });
  } catch (error: any) {
    processLogs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: String(error), detail_log: processLogs }, { status: 500 });
  }
          }
