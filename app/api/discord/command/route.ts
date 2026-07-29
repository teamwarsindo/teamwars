import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 1. REGISTER SLASH COMMANDS (Overwrite)
  // ==========================================
  const commands = [
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },
    {
      name: 'prepare',
      description: 'Kirim briefing in-game dan info Room ID di channel match.',
    },
    {
      name: 'info',
      description: 'Lihat informasi profil Discord kamu atau pemain lain',
      options: [
        {
          type: 6, // Type 6 adalah USER
          name: 'target',
          description: 'Pilih user yang ingin dilihat infonya (kosongkan untuk diri sendiri)',
          required: false,
        }
      ]
    },
    // 👇 COMMAND TIMER BARU 👇
    {
      name: 'timer',
      description: 'Tampilkan Panel Timer Kontrol Waktu Match TWI S7',
    },
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (slashResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan!', 
      commands: slashResult
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
}
