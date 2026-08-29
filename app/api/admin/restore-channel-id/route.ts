import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMatchId = searchParams.get('matchId'); // Opsional: jika ingin 1 match saja (contoh: match-1)

    const guildId = DISCORD_CONFIG.GUILD_ID;
    const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

    if (!guildId) {
      return NextResponse.json({ error: 'DISCORD_GUILD_ID tidak ditemukan' }, { status: 500 });
    }

    // 1. Tarik seluruh channel dari server Discord
    const allChannels: any[] = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
    if (!Array.isArray(allChannels)) {
      return NextResponse.json({ error: 'Gagal membaca channel dari Discord API' }, { status: 500 });
    }

    // 2. Ambil data schedules dari Vercel KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data match di database twi:schedules' }, { status: 404 });
    }

    const restoredList: any[] = [];

    // 3. Cocokkan ID Channel murni berdasarkan pattern nama channel (-m{nomor}-)
    schedules.forEach((match) => {
      // Jika ada targetMatchId spesifik, lewati match yang tidak cocok
      if (targetMatchId && match.id !== targetMatchId) return;

      const cleanMatchNum = match.id.replace('match-', '');
      const pattern = `-m${cleanMatchNum}-`;

      const foundChannel = allChannels.find((ch) => {
        const isMatchCategory = parentCategoryId ? ch.parent_id === parentCategoryId : true;
        return isMatchCategory && ch.type === 0 && ch.name.includes(pattern);
      });

      if (foundChannel) {
        match.discordChannelId = foundChannel.id;
        restoredList.push({
          matchId: match.id,
          teams: `${match.teamAName} vs ${match.teamBName}`,
          channelName: foundChannel.name,
          discordChannelId: foundChannel.id,
        });
      }
    });

    if (restoredList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada channel Discord yang cocok ditemukan.',
      });
    }

    // 4. Simpan kembali ke KV (hanya memperbarui kolom discordChannelId)
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `✅ Berhasil memulihkan ${restoredList.length} discordChannelId tanpa trigger action lain!`,
      restoredCount: restoredList.length,
      data: restoredList,
    });
  } catch (error: any) {
    console.error('Error restore channel ID:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
      }
