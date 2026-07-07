import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  // Pastikan ID ini adalah ID channel publik (bukan channel admin)
  const channelId = process.env.DISCORD_ADMIN_CHANNEL_ID; 

  if (!token || !channelId) {
    return NextResponse.json({ error: "Token atau Channel ID Pengumuman belum disetting!" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Format <@&RoleID> ini cara kerja Discord buat nge-ping Role tertentu
        content: "📢 <@&1144271761488216134> **PERHATIAN SELURUH TIM!**", 
        embeds: [
          {
            title: "🔥 PENDAFTARAN TWI SEASON 7 RESMI DIBUKA! 🔥",
            description: "Waktu tunggu telah usai! Gerbang pendaftaran Team Wars Indonesia Season 7 resmi dibuka hari ini pukul **17:00 WIB**. Siapkan roster terbaik kalian dan amankan slot sekarang!",
            color: 15844367, // Warna Hex #F1C40F (Kuning Keemasan)
            fields: [
              {
                name: "💰 Biaya Pendaftaran",
                value: "**Rp 250.000 / Tim**",
                inline: false
              },
              {
                name: "📋 Persyaratan Pendaftaran",
                value: "1. Satu tim terdiri dari maksimal **10 Pemain**.\n2. Seluruh pemain wajib memiliki ID Duel Links, IGN, dan akun Discord yang valid.\n3. Perwakilan tim wajib menyiapkan **Logo Tim** (resolusi baik).\n4. Wajib melampirkan **Bukti Transfer** pembayaran yang sah.",
                inline: false
              },
              {
                name: "🔗 Link Registrasi",
                value: "Langsung meluncur ke website resmi: **[teamwars.web.id](https://teamwars.web.id)**",
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

    return NextResponse.json({ success: true, message: "Pengumuman hype berhasil disebar!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
