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
  name: 'editplayer',
  description: 'Admin: Edit data roster pemain (IGN, Discord, Duel ID).',
  options: [
    { type: 6, name: 'user', description: 'Tag target user yang mau diedit', required: true },
    { type: 3, name: 'ign', description: 'IGN Baru', required: false },
    { type: 3, name: 'discord', description: 'Username Discord Baru (tanpa @)', required: false },
    { type: 3, name: 'duel_id', description: 'ID Duel Links Baru', required: false }
  ]
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
