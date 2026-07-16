import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 1. REGISTER SLASH COMMANDS (Overwrite)
  // ==========================================
  const commands = [
    {
      name: 'check',
      description: 'Menampilkan daftar roster, status verifikasi, dan kesiapan tim',
    },
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },
    {
      name: 'prepare',
      description: 'Kirim briefing in-game dan info Room ID di channel match.',
    }
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  // ==========================================
  // 2. EDIT PESAN LAMA UNTUK UPDATE TOMBOL
  // ==========================================
  const channelId = "1525775391854428241"; // Pastikan config-nya mengarah ke channel #get-team-role
  const messageId = "1525885817149722835"; 
  
  let buttonResult = null;
  
  if (channelId && messageId) {
    // Kita HANYA mengirim komponen tombol. Teks dan Embed lama akan 100% aman!
    const buttonPayload = {
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: "Verified",
              style: 1, // Warna Biru (Blurple)
              custom_id: "bt_verified", // ID Baru!
              emoji: { name: "🔒" } // Sesuai gambar
            },
            {
              type: 2,
              label: "Role Tim",
              style: 3, // Warna Hijau (Success)
              custom_id: "bt_role", // ID Baru!
              emoji: { name: "🛡️" } // Sesuai gambar
            }
          ]
        }
      ]
    };

    buttonResult = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'PATCH', buttonPayload);
  }

  // ==========================================
  // 3. KEMBALIKAN RESPON
  // ==========================================
  if (slashResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan!', 
      commands: slashResult,
      buttons_deployed: buttonResult ? 'Pesan berhasil diedit dengan ID tombol baru' : 'Gagal mengedit tombol'
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
}
