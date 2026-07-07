import { NextResponse } from "next/server";

export async function GET() {
  // Pastikan nama ENV ini sesuai dengan yang ada di Vercel lu
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_ADMIN_CHANNEL_ID; // Masukin ID Channel Admin di ENV

  if (!token || !channelId) {
    return NextResponse.json({ error: "Token atau Channel ID belum di-setting bos!" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "Ping! 🏓 Halo Admin, ini tes koneksi tembak langsung dari Next.js pakai KTP Bot."
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Ping berhasil mendarat di Discord!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
