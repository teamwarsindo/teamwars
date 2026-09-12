import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import { sendCancelledAssignmentLog } from '@/lib/discord/messages/assignment-log';
import { ExecuteUnassignParams, ExecuteUnassignResult } from './types';
import { getMatchContext, buildBaseLogPayload, revokeStaffPermissions, updateStaffHistory } from './helpers';

export async function executeUnassignStaff(params: ExecuteUnassignParams): Promise<ExecuteUnassignResult> {
  const { matchId, assignType } = params;

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di database.');

  const match = schedules[idx];
  const ctx = await getMatchContext(match);
  const matchChannelId = (match as any).discordChannelId;
  const baseLog = buildBaseLogPayload(match, ctx, matchChannelId);

  // 1. UNASSIGN STREAMER
  if (assignType === 'STREAMER') {
    const streamerId = match.streamerDiscordId;
    if (!streamerId || !isValidSnowflake(streamerId)) {
      throw new Error('Tidak ada Streamer aktif di match ini.');
    }

    const tasks: Promise<any>[] = [
      revokeStaffPermissions({ type: 'STREAMER', staffId: streamerId, matchChannelId }),
      updateStaffHistory('STREAMER', streamerId, match.id, 'REMOVE'),
    ];

    if (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId) {
      tasks.push(
        sendCancelledAssignmentLog({
          ...baseLog,
          existingMsgId: (match as any).streamerLogMsgId,
          staffDiscordId: streamerId,
        })
      );
    }

    if (matchChannelId) {
      tasks.push(
        sendOrUpdateOpeningEmbed({
          channelId: matchChannelId,
          matchId: match.id,
          groupName: match.groupName,
          weekName: ctx.calculatedWeek,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          teamAEmoji: ctx.teamAEmoji,
          teamBEmoji: ctx.teamBEmoji,
          kodeTimA: ctx.kodeTimA,
          kodeTimB: ctx.kodeTimB,
          roleAId: ctx.roleAId,
          roleBId: ctx.roleBId,
          matchDateIso: match.matchDate,
          refereeName: match.referee,
          refereeDiscordId: match.refereeDiscordId,
          streamerName: undefined,
          streamerDiscordId: undefined,
          streamLink: match.streamLink,
          existingMsgId: (match as any).openingMsgId,
          isFinished: match.isFinished,
        }).then((id) => {
          if (id) (match as any).openingMsgId = id;
        })
      );
    }

    await Promise.all(tasks);

    const targetStaffName = match.streamer || `<@${streamerId}>`;
    match.streamer = undefined;
    match.streamerDiscordId = undefined;
    (match as any).streamerLogMsgId = undefined;

    schedules[idx] = match;
    await kv.set('twi:schedules', schedules);
    return { match, targetStaffName };
  }

  // 2. UNASSIGN REFEREE
  const refId = match.refereeDiscordId;
  if (!refId || !isValidSnowflake(refId)) {
    throw new Error('Tidak ada Referee aktif di match ini.');
  }

  const tasks: Promise<any>[] = [
    revokeStaffPermissions({
      type: 'REFEREE',
      staffId: refId,
      matchChannelId,
      roleAId: ctx.roleAId,
      roleBId: ctx.roleBId,
    }),
    updateStaffHistory('REFEREE', refId, match.id, 'REMOVE'),
  ];

  if (DISCORD_CONFIG.CH_ASSIGN && (match as any).refereeLogMsgId) {
    tasks.push(
      sendCancelledAssignmentLog({
        ...baseLog,
        existingMsgId: (match as any).refereeLogMsgId,
        staffDiscordId: refId,
      })
    );
  }

  if (matchChannelId) {
    tasks.push(
      sendOrUpdateOpeningEmbed({
        channelId: matchChannelId,
        matchId: match.id,
        groupName: match.groupName,
        weekName: ctx.calculatedWeek,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        teamAEmoji: ctx.teamAEmoji,
        teamBEmoji: ctx.teamBEmoji,
        kodeTimA: ctx.kodeTimA,
        kodeTimB: ctx.kodeTimB,
        roleAId: ctx.roleAId,
        roleBId: ctx.roleBId,
        matchDateIso: match.matchDate,
        refereeName: undefined,
        refereeDiscordId: undefined,
        streamerName: match.streamer,
        streamerDiscordId: match.streamerDiscordId,
        streamLink: match.streamLink,
        existingMsgId: (match as any).openingMsgId,
        isFinished: match.isFinished,
      }).then((id) => {
        if (id) (match as any).openingMsgId = id;
      })
    );
  }

  await Promise.all(tasks);

  const targetStaffName = match.referee || `<@${refId}>`;
  match.referee = undefined;
  match.refereeDiscordId = undefined;
  (match as any).refereeLogMsgId = undefined;

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, targetStaffName };
        }
