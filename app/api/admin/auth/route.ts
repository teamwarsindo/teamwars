import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { userAgent } from 'next/server';
import { discordAPI } from '@/lib/discord/utils'; 
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

// Helper Kirim Embed ke Channel Log Discord
async function sendDiscordLog(embed: any) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [embed]
    });
  } catch (err) {
    console.error('Gagal kirim log admin ke discord:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUser = process.env.BASIC_AUTH_USER;
    const validPwd = process.env.BASIC_AUTH_PWD;

    if (!validUser || !validPwd) {
      return NextResponse.json({ error: 'Kredensial server (ENV) belum diatur' }, { status: 500 });
    }

    // Ekstrak Data Client untuk Logging
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
    
    const { browser, device, os } = userAgent(request);
    const deviceType = device.type === 'mobile' ? 'HP' : device.type === 'tablet' ? 'Tablet' : 'PC/Laptop';
    const browserName = browser.name || 'Unknown Browser';
    const osName = os.name || 'Unknown OS';
    
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

    // Paksa Username menjadi Lowercase
    const inputUser = username ? username.toLowerCase().trim() : '';
    const expectedUser = validUser.toLowerCase().trim();

    const isUserCorrect = inputUser === expectedUser;
    const isPwdCorrect = password === validPwd;

    // --- 1. JIKA LOGIN BERHASIL ---
    if (isUserCorrect && isPwdCorrect) {
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 Jam
      });

      // Simpan Log Sukses di Redis KV
      const logSuccess = `[SUKSES] ${timestamp} | User: ${inputUser} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType} (${osName})`;
      await kv.lpush('admin:login_logs', logSuccess);
      await kv.ltrim('admin:login_logs', 0, 99);

      // Kirim Notif Discord (Embed Hijau)
      await sendDiscordLog({
        title: "✅ Admin Login Berhasil",
        color: 0x22c55e, // Hijau
        fields: [
          { name: "👤 User", value: `**${inputUser}**`, inline: true },
          { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
          { name: "🌐 Browser", value: browserName, inline: true },
          { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
          { name: "📡 IP Asli", value: `||${ip}||`, inline: true }
        ],
        footer: { text: "TWI Security System" },
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({ success: true });
    }

    // --- 2. JIKA LOGIN GAGAL ---
    let errorMessage = 'Username dan password salah';
    if (isUserCorrect && !isPwdCorrect) {
      errorMessage = 'Password salah';
    } else if (!isUserCorrect && isPwdCorrect) {
      errorMessage = 'Username salah';
    }

    // Simpan Log Gagal di Redis KV
    const logFailed = `[GAGAL - ${errorMessage.toUpperCase()}] ${timestamp} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType}`;
    await kv.lpush('admin:login_logs', logFailed);
    await kv.ltrim('admin:login_logs', 0, 99);

    // Susun Fields Discord: BAGIAN YANG BENAR TIDAK DICANTUMKAN!
    const failedFields = [];

    // Hanya tampilkan Username Dicoba jika Username-nya SALAH
    if (!isUserCorrect) {
      failedFields.push({ name: "🕵️‍♂️ Username Dicoba", value: `\`${inputUser || '-'}\``, inline: true });
    }

    // Hanya tampilkan Password Dicoba jika Password-nya SALAH
    if (!isPwdCorrect) {
      failedFields.push({ name: "🔑 Password Dicoba", value: `\`${password || '-'}\``, inline: true });
    }

    // Tambahkan Info Perangkat & Jaringan
    failedFields.push(
      { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
      { name: "🌐 Browser", value: browserName, inline: true },
      { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
      { name: "📡 IP Address", value: `||${ip}||`, inline: true }
    );

    // Kirim Notif Discord (Embed Merah)
    await sendDiscordLog({
      title: "🚨 Peringatan: Percobaan Login Gagal!",
      description: `Seseorang mencoba mengakses panel Admin Dashboard.\n**Status Kegagalan:** \`${errorMessage}\``,
      color: 0xef4444, // Merah
      fields: failedFields,
      footer: { text: "TWI Security System - Audit Log" },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error Auth API:', error);
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
        
