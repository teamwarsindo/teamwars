import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';
import { ALL_SLASH_COMMANDS } from '@/lib/discord/definitions';

export async function GET() {
  const appId = process.env.DISCORD_CLIENT_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'Missing Client ID in Environment Variables' },
      { status: 500 }
    );
  }

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', ALL_SLASH_COMMANDS);

  if (slashResult && !slashResult.error) {
    return NextResponse.json({
      message: `✅ Berhasil sinkronisasi ${ALL_SLASH_COMMANDS.length} Slash Commands!`,
      commands: slashResult,
    });
  }

  return NextResponse.json(
    {
      error: '❌ Gagal mendaftarkan commands',
      details: slashResult || 'Discord API mengembalikan null.',
    },
    { status: 500 }
  );
}
