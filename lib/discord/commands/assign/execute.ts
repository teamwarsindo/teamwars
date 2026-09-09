import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake, formatWIBDate } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendOrUpdateRefereeAssignmentLog,
  sendOrUpdateStreamerAssignmentLog,
  sendReassignmentLog,
} from '@/lib/discord/messages/assignment-log';
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

  const busy = schedules.find(
    (m) =>
      m.id !== matchId &&
      (assignType === 'REFEREE' ? m.refereeDiscordId === targetStaffId : m.streamerDiscordId === targetStaffId)
  );
  if (busy) throw new Error(`Staf sedang aktif di match **${busy.id}** (${busy.teamAName} vs ${busy.teamBName}).`);

  const ctx = await getMatchContext(match);
  const matchChannelId = (match as any).discordChannelId;
  const isRef = assignType === 'REFEREE';
  const oldStaffId = isRef ? match.refereeDiscordId : match.streamerDiscordId;

  let replacedStaffName: string | undefined;

  // 1. Cabut akses staf lama jika ini adalah aksi penggantian (reassignment)
  if (oldStaffId && oldStaffId !== targetStaffId && isValidSnowflake(oldStaffId)) {
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

  // 2. Tentukan nama server staf baru
  const staffName = staffList.find((s) => s.discordId === targetStaffId)?.discordName || targetStaffId;
  if (isRef) {
    match.referee = staffName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = staffName;
    match.streamerDiscordId = targetStaffId;
  }

  // 3. Update opening embed di room match (memicu tag mention staf di body chat untuk update cache)
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

  // 4. Kirim notifikasi ringkas ke Camp Tim A & B (Khusus Wasit)
  const campNotificationTasks: Promise<any>[] = [];
  if (isRef) {
    const matchRoomLink = matchChannelId ? `<#${matchChannelId}>` : 'Room Match';
    const scheduleDateStr = formatWIBDate(match.matchDate);

    if (isValidSnowflake(ctx.campChannelAId)) {
      const rolePrefixA = isValidSnowflake(ctx.roleAId) ? `<@&${ctx.roleAId}> ` : '';
      const msgCampA = `${rolePrefixA}Pertandingan kalian melawan **${match.teamBName}** akan dipimpin oleh Wasit <@${targetStaffId}>.\n\n📅 **Jadwal:** ${scheduleDateStr}\n⚔️ **Room Match:** ${matchRoomLink}`;
      campNotificationTasks.push(
        discordAPI(`/channels/${ctx.campChannelAId}/messages`, 'POST', { content: msgCampA }).catch(() => null)
      );
    }

    if (isValidSnowflake(ctx.campChannelBId)) {
      const rolePrefixB = isValidSnowflake(ctx.roleBId) ? `<@&${ctx.roleBId}> ` : '';
      const msgCampB = `${rolePrefixB}Pertandingan kalian melawan **${match.teamAName}** akan dipimpin oleh Wasit <@${targetStaffId}>.\n\n📅 **Jadwal:** ${scheduleDateStr}\n⚔️ **Room Match:** ${matchRoomLink}`;
      campNotificationTasks.push(
        discordAPI(`/channels/${ctx.campChannelBId}/messages`, 'POST', { content: msgCampB }).catch(() => null)
      );
    }
  }

  // 5. Kirim log ke channel #CH_ASSIGN
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
    ...campNotificationTasks,
  ]);

  if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
  if (newLogId) {
    if (isRef) (match as any).refereeLogMsgId = newLogId;
    else (match as any).streamerLogMsgId = newLogId;
  }

  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, staffName, replacedStaffName };
}