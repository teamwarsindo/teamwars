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
