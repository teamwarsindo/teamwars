import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import { sendReassignmentLog } from '@/lib/discord/messages/assignment-log';
import { ExecuteSwapParams, ExecuteSwapResult } from './types';
import {
  getMatchContext,
  buildBaseLogPayload,
  grantStaffPermissions,
  revokeStaffPermissions,
  updateStaffHistory,
} from './helpers';

export async function executeSwapAssignStaff(params: ExecuteSwapParams): Promise<ExecuteSwapResult> {
  const { matchAId, matchBId, assignType } = params;

  if (matchAId === matchBId) {
    throw new Error('Match A dan Match B tidak boleh sama!');
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idxA = schedules.findIndex((m) => m.id === matchAId);
  const idxB = schedules.findIndex((m) => m.id === matchBId);

  if (idxA === -1 || idxB === -1) {
    throw new Error('Salah satu match tidak ditemukan di database.');
  }

  const matchA = schedules[idxA];
  const matchB = schedules[idxB];

  if (matchA.isFinished || matchB.isFinished) {
    throw new Error('Tidak bisa swap match yang sudah selesai!');
  }

  const isRef = assignType === 'REFEREE';
  const staffAId = isRef ? matchA.refereeDiscordId : matchA.streamerDiscordId;
  const staffBId = isRef ? matchB.refereeDiscordId : matchB.streamerDiscordId;

  if (!staffAId || !isValidSnowflake(staffAId)) {
    throw new Error(`Match **${matchA.id}** belum memiliki staf aktif untuk di-swap.`);
  }
  if (!staffBId || !isValidSnowflake(staffBId)) {
    throw new Error(`Match **${matchB.id}** belum memiliki staf aktif untuk di-swap.`);
  }
  if (staffAId === staffBId) {
    throw new Error('Kedua match sudah memiliki staf yang sama.');
  }

  // Jaminan tipe string non-nullable setelah validasi ID
  const staffAName: string = (isRef ? matchA.referee : matchA.streamer) || staffAId;
  const staffBName: string = (isRef ? matchB.referee : matchB.streamer) || staffBId;

  const [ctxA, ctxB] = await Promise.all([getMatchContext(matchA), getMatchContext(matchB)]);
  const chAId = (matchA as any).discordChannelId;
  const chBId = (matchB as any).discordChannelId;

  // 1. Cabut hak akses lama
  await Promise.all([
    revokeStaffPermissions({
      type: assignType,
      staffId: staffAId,
      matchChannelId: chAId,
      roleAId: ctxA.roleAId,
      roleBId: ctxA.roleBId,
    }),
    revokeStaffPermissions({
      type: assignType,
      staffId: staffBId,
      matchChannelId: chBId,
      roleAId: ctxB.roleAId,
      roleBId: ctxB.roleBId,
    }),
    updateStaffHistory(assignType, staffAId, matchA.id, 'REMOVE'),
    updateStaffHistory(assignType, staffBId, matchB.id, 'REMOVE'),
  ]);

  // 2. Tukar data staf
  if (isRef) {
    matchA.referee = staffBName;
    matchA.refereeDiscordId = staffBId;
    matchB.referee = staffAName;
    matchB.refereeDiscordId = staffAId;
  } else {
    matchA.streamer = staffBName;
    matchA.streamerDiscordId = staffBId;
    matchB.streamer = staffAName;
    matchB.streamerDiscordId = staffAId;
  }

  // 3. Pasang hak akses baru
  const grantTasks: Promise<any>[] = [
    grantStaffPermissions({
      type: assignType,
      staffId: staffBId,
      matchChannelId: chAId,
      roleAId: ctxA.roleAId,
      roleBId: ctxA.roleBId,
    }),
    grantStaffPermissions({
      type: assignType,
      staffId: staffAId,
      matchChannelId: chBId,
      roleAId: ctxB.roleAId,
      roleBId: ctxB.roleBId,
    }),
    updateStaffHistory(assignType, staffBId, matchA.id, 'ADD'),
    updateStaffHistory(assignType, staffAId, matchB.id, 'ADD'),
  ];

  // 4. Update Opening Embeds (dengan trigger mention staff baru)
  const openingTasks: Promise<any>[] = [];

  if (chAId) {
    openingTasks.push(
      sendOrUpdateOpeningEmbed({
        channelId: chAId,
        matchId: matchA.id,
        groupName: matchA.groupName,
        weekName: ctxA.calculatedWeek,
        teamAName: matchA.teamAName,
        teamBName: matchA.teamBName,
        teamAEmoji: ctxA.teamAEmoji,
        teamBEmoji: ctxA.teamBEmoji,
        kodeTimA: ctxA.kodeTimA,
        kodeTimB: ctxA.kodeTimB,
        roleAId: ctxA.roleAId,
        roleBId: ctxA.roleBId,
        matchDateIso: matchA.matchDate,
        refereeName: matchA.referee,
        refereeDiscordId: matchA.refereeDiscordId,
        streamerName: matchA.streamer,
        streamerDiscordId: matchA.streamerDiscordId,
        streamLink: matchA.streamLink,
        existingMsgId: (matchA as any).openingMsgId,
        isFinished: false,
        assignedRole: assignType,
        newStaffDiscordId: staffBId,
      }).then((newMsgId) => {
        if (newMsgId) (matchA as any).openingMsgId = newMsgId;
      })
    );
  }

  if (chBId) {
    openingTasks.push(
      sendOrUpdateOpeningEmbed({
        channelId: chBId,
        matchId: matchB.id,
        groupName: matchB.groupName,
        weekName: ctxB.calculatedWeek,
        teamAName: matchB.teamAName,
        teamBName: matchB.teamBName,
        teamAEmoji: ctxB.teamAEmoji,
        teamBEmoji: ctxB.teamBEmoji,
        kodeTimA: ctxB.kodeTimA,
        kodeTimB: ctxB.kodeTimB,
        roleAId: ctxB.roleAId,
        roleBId: ctxB.roleBId,
        matchDateIso: matchB.matchDate,
        refereeName: matchB.referee,
        refereeDiscordId: matchB.refereeDiscordId,
        streamerName: matchB.streamer,
        streamerDiscordId: matchB.streamerDiscordId,
        streamLink: matchB.streamLink,
        existingMsgId: (matchB as any).openingMsgId,
        isFinished: false,
        assignedRole: assignType,
        newStaffDiscordId: staffAId,
      }).then((newMsgId) => {
        if (newMsgId) (matchB as any).openingMsgId = newMsgId;
      })
    );
  }

  // 5. Kirim Reassignment Log untuk kedua match
  const logTasks: Promise<any>[] = [];
  if (DISCORD_CONFIG.CH_ASSIGN) {
    const existingLogAId = isRef ? (matchA as any).refereeLogMsgId : (matchA as any).streamerLogMsgId;
    const existingLogBId = isRef ? (matchB as any).refereeLogMsgId : (matchB as any).streamerLogMsgId;

    if (existingLogAId) {
      logTasks.push(
        sendReassignmentLog({
          ...buildBaseLogPayload(matchA, ctxA, chAId),
          existingMsgId: existingLogAId,
          roleType: assignType,
          newStaffDiscordId: staffBId,
          oldStaffDiscordId: staffAId,
        }).then((id) => {
          if (id) {
            if (isRef) (matchA as any).refereeLogMsgId = id;
            else (matchA as any).streamerLogMsgId = id;
          }
        })
      );
    }

    if (existingLogBId) {
      logTasks.push(
        sendReassignmentLog({
          ...buildBaseLogPayload(matchB, ctxB, chBId),
          existingMsgId: existingLogBId,
          roleType: assignType,
          newStaffDiscordId: staffAId,
          oldStaffDiscordId: staffBId,
        }).then((id) => {
          if (id) {
            if (isRef) (matchB as any).refereeLogMsgId = id;
            else (matchB as any).streamerLogMsgId = id;
          }
        })
      );
    }
  }

  await Promise.all([...grantTasks, ...openingTasks, ...logTasks]);

  schedules[idxA] = matchA;
  schedules[idxB] = matchB;
  await kv.set('twi:schedules', schedules);

  return { matchA, matchB, staffAName, staffBName };
}