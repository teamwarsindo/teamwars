import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

function extractMatchIdFromChannelName(channelName: string): string | null {
  // 1. Bersihkan emoji (seperti ⚔️ atau ⚔) dan karakter non-alfanumerik di awal nama channel
  const cleanedName = channelName
    .replace(/^[^a-zA-Z0-9]+/, '')
    .trim()
    .toLowerCase();

  // 2. Deteksi format Playoff (misal: mpo-5 dari ⚔-mpo-5-blr-dso)
  const playoffMatch = cleanedName.match(/^(mpo-\d+)/i);
  if (playoffMatch) {
    return playoffMatch[1].toLowerCase();
  }

  // 3. Deteksi format Play-Ins (misal: mpi-1)
  const playInsMatch = cleanedName.match(/^(mpi-\d+)/i);
  if (playInsMatch) {
    return playInsMatch[1].toLowerCase();
  }

  // 4. Deteksi format Regular Match dengan prefix match- (misal: match-12)
  const fullMatch = cleanedName.match(/^(match-\d+)/i);
  if (fullMatch) {
    return fullMatch[1].toLowerCase();
  }

  // 5. Deteksi format Regular Match yang disingkat menjadi m{angka} (misal: m12 dari ⚔️-m12-tma-tmb)
  const shortMatch = cleanedName.match(/^m(\d+)/i);
  if (shortMatch) {
    return `match-${shortMatch[1]}`.toLowerCase();
  }

  return null;
}

export async function GET() {
  try {
    const guildId = DISCORD_CONFIG.GUILD_ID;
    if (!guildId) {
      return NextResponse.json({
        success: false,
        message: 'DISCORD_GUILD_ID tidak dikonfigurasi di environment.',
      }, { status: 500 });
    }

    // Ambil seluruh daftar channel Discord pada server
    const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
    if (!Array.isArray(allGuildChannels)) {
      return NextResponse.json({
        success: false,
        message: 'Gagal mengambil daftar channel dari Discord API.',
      }, { status: 502 });
    }

    // Ambil data schedules dari KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada data jadwal pertandingan ditemukan di KV (twi:schedules).',
      }, { status: 404 });
    }

    let updatedCount = 0;
    const syncedList: Array<{
      matchId: string;
      channelId: string;
      channelName: string;
      matchName: string;
    }> = [];

    // Lakukan mapping channel Discord berdasarkan ID match yang diekstrak
    for (const channel of allGuildChannels) {
      if (channel.type !== 0) continue; // Hanya periksa Guild Text Channel

      const extractedId = extractMatchIdFromChannelName(channel.name);
      if (!extractedId) continue;

      const scheduleIndex = schedules.findIndex((s) => {
        const rawId = String(s.id).toLowerCase();
        return (
          rawId === extractedId ||
          rawId.replace('match-', 'm') === extractedId ||
          rawId === extractedId.replace('match-', '')
        );
      });

      if (scheduleIndex !== -1) {
        const currentMatch = schedules[scheduleIndex];
        const oldChannelId = (currentMatch as any).discordChannelId;

        if (oldChannelId !== channel.id) {
          (currentMatch as any).discordChannelId = channel.id;
          schedules[scheduleIndex] = currentMatch;
          updatedCount++;
        }

        syncedList.push({
          matchId: currentMatch.id,
          channelId: channel.id,
          channelName: channel.name,
          matchName: `${currentMatch.teamAName} vs ${currentMatch.teamBName}`,
        });
      }
    }

    // Simpan data kembali ke KV jika ada pembaruan
    if (updatedCount > 0) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai. Sebanyak ${updatedCount} channel didaftarkan/diperbarui dari ${syncedList.length} channel aktif yang terdeteksi.`,
      totalSynced: syncedList.length,
      updatedCount,
      matches: syncedList,
    });
  } catch (error: any) {
    console.error('[SYNC MATCH CHANNELS ERROR]:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan server saat sinkronisasi channel match.',
    }, { status: 500 });
  }
}
