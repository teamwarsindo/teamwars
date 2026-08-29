import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendOrUpdateRefereeAssignmentLog,
  sendOrUpdateStreamerAssignmentLog,
  sendReassignmentLog,
  sendCompletedAssignmentLog,
  sendCancelledAssignmentLog,
  sendOfficialScoreLog,
} from '@/lib/discord/messages/assignment-log';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

export function isDiscordAuthorized(interaction: any): boolean {
  const member = interaction?.member;
  const roles: string[] = member?.roles || [];
  const isAdmin = (BigInt(member?.permissions || '0') & BigInt(0x8)) === BigInt(0x8);
  return (
    isAdmin ||
    (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
    (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
  );
}

function getTeamSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function resolveTeamEmoji(teamData: any): string | undefined {
  if (!teamData) return undefined;
  const directTag = teamData.discordEmoji || teamData.emojiTag || teamData.emoji;
  if (typeof directTag === 'string' && directTag.startsWith('<:') && directTag.endsWith('>')) return directTag;

  const emojiId = teamData.discordEmojiId || teamData.emojiId;
  if (emojiId) {
    const cleanName = (teamData.kodeTim || teamData.abbreviation || teamData.tag || 'team').replace(/\s+/g, '');
    return `<:${cleanName}:${emojiId}>`;
  }
  return undefined;
}

function resolveWeekName(match: any): string {
  if (match.weekNumber !== undefined && match.weekNumber !== null) return `Week ${match.weekNumber}`;
  if (match.weekName?.trim()) return match.weekName;
  return 'Week 1';
}

async function getMatchContext(match: MatchScheduleItem) {
  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);

  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  return {
    teamA,
    teamB,
    kodeTimA: teamA?.kodeTim || teamA?.abbreviation || slugA.toUpperCase(),
    kodeTimB: teamB?.kodeTim || teamB?.abbreviation || slugB.toUpperCase(),
    roleAId: teamA?.discordRoleId || teamA?.roleId || '',
    roleBId: teamB?.discordRoleId || teamB?.roleId || '',
    teamAEmoji: resolveTeamEmoji(teamA),
    teamBEmoji: resolveTeamEmoji(teamB),
    calculatedWeek: resolveWeekName(match),
  };
}

async function updateStaffHistory(type: 'REFEREE' | 'STREAMER', staffId: string, matchId: string, action: 'ADD' | 'REMOVE') {
  const kvKey = type === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const idx = staffList.findIndex((s) => s.discordId === staffId);

  if (idx !== -1) {
    const history = new Set(staffList[idx].assignMatch || []);
    action === 'ADD' ? history.add(matchId) : history.delete(matchId);
    staffList[idx].assignMatch = Array.from(history);
    await kv.set(kvKey, staffList);
  }
}

async function revokeStaffPermissions(params: {
  type: 'REFEREE' | 'STREAMER';
  staffId: string;
  matchChannelId?: string;
  roleAId?: string;
  roleBId?: string;
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const { type, staffId, matchChannelId, roleAId, roleBId } = params;

  if (!guildId || !isValidSnowflake(staffId)) return;

  if (type === 'REFEREE') {
    if (isValidSnowflake(roleAId)) {
      await discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
    }
    if (isValidSnowflake(roleBId)) {
      await discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
    }
    const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;
    if (matchChannelId && isValidSnowflake(rolePengawas)) {
      await discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'DELETE').catch(() => null);
    }
  } else if (matchChannelId) {
    await discordAPI(`/channels/${matchChannelId}/permissions/${staffId}`, 'DELETE').catch(() => null);
  }
}

// ─── 🟢 EXECUTE ASSIGN STAFF ──────────────────────────────────
export async function executeAssignStaff(params: {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  targetStaffId: string;
}) {
  const { matchId, assignType, targetStaffId } = params;

  if (!isValidSnowflake(targetStaffId)) {
    throw new Error('ID Staf tidak valid! Harus berupa snowflake akun Discord asli.');
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di database.');

  const match = schedules[idx];

  const busyMatch = schedules.find(
    (m) =>
      m.id !== matchId &&
      (assignType === 'REFEREE' ? m.refereeDiscordId === targetStaffId : m.streamerDiscordId === targetStaffId)
  );
  if (busyMatch) {
    throw new Error(`Staf ini sedang aktif di match **${busyMatch.id}** (${busyMatch.teamAName} vs ${busyMatch.teamBName}).`);
  }

  const ctx = await getMatchContext(match);
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const matchChannelId = (match as any).discordChannelId;
  const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;

  const baseLogPayload = {
    channelId: DISCORD_CONFIG.CH_ASSIGN || '',
    matchId: match.id,
    weekName: ctx.calculatedWeek,
    groupName: match.groupName,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    teamAEmoji: ctx.teamAEmoji,
    teamBEmoji: ctx.teamBEmoji,
    matchChannelId,
    matchDateIso: match.matchDate,
  };

  let replacedStaffId: string | undefined;
  let replacedStaffName: string | undefined;

  // 1. Deteksi Pergantian Staf
  if (assignType === 'REFEREE') {
    const oldRefId = match.refereeDiscordId;
    if (oldRefId && oldRefId !== targetStaffId && isValidSnowflake(oldRefId)) {
      replacedStaffId = oldRefId;
      replacedStaffName = match.referee || oldRefId;
      await revokeStaffPermissions({
        type: 'REFEREE',
        staffId: oldRefId,
        matchChannelId,
        roleAId: ctx.roleAId,
        roleBId: ctx.roleBId,
      });
      await updateStaffHistory('REFEREE', oldRefId, match.id, 'REMOVE');
    }
  } else {
    const oldStrmId = match.streamerDiscordId;
    if (oldStrmId && oldStrmId !== targetStaffId && isValidSnowflake(oldStrmId)) {
      replacedStaffId = oldStrmId;
      replacedStaffName = match.streamer || oldStrmId;
      await revokeStaffPermissions({
        type: 'STREAMER',
        staffId: oldStrmId,
        matchChannelId,
      });
      await updateStaffHistory('STREAMER', oldStrmId, match.id, 'REMOVE');
    }
  }

  // 2. Set Staf Baru
  const kvKey = assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const staffDisplayName = staffList.find((s) => s.discordId === targetStaffId)?.discordName || targetStaffId;

  if (assignType === 'REFEREE') {
    match.referee = staffDisplayName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = staffDisplayName;
    match.streamerDiscordId = targetStaffId;
  }

  // 3. Izin / Role Staf Baru
  if (guildId) {
    if (assignType === 'REFEREE') {
      if (isValidSnowflake(ctx.roleAId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${ctx.roleAId}`, 'PUT').catch(() => null);
      }
      if (isValidSnowflake(ctx.roleBId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${ctx.roleBId}`, 'PUT').catch(() => null);
      }
      if (matchChannelId && isValidSnowflake(rolePengawas)) {
        await discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'PUT', {
          type: 0,
          allow: '66560',
          deny: '0',
        }).catch(() => null);
      }
    } else if (matchChannelId) {
      await discordAPI(`/channels/${matchChannelId}/permissions/${targetStaffId}`, 'PUT', {
        type: 1,
        allow: '66560',
        deny: '0',
      }).catch(() => null);
    }
  }

  // 4. Delete & Post Opening Embed Baru di Channel Match
  if (matchChannelId) {
    const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
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
    });
    if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
  }

  // 5. Post Log Baru atau Reply Pergantian di #CH_ASSIGN
  if (DISCORD_CONFIG.CH_ASSIGN) {
    const existingLogId = assignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;

    if (replacedStaffId && existingLogId) {
      const newLogId = await sendReassignmentLog({
        ...baseLogPayload,
        existingMsgId: existingLogId,
        roleType: assignType,
        newStaffDiscordId: targetStaffId,
        oldStaffDiscordId: replacedStaffId,
      });
      if (newLogId) {
        if (assignType === 'REFEREE') (match as any).refereeLogMsgId = newLogId;
        else (match as any).streamerLogMsgId = newLogId;
      }
    } else {
      const newLogId =
        assignType === 'REFEREE'
          ? await sendOrUpdateRefereeAssignmentLog({ ...baseLogPayload, staffDiscordId: targetStaffId })
          : await sendOrUpdateStreamerAssignmentLog({ ...baseLogPayload, staffDiscordId: targetStaffId });

      if (newLogId) {
        if (assignType === 'REFEREE') (match as any).refereeLogMsgId = newLogId;
        else (match as any).streamerLogMsgId = newLogId;
      }
    }
  }

  await updateStaffHistory(assignType, targetStaffId, match.id, 'ADD');
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, staffName: staffDisplayName, replacedStaffName };
}

// ─── 🔴 EXECUTE UNASSIGN STAFF ────────────────────────────────
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

  const baseLogPayload = {
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

  // ══════════════════════════════════════════════════════════════
  // SKENARIO 1: UNASSIGN STREAMER (Streamer Batal Siaran)
  // ══════════════════════════════════════════════════════════════
  if (assignType === 'STREAMER') {
    const streamerId = match.streamerDiscordId;
    const streamerName = match.streamer;

    if (!streamerId || !isValidSnowflake(streamerId)) {
      throw new Error('Tidak ada Streamer aktif yang terdaftar di match ini.');
    }

    await revokeStaffPermissions({ type: 'STREAMER', staffId: streamerId, matchChannelId });

    if (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId) {
      await sendCancelledAssignmentLog({
        ...baseLogPayload,
        existingMsgId: (match as any).streamerLogMsgId,
        staffDiscordId: streamerId,
      });
    }

    match.streamer = undefined;
    match.streamerDiscordId = undefined;
    (match as any).streamerLogMsgId = undefined;

    if (matchChannelId) {
      const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
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
        isFinished: false,
      });
      if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
    }

    await updateStaffHistory('STREAMER', streamerId, match.id, 'REMOVE');
    schedules[idx] = match;
    await kv.set('twi:schedules', schedules);

    return { match, targetStaffName: streamerName || `<@${streamerId}>` };
  }

  // ══════════════════════════════════════════════════════════════
  // SKENARIO 2: UNASSIGN REFEREE (Match Selesai)
  // ══════════════════════════════════════════════════════════════
  const refereeId = match.refereeDiscordId;
  const refereeName = match.referee;

  if (!refereeId || !isValidSnowflake(refereeId)) {
    throw new Error('Tidak ada Referee aktif yang terdaftar di match ini.');
  }

  await revokeStaffPermissions({
    type: 'REFEREE',
    staffId: refereeId,
    matchChannelId,
    roleAId: ctx.roleAId,
    roleBId: ctx.roleBId,
  });

  if (DISCORD_CONFIG.CH_ASSIGN && (match as any).refereeLogMsgId) {
    await sendCompletedAssignmentLog({
      ...baseLogPayload,
      existingMsgId: (match as any).refereeLogMsgId,
      roleType: 'REFEREE',
      staffDiscordId: refereeId,
      scoreA,
      scoreB,
    });
  }

  const activeStreamerId = match.streamerDiscordId;
  if (activeStreamerId && isValidSnowflake(activeStreamerId)) {
    await revokeStaffPermissions({ type: 'STREAMER', staffId: activeStreamerId, matchChannelId });

    if (DISCORD_CONFIG.CH_ASSIGN && (match as any).streamerLogMsgId) {
      await sendCompletedAssignmentLog({
        ...baseLogPayload,
        existingMsgId: (match as any).streamerLogMsgId,
        roleType: 'STREAMER',
        staffDiscordId: activeStreamerId,
        streamLink: match.streamLink,
      });
    }

    await updateStaffHistory('STREAMER', activeStreamerId, match.id, 'REMOVE');
    match.streamerDiscordId = undefined;
  }

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.isFinished = true;
  match.refereeDiscordId = undefined;

  const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
  if (chScore) {
    await sendOfficialScoreLog({
      channelId: chScore,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAEmoji: ctx.teamAEmoji,
      teamBEmoji: ctx.teamBEmoji,
      scoreA,
      scoreB,
    });
  }

  await updateStaffHistory('REFEREE', refereeId, match.id, 'REMOVE');
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, targetStaffName: refereeName || `<@${refereeId}>` };
}