import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils'; // Sesuaikan path jika perlu

export async function GET(request: NextRequest) {
  // Opsional: Tambahkan proteksi agar tidak diakses sembarang orang
  const secret = request.nextUrl.searchParams.get('key');
  if (secret !== 'admin123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allTeamSlugs = await kv.smembers('global:teams');
  const results = { success: 0, failed: 0 };

  for (const slug of allTeamSlugs) {
    try {
      const teamData: any = await kv.hgetall(`teams:${slug}`);
      
      // Lewati jika data tidak lengkap (legacy tim yang tidak punya tracker)
      if (!teamData || !teamData.trackerMsgId || !teamData.discordChannelId) continue;

      const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
      
      let verifiedCount = 0;
      let rosterText = "";
      
      // Rekap ulang roster dan status verifikasi
      players.forEach((p: any) => {
        const statusIcon = p.discordId ? '✅' : '❌';
        if (p.discordId) verifiedCount++;
        
        // Memakai text biasa dengan backtick agar rapi, tanpa tag mention <@ID>
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const decimalColor = teamData.warna ? parseInt(teamData.warna.replace('#', ''), 16) : 11146056;

      // Konfigurasi format Waktu dan Tanggal (Contoh: 17 Juli 2026 pukul 20.20 WIB)
      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' 
      });
      const timeFormatter = new Intl.DateTimeFormat('id-ID', { 
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' 
      });

      const dateStr = dateFormatter.format(now);
      const timeStr = timeFormatter.format(now).replace(':', '.'); // Ubah 20:20 jadi 20.20
      
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

      // Tembak API Discord
      await discordAPI(`/channels/${teamData.discordChannelId}/messages/${teamData.trackerMsgId}`, 'PATCH', {
        embeds: [trackerEmbed]
      });

      results.success++;
      console.log(`✅ Success updated tracker for: ${teamData.namaTim}`);

      // Rate Limit Protection: Jeda 1 detik setiap perulangan
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (e) {
      console.error(`❌ Failed update tracker for ${slug}:`, e);
      results.failed++;
    }
  }

  return NextResponse.json({ 
    message: "Proses update tracker legacy selesai", 
    stats: results 
  });
      }
