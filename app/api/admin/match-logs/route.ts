import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { backupDiscordChannelMessages } from '@/lib/discord/backup';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      // Ambil daftar jadwal untuk metadata filter
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      return NextResponse.json({ schedules });
    }

    // Ambil log percakapan match spesifik
    const logs = await kv.get(`twi:match_logs:${matchId}`);
    return NextResponse.json({ matchId, logs: logs || [] });
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

    const logs = await backupDiscordChannelMessages({
      matchId,
      channelId,
      week: Number(week) || 1,
    });

    // Simpan array JSON bersih ke Redis KV
    await kv.set(`twi:match_logs:${matchId}`, logs);

    return NextResponse.json({
      success: true,
      message: `Berhasil mencadangkan ${logs.length} pesan dari channel Discord.`,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  }
