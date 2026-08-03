import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

// 🔥 Tambahkan ini agar Next.js selalu mengeksekusi ulang saat URL diakses
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Pengecekan Client ID sebenarnya opsional di sini karena endpoint channels/messages 
  // menggunakan Bot Token (yang sudah diurus otomatis di dalam fungsi discordAPI), 
  // tapi sebagai pengaman tambahan tidak masalah.
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 2. EDIT PESAN LAMA UNTUK UPDATE TOMBOL
  // ==========================================
  const channelId = "1525775391854428241"; 
  const messageId = "1525885817149722835"; 
  
  let buttonResult = null;
  
  // A. UPDATE TOMBOL DI PESAN LAMA
  if (channelId && messageId) {
    const buttonPayload = {
      components: [
        {
          type: 1, // Wadah (Action Row)
          components: [
            {
              type: 2, // Tombol
              label: "Verified",
              style: 1, // Biru
              custom_id: "bt_verified", // 👈 Pastikan sama persis dengan yang di-handle
              emoji: { name: "🔒" } 
            },
            {
              type: 2, // Tombol
              label: "Role Tim",
              style: 3, // Hijau
              custom_id: "bt_role", // 👈 Pastikan sama persis dengan yang di-handle
              emoji: { name: "🛡️" } 
            }
          ]
        }
      ]
    };
    buttonResult = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'PATCH', buttonPayload);
  }

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (buttonResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan! Tombol berhasil diperbarui.', 
      buttons_updated: 'Sukses',
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal update tombol' }, { status: 500 });
  }
}
