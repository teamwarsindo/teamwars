import { NextResponse } from 'next/server';
// Pastikan import DISCORD_CONFIG dari tempat lu menyimpannya
import { DISCORD_CONFIG } from '@/lib/config';

// ==========================================
// HANDLER: /prepare
// ==========================================
export async function handlePrepare(body: any) {
  const memberRoles = body.member?.roles || [];
  const channelId = body.channel_id;

  // 1. CEK ROLE (Admin atau Referee)
  const hasAccess = memberRoles.includes(DISCORD_CONFIG.ROLE_ADMIN) || memberRoles.includes(DISCORD_CONFIG.ROLE_REFEREE);
  
  if (!hasAccess) {
    return NextResponse.json({ 
      type: 4, 
      data: { 
        content: `⛔ **Akses Ditolak!** Hanya Referee yang dapat menggunakan perintah \`/prepare\`.`, 
        flags: 64 
      } 
    });
  }

  // 2. CEK CHANNEL (Fase Testing = Hanya Channel Referee)
  // Nanti saat produksi, ganti logika ini ke: body.channel?.parent_id !== DISCORD_CONFIG.CT_MATCH_ID
  if (channelId !== DISCORD_CONFIG.CH_REFEREE) {
    return NextResponse.json({ 
      type: 4, 
      data: { 
        content: `❌ **Channel Salah!** Perintah \`/prepare\` hanya dapat digunakan di private channel Match.`, 
        flags: 64 
      } 
    });
  }

  // 3. LOLOS CEK -> TAMPILKAN PESAN PERBAIKAN
  return NextResponse.json({ 
    type: 4, 
    data: { 
      content: `🚧 Fitur \`/prepare\` sedang dalam tahap pengembangan dan sinkronisasi Room ID. Harap bersabar ya!`, 
      flags: 64 
    } 
  });
}
