import { kv } from '@vercel/kv';
import { MatchScheduleItem, getMatchWeekNumber, getTeamSlug } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendOrUpdateRefereeAssignmentLog,
  sendOrUpdateStreamerAssignmentLog,
  sendReassignmentLog,
} from '@/lib/discord/messages/assignment-log';
import {
  sendOrUpdateDutyRescheduleSchedule,
  RescheduleDutyMatch,
} from '@/lib/discord/messages/duty-reschedule';
import { ExecuteAssignParams, ExecuteAssignResult, StaffItem } from './types';
import {
  getMatchContext,
  buildBaseLogPayload,
  grantStaffPermissions,
  revokeStaffPermissions,
  updateStaffHistory,
} from './helpers';

export async function executeAssignStaff(params: ExecuteAssignParams): Promise<ExecuteAssignResult> {
  const { matchId, assignType, targetStaffId } = params;
  if (!isValidSnowflake(targetStaffId)) throw new Error('ID Staf tidak valid!');

  const [schedules, staffList] = await Promise.all([
    kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
    kv.get<StaffItem[]>(assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees').then((res) => res || []),
  ]);

  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di database.');
  const match = schedules[idx];

  const isRef = assignType === 'REFEREE';
  const oldStaffId = isRef ? match.refereeDiscordId : match.streamerDiscordId;

  if (oldStaffId === targetStaffId) {
    const currentName = isRef ? match.referee : match.streamer;
    throw new Error(`⚠️ Staf **${currentName || targetStaffId}** sudah bertugas sebagai ${assignType} pada match ini.`);
  }

  const busy = schedules.find(
    (m) =>
      m.id !== matchId &&
      (assignType === 'REFEREE' ? m.refereeDiscordId === targetStaffId : m.streamerDiscordId === targetStaffId)
  );
  if (busy) throw new Error(`Staf sedang aktif di match **${busy.id}** (${busy.teamAName} vs ${busy.teamBName}).`);

  const ctx = await getMatchContext(match);
  const matchChannelId = (match as any).discordChannelId;

  let replacedStaffName: string | undefined;

  if (oldStaffId && isValidSnowflake(oldStaffId)) {
    replacedStaffName = (isRef ? match.referee : match.streamer) || oldStaffId;
    await Promise.all([
      revokeStaffPermissions({
        type: assignType,
        staffId: oldStaffId,
        matchChannelId,
        roleAId: ctx.roleAId,
        roleBId: ctx.roleBId,
      }),
      updateStaffHistory(assignType, oldStaffId, match.id, 'REMOVE'),
    ]);
  }

  const staffName = staffList.find((s) => s.discordId === targetStaffId)?.discordName || targetStaffId;
  if (isRef) {
    match.referee = staffName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = staffName;
    match.streamerDiscordId = targetStaffId;
  }

  const openingTask = matchChannelId
    ? sendOrUpdateOpeningEmbed({
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
        streamerName: match.streamer,
        streamerDiscordId: match.streamerDiscordId,
        streamLink: match.streamLink,
        existingMsgId: (match as any).openingMsgId,
        isFinished: false,
        assignedRole: assignType,
        newStaffDiscordId: targetStaffId,
      })
    : Promise.resolve(null);

  const baseLog = buildBaseLogPayload(match, ctx, matchChannelId);
  const existingLogId = isRef ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;

  let logTask: Promise<string | null> = Promise.resolve(null);
  if (DISCORD_CONFIG.CH_ASSIGN) {
    if (replacedStaffName && existingLogId) {
      logTask = sendReassignmentLog({
        ...baseLog,
        existingMsgId: existingLogId,
        roleType: assignType,
        newStaffDiscordId: targetStaffId,
        oldStaffDiscordId: oldStaffId!,
      });
    } else if (isRef) {
      logTask = sendOrUpdateRefereeAssignmentLog({ ...baseLog, staffDiscordId: targetStaffId });
    } else {
      logTask = sendOrUpdateStreamerAssignmentLog({ ...baseLog, staffDiscordId: targetStaffId });
    }
  }

  const [newOpeningMsgId, newLogId] = await Promise.all([
    openingTask,
    logTask,
    grantStaffPermissions({
      type: assignType,
      staffId: targetStaffId,
      matchChannelId,
      roleAId: ctx.roleAId,
      roleBId: ctx.roleBId,
    }),
    updateStaffHistory(assignType, targetStaffId, match.id, 'ADD'),
  ]);

  if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
  if (newLogId) {
    if (isRef) (match as any).refereeLogMsgId = newLogId;
    else (match as any).streamerLogMsgId = newLogId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  // 6. PATCH DUTY TRACKER: Hanya patch channel yang perannya di-assign
  if ((match as any).isRescheduled) {
    try {
      const targetWeek = Number(match.weekNumber || getMatchWeekNumber(match.matchDate) || 1);
      const weekName = `Week ${targetWeek}`;

      const weekMatches = schedules.filter((m) => {
        const w = Number(m.weekNumber || getMatchWeekNumber(m.matchDate) || 1);
        return w === targetWeek && Boolean((m as any).isRescheduled);
      });

      const dutyMatches: RescheduleDutyMatch[] = await Promise.all(
        weekMatches.map(async (m) => {
          const slugA = getTeamSlug(m.teamAName);
          const slugB = getTeamSlug(m.teamBName);

          const [tA, tB] = await Promise.all([
            kv.hgetall<any>(`teams:${slugA}`),
            kv.hgetall<any>(`teams:${slugB}`),
          ]);

          const eA =
            tA?.discordEmoji ||
            tA?.emoji ||
            (tA?.emojiId ? `<:${tA?.kodeTim || 'team'}:${tA?.emojiId}>` : undefined);

          const eB =
            tB?.discordEmoji ||
            tB?.emoji ||
            (tB?.emojiId ? `<:${tB?.kodeTim || 'team'}:${tB?.emojiId}>` : undefined);

          const d = new Date(m.matchDate);
          return {
            matchDateIso: m.matchDate,
            dateStr: d.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
            }),
            timeStr:
              d
                .toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: 'Asia/Jakarta',
                })
                .replace(':', '.') + ' WIB',
            team1Emoji: eA,
            team1Name: m.teamAName,
            team2Emoji: eB,
            team2Name: m.teamBName,
            referee: (m as any).referee || null,
            streamer: (m as any).streamer || null,
            isRescheduled: true,
          };
        })
      );

      // KUNCI: patchReferee aktif HANYA jika isRef, patchStreamer aktif HANYA jika !isRef
      await sendOrUpdateDutyRescheduleSchedule({
        weekName,
        matches: dutyMatches,
        patchReferee: isRef,
        patchStreamer: !isRef,
      });
    } catch (dutyErr) {
      console.warn('Gagal sinkron duty reschedule setelah assign:', dutyErr);
    }
  }

  return { match, staffName, replacedStaffName };
}
  
