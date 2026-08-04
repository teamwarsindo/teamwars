import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export async function POST() {
  try {
    const guildId = DISCORD_CONFIG.GUILD_ID;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID tidak ditemukan' }, { status: 400 });
    }

    // 1. Ambil daftar seluruh channel di server Discord
    const channels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');

    if (!Array.isArray(channels)) {
      return NextResponse.json({ error: 'Gagal mengambil daftar channel Discord' }, { status: 500 });
    }

    // 2. Filter khusus channel sandbox testing (match-test / ⚔️-match-test)
    const testChannels = channels.filter(
      (c: any) => c.name === 'match-test' || c.name === '⚔️-match-test'
    );

    if (testChannels.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada channel match-test yang ditemukan.',
      });
    }

    // 3. Hapus channel test satu per satu dari Discord
    let deletedCount = 0;
    for (const ch of testChannels) {
      await discordAPI(`/channels/${ch.id}`, 'DELETE').catch(() => null);
      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${deletedCount} channel testing di Discord!`,
    });
  } catch (error) {
    console.error('Error delete test channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
      }
