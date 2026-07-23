import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { userAgent } from 'next/server';
// Sesuaikan path import ini dengan letak file utils dan config Discord lu!
import { discordAPI } from '@/lib/discord/utils'; 
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

// Helper Cepat Kirim Embed ke Discord via API lu sendiri
async function sendDiscordLog(embed: any) {
  try {
    // Asumsi CH_LOGS adalah nama variabel channel log di config lu
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [embed]
    });
  } catch (err) {
    console.error('Gagal kirim log admin ke discord', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUser = process.env.BASIC_AUTH_USER;
    const validPwd = process.env.BASIC_AUTH_PWD;

    // Ekstrak Data User
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
    
    const { browser, device, os } = userAgent(request);
    const deviceType = device.type === 'mobile' ? 'HP' : device.type === 'tablet' ? 'Tablet' : 'PC/Laptop';
    const browserName = browser.name || 'Unknown Browser';
    const osName = os.name || 'Unknown OS';
    
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

    if (!validUser || !validPwd) {
      return NextResponse.json({ error: 'Kredensial server (ENV) belum diatur' }, { status: 500 });
    }

    // --- 1. JIKA LOGIN BERHASIL ---
    if (username === validUser && password === validPwd) {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 Jam
      });

      // Simpan di Redis KV
      const logSuccess = `[SUKSES] ${timestamp} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType} (${osName}) | Browser: ${browserName}`;
      await kv.lpush('admin:login_logs', logSuccess);
      await kv.ltrim('admin:login_logs', 0, 99);

      // Kirim Notif Discord (Embed Hijau) pakai fungsi lu
      await sendDiscordLog({
        title: "✅ Admin Login Berhasil",
        color: 0x22c55e, // Hijau
        fields: [
          { name: "👤 User", value: `**${username}**`, inline: true },
          { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
          { name: "🌐 Browser", value: browserName, inline: true },
          { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
          { name: "📡 IP Asli", value: `||${ip}||`, inline: true }, // IP disensor spoiler
        ],
        footer: { text: "TWI Security System" },
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ success: true });
    }

    // --- 2. JIKA LOGIN GAGAL (ADA PENYUSUP) ---
    const logFailed = `[GAGAL] ${timestamp} | Coba User: ${username} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType}`;
    await kv.lpush('admin:login_logs', logFailed);
    await kv.ltrim('admin:login_logs', 0, 99);

    // Kirim Notif Discord (Embed Merah) pakai fungsi lu
    await sendDiscordLog({
      title: "🚨 Peringatan: Percobaan Login Gagal!",
      description: "Seseorang mencoba mengakses panel Admin Dashboard.",
      color: 0xef4444, // Merah
      fields: [
        { name: "🕵️‍♂️ Username Dicoba", value: `\`${username}\``, inline: true },
        { name: "🔑 Password Dicoba", value: `\`${password}\``, inline: true },
        { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
        { name: "🌐 Browser", value: browserName, inline: true },
        { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
        { name: "📡 IP Address", value: `||${ip}||`, inline: true }
      ],
      footer: { text: "TWI Security System - Potensi Brute Force" },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return NextResponse.json({ success: true });
}
