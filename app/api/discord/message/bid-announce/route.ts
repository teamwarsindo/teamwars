import { NextRequest, NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    // Kirim ke Channel News / Pengumuman Umum
    const newsChannelId = DISCORD_CONFIG.CH_NEWS; 
    // ID Channel Tempat Lelang (untuk diarahkan di deskripsi)
    const bidChannelId = DISCORD_CONFIG.CH_BID; 

    if (!token || !newsChannelId) {
      return NextResponse.json(
        { success: false, error: 'Missing BOT TOKEN or CH_NEWS config' },
        { status: 500 }
      );
    }

    // 🟢 Tag Everyone untuk Publik / Seluruh Member Server
    const targetTag = "@everyone";

    const announcementMessage = {
      content: `${targetTag} 📢 **PEMBUKAAN LELANG PENAMAAN DIVISI TWI 2026!**`,
      embeds: [
        {
          title: "🏆 Kesempatan Menamai Divisi Resmi TWI 2026!",
          description:
            "Halo semuanya! Lelang Penamaan Divisi TWI 2026 resmi dibuka untuk umum. Siapa saja berhak memberikan nama terbaik dan paling keren untuk divisi turnamen kita!",
          color: 0xFEE75C, // Warna Emas/Kuning
          fields: [
            {
              name: "📌 Cara Melakukan Bidding:",
              value: [
                "1️⃣ Buka channel lelang utama di <#" + bidChannelId + ">.",
                "2️⃣ Klik tombol **`[ Bid Group A ]`** atau **`[ Bid Group B ]`**.",
                "3️⃣ Isi **Nama Divisi Pilihan** dan **Nominal Bid** pada form modal yang muncul.",
                "4️⃣ Klik **Submit** dan nominal bid kamu akan langsung ter-update secara otomatis!"
              ].join("\n"),
              inline: false
            },
            {
              name: "⚙️ Ketentuan Singkat:",
              value: [
                "• **Minimal Bid Awal:** Rp 100.000 (Bid pertama min. Rp 110.000)",
                "• **Kelipatan Bid:** Rp 10.000",
                "• **Batas Waktu Bidding:** 8 Agustus 2026, Pukul 20:00 WIB"
              ].join("\n"),
              inline: false
            }
          ],
          footer: { text: "Team Wars Indonesia • Official Announcement" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Kirim pesan ke Channel News Discord
    const res = await fetch(`https://discord.com/api/v10/channels/${newsChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcementMessage)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gagal kirim pengumuman bidding:", data);
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      message: '✅ Pengumuman bidding berhasil dikirim ke channel news!',
      messageId: data.id
    });

  } catch (error: any) {
    console.error('Error Single Bid Announce:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
