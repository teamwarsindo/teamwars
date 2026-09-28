import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, TOURNAMENT_RULES } from '@/app/tournament/_library';
import {
  createMatchDiscordChannel,
  syncPlayoffCoordinationDiscordChannel,
} from '@/lib/discord/channels';
import {
  getPlayoffCoordinationMessagePayload,
  PlayoffCoordinationMatchItem,
} from '@/lib/discord/messages/playoff-coordination';
import { discordAPI } from '@/lib/discord/utils';
import {
  delay,
  getTeamSlug,
  getMatchWeekNumber,
  getTournamentWeekNumberSafe,
  ensureMatchReportInitialized,
} from './helpers';

const KV_PLAYOFF_COORD_KEY = 'twi:playoff_coordination_channel';

export async function handleSyncWeekAction(targetWeek: string, schedules: MatchScheduleItem[]) {
  if (!targetWeek || targetWeek === 'ALL') {
    return NextResponse.json(
      { error: 'Silakan tentukan minggu atau babak spesifik untuk disinkronkan.' },
      { status: 400 }
    );
  }

  const weekMatch = String(targetWeek).match(/\d+/);
  const weekNumber = weekMatch ? parseInt(weekMatch[0], 10) : getTournamentWeekNumberSafe();
  const normTarget = String(targetWeek).toLowerCase().replace(/[^a-z0-9]/g, '');

  const weekMatches = schedules.filter((m: any) => {
    const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
    if (computedWeek === weekNumber) return true;

    const mWeekName = String(m.weekName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mStage = String(m.stage || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return (mWeekName && mWeekName.includes(normTarget)) || (mStage && mStage.includes(normTarget));
  });

  if (weekMatches.length === 0) {
    return NextResponse.json({ error: `Tidak ada jadwal pertandingan untuk ${targetWeek}` }, { status: 400 });
  }

  const updatedMatches: MatchScheduleItem[] = [...schedules];
  const syncedChannelMap: Record<string, string> = {};

  const involvedPlayoffRoles = new Set<string>();
  const involvedPlayoffMatches: PlayoffCoordinationMatchItem[] = [];

  for (const match of weekMatches) {
    const idx = updatedMatches.findIndex((m) => m.id === match.id);
    if (idx === -1) continue;

    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
      kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
    ]);

    const roleA = teamA?.discordRoleId || teamA?.roleId;
    const roleB = teamB?.discordRoleId || teamB?.roleId;

    if (roleA) involvedPlayoffRoles.add(roleA);
    if (roleB) involvedPlayoffRoles.add(roleB);

    involvedPlayoffMatches.push({
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      kodeTimA: teamA?.kodeTim,
      kodeTimB: teamB?.kodeTim,
      emojiAId: teamA?.emojiId,
      emojiBId: teamB?.emojiId,
    });

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
      roleAId: roleA,
      roleBId: roleB,
      weekName: targetWeek,
      matchDateIso: match.matchDate,
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: match.streamerDiscordId,
      streamLink: match.streamLink,
      savedChannelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
    });

    await ensureMatchReportInitialized(match, weekNumber);

    if (res.channelId) {
      (updatedMatches[idx] as any).discordChannelId = res.channelId;
      if (res.openingMsgId) {
        (updatedMatches[idx] as any).openingMsgId = res.openingMsgId;
      }
      syncedChannelMap[match.id] = res.channelId;
    }

    await delay(300);
  }

  await kv.set('twi:schedules', updatedMatches);

  const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK;
  const quarterWeek = playInsWeek + 1;

  const existingCoordChannelId = await kv.get<string>(KV_PLAYOFF_COORD_KEY);

  if (weekNumber > quarterWeek) {
    if (existingCoordChannelId) {
      await discordAPI(`/channels/${existingCoordChannelId}`, 'DELETE').catch(() => null);
      await kv.del(KV_PLAYOFF_COORD_KEY);
    }
  } else if (weekNumber === playInsWeek || weekNumber === quarterWeek) {
    if (existingCoordChannelId) {
      await discordAPI(`/channels/${existingCoordChannelId}`, 'DELETE').catch(() => null);
      await kv.del(KV_PLAYOFF_COORD_KEY);
    }

    const isPlayIns = weekNumber === playInsWeek;
    const stageTitle = isPlayIns ? 'Play-Ins' : 'Quarter Finals';
    const channelName = isPlayIns ? '🤝-koordinasi-playins' : '🤝-koordinasi-quarter';

    const createdCoordChannelId = await syncPlayoffCoordinationDiscordChannel({
      channelName,
      involvedRoleIds: Array.from(involvedPlayoffRoles),
    });

    if (createdCoordChannelId) {
      await kv.set(KV_PLAYOFF_COORD_KEY, createdCoordChannelId);

      const payload = getPlayoffCoordinationMessagePayload({
        stageTitle,
        matches: involvedPlayoffMatches,
      });

      await discordAPI(`/channels/${createdCoordChannelId}/messages`, 'POST', payload).catch(() => null);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Sync Channel & Inisialisasi Match Report untuk ${targetWeek} berhasil dieksekusi!`,
    channels: syncedChannelMap,
  });
}
