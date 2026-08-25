import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { backupDiscordChannelMessages } from '@/lib/discord/backup';
import { deleteMatchDiscordChannel } from '@/lib/discord/channels';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      return NextResponse.json({ schedules });
    }

    const cachedData: any = await kv.get(`twi:match_logs:${matchId}`);
    
    if (Array.isArray(cachedData)) {
      return NextResponse.json({ matchId, channelName: `⚔️-${matchId}`, logs: cachedData });
    }

    return NextResponse.json({
      matchId,
      channelName: cachedData?.channelName || `⚔️-${matchId}`,
      logs: cachedData?.logs || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, channelId, week } = body;

    if (!matchId || !channelId) {
      return NextResponse.json({ error: 'matchId dan channelId wajib disertakan' }, { status: 400 });
    }

    const { channelName, messages } = await backupDiscordChannelMessages({
      matchId,
      channelId,
      week: Number(week) || 1,
    });

    const payload = { channelName, logs: messages };
    await kv.set(`twi:match_logs:${matchId}`, payload);

    return NextResponse.json({
      success: true,
      message: `Berhasil mencadangkan ${messages.length} pesan.`,
      channelName,
      count: messages.length,
      logs: messages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, channelId, refereeDiscordId, roleAId, roleBId } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId wajib disertakan' }, { status: 400 });
    }

    // 1. Hapus channel Discord & cabut role wasit
    await deleteMatchDiscordChannel({
      matchId,
      savedChannelId: channelId,
      refereeDiscordId,
      roleAId,
      roleBId,
    });

    // 2. 🟢 Update twi:schedules di KV: bersihkan discordChannelId
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const updatedSchedules = schedules.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          discordChannelId: undefined, // Ditandai bahwa channel sudah dihapus
        };
      }
      return m;
    });
    await kv.set('twi:schedules', updatedSchedules);

    return NextResponse.json({
      success: true,
      message: `Channel Discord untuk ${matchId} berhasil dihapus dan status KV diperbarui.`,
      schedules: updatedSchedules,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
