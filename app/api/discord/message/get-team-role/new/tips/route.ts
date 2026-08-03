import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 2. KIRIM PESAN BARU (TIPS)
  // ==========================================
  const channelId = "1525775391854428241"; // Pastikan config-nya mengarah ke channel #get-team-role
  
  let tipResult = null;
  
  if (channelId) {
    const tipPayload = {
      content: "💡 **Tip:** Gunakan perintah `/check` di *Private Channel* tim untuk memantau rekan setim yang belum verifikasi."
    };
    tipResult = await discordAPI(`/channels/${channelId}/messages`, 'POST', tipPayload);
  }

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (tipResult) {
    return NextResponse.json({ 
      tip_sent: tipResult ? 'Sukses kirim pesan tips' : 'Gagal kirim pesan'
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal kirim pesan' }, { status: 500 });
  }
}
