import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function GET() {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      return NextResponse.json({ error: "Missing Discord Credentials di .env" }, { status: 500 });
    }

    // ==========================================================
    // 1. REVERSE-SYNC DARI DISCORD KE DATABASE
    // ==========================================================
    // Catatan: Pastikan 'Server Members Intent' di Discord Developer Portal bot kamu menyala.
    const resMembers = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      method: 'GET',
      headers: { 'Authorization': `Bot ${botToken}` }
    });

    if (!resMembers.ok) {
      return NextResponse.json({ error: `Gagal fetch member Discord: ${await resMembers.text()}` }, { status: 500 });
    }

    const members = await resMembers.json();
    
    // Filter member yang memiliki role Duelist
    const duelistRoleId = DISCORD_CONFIG.ROLE_DUELIST;
    const verifiedMembers = members.filter((m: any) => m.roles.includes(duelistRoleId));

    // Siapkan object untuk dimasukkan ke Redis
    const updatedVerifiedUsers: Record<string, string> = {};
    verifiedMembers.forEach((m: any) => {
      // API Discord menempatkan username di dalam objek `user`
      const username = m.user.username.toLowerCase();
      updatedVerifiedUsers[username] = m.user.id;
    });

    // Timpa atau perbarui database global:verified_users
    if (Object.keys(updatedVerifiedUsers).length > 0) {
      await kv.hset('global:verified_users', updatedVerifiedUsers);
    }

    // ==========================================================
    // 2. SINKRONISASI TRACKER TIM BERDASARKAN DATA TERBARU
    // ==========================================================
    const allTeamSlugs = await kv.smembers('global:teams');
    const verifiedMap = (await kv.hgetall('global:verified_users')) || {};
    
    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const slug of allTeamSlugs) {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      
      // Lewati jika tim belum punya Tracker atau Channel
      if (!teamData || !teamData.players || !teamData.trackerMsgId || !teamData.discordChannelId) continue;
      
      let players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;

      let verifiedCount = 0;
      let rosterText = "";
      
      // Susun ulang bentuk teks roster seharusnya
      players.forEach((p: any) => {
        const isVerified = !!verifiedMap[p.discord.toLowerCase()];
        if (isVerified) verifiedCount++;
        const statusIcon = isVerified ? '✅' : '❌';
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const expectedDescription = `**DAFTAR ROSTER:**\n${rosterText}`;

      try {
        // Intip isi pesan Tracker saat ini di Discord
        const resTracker = await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bot ${botToken}` }
        });

        if (!resTracker.ok) {
          failedCount++;
          continue;
        }

        const messageData = await resTracker.json();
        const currentEmbed = messageData.embeds?.[0];
        const currentDescription = currentEmbed?.description || "";

        // Pengecekan Cerdas: Jika teks roster di Discord sudah SAMA, SKIP!
        if (currentDescription === expectedDescription) {
          skippedCount++;
          continue;
        }

        // Jika BEDA (ada member yg terverifikasi tapi tracker-nya belum ✅), tembak PATCH
        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
        const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
        const parsedColor = parseInt(teamData.warna?.replace('#', ''), 16) || 3447003;

        await fetch(`https://discord.com/api/v10/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, {
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
          })
        });
        
        syncedCount++;
      } catch (err) {
        console.error(`❌ Error saat sync tracker tim ${teamData.namaTim}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Proses Sinkronisasi Selesai!",
      statistik: {
        total_member_terdeteksi_di_discord: verifiedMembers.length,
        total_tim_diperbarui_trackernya: syncedCount,
        dilewati_karena_sudah_sinkron: skippedCount,
        gagal_diproses: failedCount
      }
    });
  } catch (error: any) {
    console.error("Critical Sync Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
      }
          
