import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';

export async function GET() {
  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    const allTeamsData = await Promise.all(
      allTeamSlugs.map(async (slug) => {
        const data = await kv.hgetall(`teams:${slug}`);
        return { slug, ...data };
      })
    );

    // Pastikan key untuk sorting sesuai (createdAt atau timestamp)
    allTeamsData.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let rekapText = "";
    let totalApproved = 0;
    let totalPending = 0;

    allTeamsData.forEach((team: any, index: number) => {
      const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);
      const totalRoster = players.length;

      const statusDB = (team.statusVerifikasi || '').toLowerCase();
      const isApproved = statusDB === 'approved';
      
      if (isApproved) totalApproved++;
      else totalPending++;

      const statusIcon = isApproved ? "✅ Approved" : "🟡 Pending";
      
      let tglDaftar = "-";
      // Cek apakah key-nya createdAt. Kalau di database kamu beda (misal 'timestamp'), ganti tulisan createdAt di bawah ini
      if (team.createdAt) {
         const dateObj = new Date(team.createdAt);
         tglDaftar = dateObj.toLocaleString('id-ID', { 
           timeZone: 'Asia/Jakarta', // 🎯 KUNCI: Paksa jam ke Waktu Indonesia Barat (WIB)
           day: '2-digit', 
           month: 'short',
           hour: '2-digit',
           minute: '2-digit'
         }).replace(/\./g, ':') + ' WIB'; // Tambahan teks WIB biar lebih jelas
      }

      rekapText += `**${index + 1}. ${team.namaTim?.toUpperCase()}**\n`;
      rekapText += `👥 ${totalRoster} Pemain\n`;
      rekapText += `💰 ${statusIcon}\n`;
      rekapText += `🗓️ ${tglDaftar}\n\n`;
    });

    if (!rekapText) rekapText = "Belum ada tim yang terdaftar di database.";

    const channelTarget = "1170909631049121872";
    const payload = {
      embeds: [{
        title: "📊 REKAPITULASI PENDAFTARAN TIM",
        description: rekapText,
        color: 3447003, 
        fields: [
          { 
            name: "📈 Ringkasan Status Pendaftaran", 
            value: `**${allTeamsData.length}** Total Tim  |  ✅ **${totalApproved}** Approved  |  🟡 **${totalPending}** Pending`, 
            inline: false 
          }
        ],
        footer: { text: "Data ditarik secara real-time dari Database TWI" },
        timestamp: new Date().toISOString()
      }]
    };

    const result = await discordAPI(`/channels/${channelTarget}/messages`, 'POST', payload);

    if (result) {
      return NextResponse.json({ 
        message: "✅ Rekapan berhasil dikirim ke channel Discord!",
        total_tim: allTeamsData.length
      });
    } else {
      return NextResponse.json({ error: "❌ Gagal mengirim ke Discord" }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error rekap data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
