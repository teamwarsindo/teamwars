import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { executeAssignStaff } from '@/lib/discord/commands/assign/execute';
import { executeUnassignStaff } from '@/lib/discord/commands/assign/unassign-runner';
import { handleSyncWeekAction } from '@/lib/discord/match-sync/sync-week';
import {
  getTeamSlug,
  getMatchWeekNumber,
  ensureMatchReportInitialized,
} from '@/lib/discord/match-sync/helpers';

export async function POST(req: Request) {
  try {
    // 🔒 0. Otorisasi Cron Internal
    const cronSecret = req.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Cron Secret' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { matchId, action, targetWeek, unassignType, assignType, targetStaffId } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // ==========================================
    // 🟢 1. ACTION: SYNC PER WEEK (MASSAL / BATCH)
    // ==========================================
    if (action === 'WEEK' || targetWeek) {
      return await handleSyncWeekAction(targetWeek, schedules);
    }

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    // ==========================================
    // 🔴 2. ACTION: UNASSIGN WASIT / STREAMER
    // ==========================================
    if (action === 'UNASSIGN') {
      const type = unassignType || assignType || 'REFEREE';
      const result = await executeUnassignStaff({
        matchId,
        assignType: type,
      });
      return NextResponse.json({ success: true, message: `Unassign match ${matchId} berhasil!`, result });
    }

    // ==========================================
    // 🔵 3. ACTION: ASSIGN WASIT / STREAMER
    // ==========================================
    if (action === 'ASSIGN' && targetStaffId) {
      const result = await executeAssignStaff({
        matchId,
        assignType: assignType || 'REFEREE',
        targetStaffId,
      });
      return NextResponse.json({ success: true, message: `Assign match ${matchId} berhasil!`, result });
    }

    // ==========================================
    // 🟢 4. ACTION: SYNC SINGLE MATCH CHANNEL
    // ==========================================
    const matchIdx = schedules.findIndex((m) => m.id === matchId);
    if (matchIdx === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis KV' }, { status: 400 });
    }

    const match = schedules[matchIdx];
    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
      kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
    ]);

    const computedWeekNum = match.weekNumber || getMatchWeekNumber(match.matchDate);
    const weekStr = (match as any).weekName || `Week ${computedWeekNum}`;
    const groupOrStage = match.groupName || (match as any).stage || 'Playoff';

    const res = await createMatchDiscordChannel({
      matchId: match.id,
      groupName: groupOrStage,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      kodeTimA: teamA?.kodeTim,
      kodeTimB: teamB?.kodeTim,
      emojiAId: teamA?.emojiId,
      emojiBId: teamB?.emojiId,
      roleAId: teamA?.discordRoleId || teamA?.roleId,
      roleBId: teamB?.discordRoleId || teamB?.roleId,
      weekName: weekStr,
      matchDateIso: match.matchDate,
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: match.streamerDiscordId,
      streamLink: match.streamLink,
      savedChannelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
    });

    await ensureMatchReportInitialized(match, computedWeekNum);

    if (res.channelId) {
      (schedules[matchIdx] as any).discordChannelId = res.channelId;
      if (res.openingMsgId) {
        (schedules[matchIdx] as any).openingMsgId = res.openingMsgId;
      }
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      message: `Sync Channel & Match Report untuk ${matchId} berhasil!`,
      channelId: res.channelId,
      openingMsgId: res.openingMsgId,
    });
  } catch (error: any) {
    console.error('Error Syncing Match:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
