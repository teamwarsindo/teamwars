import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';

// Wajib untuk mematikan cache agar data yang dibaca 100% akurat
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('key');
  if (secret !== 'admin123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pastikan ID Server/Guild Anda ada di env, atau tulis manual (misal: "123456789012345")
  const GUILD_ID = process.env.DISCORD_GUILD_ID; 
  if (!GUILD_ID) return NextResponse.json({ error: 'GUILD_ID tidak ditemukan' }, { status: 500 });

  // 1. Tarik buku catatan cadangan dan kelompokkan berdasarkan tim
  const discordMap = await kv.hgetall('global:discord_map') || {};
  const teamUserIds: Record<string, string[]> = {};
  
  for (const [userId, teamSlug] of Object.entries(discordMap)) {
    const slug = teamSlug as string;
    if (!teamUserIds[slug]) teamUserIds[slug] = [];
    teamUserIds[slug].push(userId);
  }

  const allTeamSlugs = await kv.smembers('global:teams');
  const results = { teamsProcessed: 0, usersRecovered: 0, syncSuccess: 0, failed: 0 };

  for (const slug of allTeamSlugs) {
    try {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      
      // Lewati jika data tidak lengkap
      if (!teamData || !teamData.trackerMsgId || !teamData.discordChannelId || !teamData.players) continue;

      let players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      let isDataChanged = false;

      // --- FASE 1: RECOVERY ---
      const userIdsInTeam = teamUserIds[slug] || [];
      for (const userId of userIdsInTeam) {
        // Cek apakah discordId ini hilang dari array
        const alreadyHasId = players.some((p: any) => p.discordId === userId);
        
        if (!alreadyHasId) {
          // Tarik username asli dari Discord untuk mencocokkan data
          const memberData = await discordAPI(`/guilds/${GUILD_ID}/members/${userId}`, 'GET');
          
          if (memberData && memberData.user) {
            const username = memberData.user.username.toLowerCase();
            const pIdx = players.findIndex((p: any) => p.discord.trim().toLowerCase() === username);
            
            if (pIdx > -1) {
              players[pIdx].discordId = userId; // Tambal data yang hilang
              isDataChanged = true;
              results.usersRecovered++;
            }
          }
          // Jeda 500ms antar user agar tidak kena limit Discord API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Jika ada data yang ditambal, simpan ulang ke Vercel KV sebelum lanjut
      if (isDataChanged) {
        await kv.hset(`teams:${slug}`, { players: JSON.stringify(players) });
        console.log(`🔧 Data dipulihkan untuk tim: ${teamData.namaTim}`);
      }

      // --- FASE 2: SYNC TRACKER ---
      let verifiedCount = 0;
      let rosterText = "";
      
      // Rekap ulang roster menggunakan data players yang sudah 100% akurat
      players.forEach((p: any) => {
        const statusIcon = p.discordId ? '✅' : '❌';
        if (p.discordId) verifiedCount++;
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const decimalColor = teamData.warna ? parseInt(teamData.warna.replace('#', ''), 16) : 11146056;

      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' 
      });
      const timeFormatter = new Intl.DateTimeFormat('id-ID', { 
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' 
      });

      const dateStr = dateFormatter.format(now);
      const timeStr = timeFormatter.format(now).replace(':', '.'); 
      const footerText = `Diperbarui pada ${dateStr} pukul ${timeStr} WIB`;

      const trackerEmbed = {
        title: `🛡️ DATABASE TIM: ${teamData.namaTim.toUpperCase()}`,
        description: `**DAFTAR ROSTER:**\n${rosterText}`,
        color: decimalColor,
        fields: [
          { name: "📌 Role Tim", value: teamData.discordRoleId ? `<@&${teamData.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
          { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
        ],
        footer: { text: footerText }
      };

      // Tembak API Discord untuk Update Embed
      await discordAPI(`/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, 'PATCH', {
        embeds: [trackerEmbed]
      });

      results.syncSuccess++;
      results.teamsProcessed++;
      console.log(`✅ Tracker tersinkronisasi untuk: ${teamData.namaTim}`);

      // Rate Limit Protection untuk Sync Tim
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (e) {
      console.error(`❌ Gagal memproses tim ${slug}:`, e);
      results.failed++;
    }
  }

  return NextResponse.json({ 
    message: "Proses Recovery & Auto-Sync selesai", 
    stats: results 
  });
  }
