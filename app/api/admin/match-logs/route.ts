import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { backupDiscordChannelMessages } from '@/lib/discord/backup';
import { deleteMatchDiscordChannel } from '@/lib/discord/channels';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    // 1. Request detail log match spesifik
    if (matchId) {
      const cachedData: any = await kv.get(`twi:match_logs:${matchId}`);
      // Ambil mapping HASH player-to-team dari global:ign
      const playerTeamMap = (await kv.hgetall<Record<string, string>>('global:ign')) || {};

      if (Array.isArray(cachedData)) {
        return NextResponse.json({
          matchId,
          channelName: `⚔️-${matchId}`,
          logs: cachedData,
          playerTeamMap,
        });
      }

      return NextResponse.json({
        matchId,
        channelName: cachedData?.channelName || `⚔️-${matchId}`,
        logs: cachedData?.logs || [],
        playerTeamMap,
      });
    }

    // 2. Ambil list schedules yang valid (aktif / sudah dibackup)
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const validArchivedSchedules = schedules.filter((m: any) => {
      const hasActiveChannel = Boolean(m.discordChannelId && String(m.discordChannelId).trim() !== '');
      const hasSavedLogs = Boolean(m.discordLogsSaved);
      return hasActiveChannel || hasSavedLogs;
    });

    return NextResponse.json({ schedules: validArchivedSchedules });
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

    // Tandai status arsip tersimpan di schedules
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const updatedSchedules = schedules.map((m: any) => {
      if (m.id === matchId) {
        return {
          ...m,
          discordLogsSaved: true,
          discordLogsSavedAt: new Date().toISOString(),
        };
      }
      return m;
    });
    await kv.set('twi:schedules', updatedSchedules);

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

    await deleteMatchDiscordChannel({
      matchId,
      savedChannelId: channelId,
      refereeDiscordId,
      roleAId,
      roleBId,
    });

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const updatedSchedules = schedules.map((m: any) => {
      if (m.id === matchId) {
        return {
          ...m,
          discordChannelId: undefined,
          discordLogsSaved: true,
        };
      }
      return m;
    });
    await kv.set('twi:schedules', updatedSchedules);

    const validArchivedSchedules = updatedSchedules.filter((m: any) => {
      const hasActiveChannel = Boolean(m.discordChannelId && String(m.discordChannelId).trim() !== '');
      const hasSavedLogs = Boolean(m.discordLogsSaved);
      return hasActiveChannel || hasSavedLogs;
    });

    return NextResponse.json({
      success: true,
      message: `Channel Discord untuk ${matchId} berhasil dihapus dan status KV diperbarui.`,
      schedules: validArchivedSchedules,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
