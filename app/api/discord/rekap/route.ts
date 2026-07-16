import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';

export async function GET() {
  try {
    // 1. Ambil data semua tim secara paralel
    const allTeamSlugs = await kv.smembers('global:teams');
    const allTeamsData = await Promise.all(
      allTeamSlugs.map(async (slug) => {
        const data = await kv.hgetall(`teams:${slug}`);
        return { slug, ...data };
      })
    );

    // Urutkan dari yang paling awal daftar (Oldest to Newest)
    allTeamsData.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 2. Susun teks rekapan
    let rekapText = "";
    let totalApproved = 0;
    let totalPending = 0;

    allTeamsData.forEach((team: any, index: number) => {
      // Hitung jumlah roster
      const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);
      const totalRoster = players.length;

      // 🎯 UPDATE: Menggunakan field StatusVerifikasi dari database
      const isApproved = team.StatusVerifikasi === 'Approved';
      
      if (isApproved) totalApproved++;
      else totalPending++;

      const statusIcon = isApproved ? "✅ APPROVED" : "🟡 PENDING";
      
      // Format Waktu Daftar
      const tglDaftar = team.createdAt 
        ? new Date(team.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) 
        : "-";

      // Susun ke dalam list
      rekapText += `**${index + 1}. ${team.namaTim?.toUpperCase()}**\n`;
      rekapText += `👥 ${totalRoster} Pemain | 💰 ${statusIcon} | 📅 ${tglDaftar}\n\n`;
    });

    if (!rekapText) rekapText = "Belum ada tim yang terdaftar di database.";

    // 3. Bungkus dalam Embed yang Rapi
    const channelTarget = "1170909631049121872";
    const payload = {
      embeds: [{
        title: "📊 REKAPITULASI PENDAFTARAN TIM",
        description: rekapText,
        color: 3447003, // Warna Biru
        fields: [
          { name: "Total Tim", value: `**${allTeamsData.length}** Tim`, inline: true },
          { name: "✅ Approved", value: `**${totalApproved}** Tim`, inline: true },
          { name: "🟡 Pending", value: `**${totalPending}** Tim`, inline: true }
        ],
        footer: { text: "Data ditarik secara real-time dari Database" },
        timestamp: new Date().toISOString()
      }]
    };

    // 4. Kirim menggunakan helper API discord
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
