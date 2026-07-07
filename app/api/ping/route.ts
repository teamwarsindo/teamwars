import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  // GANTI DENGAN ID CHANNEL PUBLIK TEMPAT PESAN YANG MAU DI-REPLY BERADA
  // Kalau lu udah bikin ENV baru, panggil di sini. Kalau belum, langsung ketik angkanya aja sebagai fallback string "ANGKA_ID"
  const channelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID || process.env.DISCORD_ADMIN_CHANNEL_ID; 

  if (!token || !channelId) {
    return NextResponse.json({ error: "Token atau Channel ID belum disetting!" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Salam duelist @everyone, Menindaklanjuti pesan <@&603379909661818920> kemaren, hari ini tepatnya pukul 17.44 WIB pendaftaran Team Wars Indonesia Season 7 resmi dibuka. Siapkan persyaratan sebelum melakukan pendaftaran.",
        message_reference: {
          message_id: "1523640776028979230"
        },
        embeds: [
          {
            title: "🔥 PENDAFTARAN TWI SEASON 7 RESMI DIBUKA! 🔥",
            color: 15844367, // Warna Kuning Keemasan
            fields: [
              {
                name: "💰 Biaya Pendaftaran",
                value: "**Rp 250.000 / Tim**",
                inline: false
              },
              {
                name: "📋 Syarat Tim",
                value: "• Nama Tim\n• Warna Identitas (Hex Color)\n• Logo Tim\n• Bukti Transfer",
                inline: true
              },
              {
                name: "👤 Syarat Pemain",
                value: "• Nama Lengkap\n• Username Discord\n• IGN\n• ID Duel Links",
                inline: true
              },
              {
                name: "👥 Ketentuan Roster",
                value: "Satu tim berisi **5 - 10 Pemain** (Sudah termasuk kewajiban memiliki 1 Ketua dan 1 Wakil Ketua).",
                inline: false
              },
              {
                name: "🔗 Link Registrasi",
                value: "Langsung meluncur ke: **[teamwars.web.id](https://teamwars.web.id)**",
                inline: false
              }
            ],
            image: {
              url: "https://cdn.discordapp.com/attachments/835776824931909652/1523982103560192050/WhatsApp_Image_2026-07-05_at_11.52.41.jpeg?ex=6a4e166f&is=6a4cc4ef&hm=a62d27f1fed2526e449761b3ac95ac1f731aafb28c1fda94f3209b3c5292d2f4"
            },
            footer: {
              text: "Sistem Registrasi TWI Season 7"
            },
            timestamp: new Date().toISOString()
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Pengumuman berhasil disebar dari API Ping!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
