import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 2. EDIT PESAN LAMA UNTUK UPDATE TOMBOL
  // ==========================================
  const channelId = "1525775391854428241"; // Pastikan config-nya mengarah ke channel #get-team-role
  const messageId = "1525885817149722835"; 
  
  let buttonResult = null;
  
  if (channelId) {
    // A. UPDATE TOMBOL DI PESAN LAMA
    if (messageId) {
      const buttonPayload = {
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label: "Verified",
                style: 1, 
                custom_id: "bt_verified", 
                emoji: { name: "🔒" } 
              },
              {
                type: 2,
                label: "Role Tim",
                style: 3, 
                custom_id: "bt_role", 
                emoji: { name: "🛡️" } 
              }
            ]
          }
        ]
      };
      buttonResult = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'PATCH', buttonPayload);
    }
  }

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (buttonResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan!', 
      buttons_updated: buttonResult ? 'Sukses' : 'Gagal edit pesan',
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal update tombol' }, { status: 500 });
  }
}
