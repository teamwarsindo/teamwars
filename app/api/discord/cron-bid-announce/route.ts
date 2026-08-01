import { NextRequest, NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = DISCORD_CONFIG.CH_BID;
    const adminRoleId = DISCORD_CONFIG.ROLE_ADMIN;

    if (!token || !channelId) {
      return NextResponse.json(
        { success: false, error: 'Missing BOT TOKEN or CH_BID config' },
        { status: 500 }
      );
    }

    // 🔴 MODE TESTING: @everyone di-comment dulu, pakai Tag Admin + Indicator Testing
    // Nanti kalau sudah fix mau live, tinggal ganti jadi:
    // const targetTag = `@everyone <@&${adminRoleId}>`;
    const targetTag = `<@&${adminRoleId}> \`[TESTING - EVERYONE DISABLED]\``;

    const announcementMessage = {
      content: `${targetTag} 📢 **PEMBUKAAN LELANG PENAMAAN DIVISI TWI 2026!**`,
      embeds: [
        {
          title: "🏆 Kesempatan Menamai Divisi Resmi TWI 2026!",
          description:
            "Halo para kapten & tim! Lelang Penamaan Divisi TWI 2026 telah dibuka. Berikan nama terbaik dan paling keren untuk divisimu!",
          color: 0xFEE75C, // Warna Emas/Kuning
          fields: [
            {
              name: "📌 Cara Melakukan Bidding:",
              value: [
                "1️⃣ Buka pesan lelang utama di channel <#" + channelId + ">.",
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
          footer: { text: "Team Wars Indonesia • Auto Notification" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Kirim pesan ke Channel Discord
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
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
      message: '✅ Pengumuman bidding berhasil dikirim ke channel!',
      messageId: data.id
    });

  } catch (error: any) {
    console.error('Error Cron Bid Announce:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
  
