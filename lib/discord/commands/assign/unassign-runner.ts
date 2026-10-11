import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { advancePlayoffWinner } from '@/app/tournament/_library/calculator/playoff';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendCompletedAssignmentLog,
  sendCancelledAssignmentLog,
} from '@/lib/discord/messages/assignment-log';
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

  // 1. UNASSIGN STREAMER (PEMBATALAN SIARAN)
  if (assignType === 'STREAMER') {
    const streamerId = match.streamerDiscordId;
    if (!streamerId || !isValidSnowflake(streamerId)) throw new Error('Tidak ada Streamer aktif di match ini.');

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
          streamLink: undefined,
          existingMsgId: (match as any).openingMsgId,
          isFinished: false,
        }).then((id) => {
          if (id) (match as any).openingMsgId = id;
        })
      );
    }

    await Promise.all(tasks);

    const targetStaffName = match.streamer || `<@${streamerId}>`;

    // Bersihkan seluruh data streamer di jadwal (UI jadi bersih/kosong)
    match.streamer = undefined;
    match.streamerDiscordId = undefined;
    match.streamLink = undefined;
    (match as any).streamUrl = undefined;
    (match as any).streamerLogMsgId = undefined;

    schedules[idx] = match;
    await kv.set('twi:schedules', schedules);
    return { match, targetStaffName };
  }

  // 2. UNASSIGN REFEREE (MATCH BERAKHIR)
  const refId = match.refereeDiscordId;
  if (!refId || !isValidSnowflake(refId)) throw new Error('Tidak ada Referee aktif di match ini.');

  const strmId = match.streamerDiscordId;
  const finishTasks: Promise<any>[] = [
    revokeStaffPermissions({
      type: 'REFEREE',
      staffId: refId,
      matchChannelId,
      roleAId: ctx.roleAId,
      roleBId: ctx.roleBId,
    }),
    updateStaffHistory('REFEREE', refId, match.id, 'COMPLETE'),
  ];

  // Mengirim log hijau COMPLETED (skor otomatis dari database)
  if (DISCORD_CONFIG.CH_ASSIGN && (match as any).refereeLogMsgId) {
    finishTasks.push(
      sendCompletedAssignmentLog({
        ...baseLog,
        existingMsgId: (match as any).refereeLogMsgId,
        roleType: 'REFEREE',
        staffDiscordId: refId,
        scoreA: match.scoreA ?? 0,
        scoreB: match.scoreB ?? 0,
      })
    );
  }

  // Jika streamer masih ada sampai match selesai, catat ke historyMatch
  if (strmId && isValidSnowflake(strmId)) {
    finishTasks.push(
      revokeStaffPermissions({ type: 'STREAMER', staffId: strmId, matchChannelId }),
      updateStaffHistory('STREAMER', strmId, match.id, 'COMPLETE')
    );

    if (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId) {
      finishTasks.push(
        sendCompletedAssignmentLog({
          ...baseLog,
          existingMsgId: (match as any).streamerLogMsgId,
          roleType: 'STREAMER',
          staffDiscordId: strmId,
          streamLink: match.streamLink,
        })
      );
    }

    match.streamerDiscordId = undefined;
    (match as any).streamerLogMsgId = undefined;
  }

  await Promise.all(finishTasks);

  const targetStaffName = match.referee || `<@${refId}>`;
  match.isFinished = true;

  // Lepas ID Discord kunci penugasan wasit, tapi pertahankan nama match.referee untuk UI
  match.refereeDiscordId = undefined;
  (match as any).refereeLogMsgId = undefined;

  schedules[idx] = match;

  // Otomatisasi kenaikan pemenang playoff ke ronde berikutnya
  advancePlayoffWinner(schedules);

  // Perbarui twi:match_reports agar status selesai dan nama tim tersinkronisasi
  const reportData = await kv.hget<any>('twi:match_reports', match.id);
  const reportsToUpdate: Record<string, any> = {};

  if (reportData) {
    reportData.isFinished = true;
    if (match.teamAName && !/^winner\b|^loser\b|^tbd\b/i.test(match.teamAName)) {
      if (!reportData.teamA) reportData.teamA = {};
      reportData.teamA.name = match.teamAName;
    }
    if (match.teamBName && !/^winner\b|^loser\b|^tbd\b/i.test(match.teamBName)) {
      if (!reportData.teamB) reportData.teamB = {};
      reportData.teamB.name = match.teamBName;
    }
    reportsToUpdate[match.id] = reportData;
  }

  // Sinkronkan nama tim pemenang ke laporan laga playoff berikutnya (jika sudah ada draft report-nya)
  for (const s of schedules) {
    if (s.id && s.id !== match.id) {
      const nextReport = await kv.hget<any>('twi:match_reports', s.id);
      if (nextReport) {
        let changed = false;
        if (s.teamAName && !/^winner\b|^loser\b|^tbd\b/i.test(s.teamAName) && nextReport.teamA?.name !== s.teamAName) {
          if (!nextReport.teamA) nextReport.teamA = {};
          nextReport.teamA.name = s.teamAName;
          changed = true;
        }
        if (s.teamBName && !/^winner\b|^loser\b|^tbd\b/i.test(s.teamBName) && nextReport.teamB?.name !== s.teamBName) {
          if (!nextReport.teamB) nextReport.teamB = {};
          nextReport.teamB.name = s.teamBName;
          changed = true;
        }
        if (changed) {
          reportsToUpdate[s.id] = nextReport;
        }
      }
    }
  }

  const kvTasks: Promise<any>[] = [kv.set('twi:schedules', schedules)];
  if (Object.keys(reportsToUpdate).length > 0) {
    kvTasks.push(kv.hset('twi:match_reports', reportsToUpdate));
  }

  await Promise.all(kvTasks);

  return { match, targetStaffName };
          }
