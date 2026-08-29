import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendCompletedAssignmentLog,
  sendCancelledAssignmentLog,
  sendOfficialScoreLog,
} from '@/lib/discord/messages/assignment-log';
import { getMatchContext, updateStaffHistory } from './staff-helpers';
import { revokeStaffPermissions } from './staff-permissions';

export async function executeUnassignStaff(params: {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  scoreA?: number;
  scoreB?: number;
}) {
  const { matchId, assignType, scoreA = 0, scoreB = 0 } = params;

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di database.');

  const match = schedules[idx];
  const ctx = await getMatchContext(match);
  const matchChannelId = (match as any).discordChannelId;

  const baseLog = {
    channelId: DISCORD_CONFIG.CH_ASSIGN || '',
    matchId: match.id,
    weekName: ctx.calculatedWeek,
    groupName: match.groupName,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAEmoji: ctx.teamAEmoji,
    teamBEmoji: ctx.teamBEmoji,
    matchDateIso: match.matchDate,
  };

  // 1. UNASSIGN STREAMER (BATAL)
  if (assignType === 'STREAMER') {
    const streamerId = match.streamerDiscordId;
    if (!streamerId || !isValidSnowflake(streamerId)) throw new Error('Tidak ada Streamer aktif di match ini.');

    await Promise.all([
      revokeStaffPermissions({ type: 'STREAMER', staffId: streamerId, matchChannelId }),
      updateStaffHistory('STREAMER', streamerId, match.id, 'REMOVE'),
      (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId)
        ? sendCancelledAssignmentLog({ ...baseLog, existingMsgId: (match as any).streamerLogMsgId, staffDiscordId: streamerId }) : null,
      matchChannelId ? sendOrUpdateOpeningEmbed({
        channelId: matchChannelId, matchId: match.id, groupName: match.groupName, weekName: ctx.calculatedWeek,
        teamAName: match.teamAName, teamBName: match.teamBName, teamAEmoji: ctx.teamAEmoji, teamBEmoji: ctx.teamBEmoji,
        kodeTimA: ctx.kodeTimA, kodeTimB: ctx.kodeTimB, roleAId: ctx.roleAId, roleBId: ctx.roleBId, matchDateIso: match.matchDate,
        refereeName: match.referee, refereeDiscordId: match.refereeDiscordId, streamerName: undefined, streamerDiscordId: undefined,
        streamLink: match.streamLink, existingMsgId: (match as any).openingMsgId,
      }).then((id) => { if (id) (match as any).openingMsgId = id; }) : null,
    ]);

    const targetStaffName = match.streamer || `<@${streamerId}>`;
    match.streamer = undefined; match.streamerDiscordId = undefined; (match as any).streamerLogMsgId = undefined;
    schedules[idx] = match;
    await kv.set('twi:schedules', schedules);
    return { match, targetStaffName };
  }

  // 2. UNASSIGN REFEREE (MATCH SELESAI)
  const refId = match.refereeDiscordId;
  if (!refId || !isValidSnowflake(refId)) throw new Error('Tidak ada Referee aktif di match ini.');

  const strmId = match.streamerDiscordId;
  const finishTasks: Promise<any>[] = [
    revokeStaffPermissions({ type: 'REFEREE', staffId: refId, matchChannelId, roleAId: ctx.roleAId, roleBId: ctx.roleBId }),
    updateStaffHistory('REFEREE', refId, match.id, 'REMOVE'),
  ];

  if (DISCORD_CONFIG.CH_ASSIGN && (match as any).refereeLogMsgId) {
    finishTasks.push(sendCompletedAssignmentLog({ ...baseLog, existingMsgId: (match as any).refereeLogMsgId, roleType: 'REFEREE', staffDiscordId: refId, scoreA, scoreB }));
  }

  if (strmId && isValidSnowflake(strmId)) {
    finishTasks.push(
      revokeStaffPermissions({ type: 'STREAMER', staffId: strmId, matchChannelId }),
      updateStaffHistory('STREAMER', strmId, match.id, 'REMOVE'),
      (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId)
        ? sendCompletedAssignmentLog({ ...baseLog, existingMsgId: (match as any).streamerLogMsgId, roleType: 'STREAMER', staffDiscordId: strmId, streamLink: match.streamLink }) : null
    );
    match.streamerDiscordId = undefined;
  }

  const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
  if (chScore) {
    finishTasks.push(sendOfficialScoreLog({ channelId: chScore, teamAName: match.teamAName, teamBName: match.teamBName, teamAEmoji: ctx.teamAEmoji, teamBEmoji: ctx.teamBEmoji, scoreA, scoreB }));
  }

  await Promise.all(finishTasks);

  const targetStaffName = match.referee || `<@${refId}>`;
  match.scoreA = scoreA; match.scoreB = scoreB; match.isFinished = true; match.refereeDiscordId = undefined;
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, targetStaffName };
}