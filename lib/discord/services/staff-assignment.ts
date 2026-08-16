import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  sendOrUpdateRefereeAssignmentLog,
  sendOrUpdateStreamerAssignmentLog,
  sendCompletedAssignmentLog,
  sendOfficialScoreLog,
} from '@/lib/discord/messages/assignment-log';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function resolveTeamEmoji(teamData: any): string | undefined {
  if (!teamData) return undefined;

  const directTag = teamData.discordEmoji || teamData.emojiTag || teamData.emoji;
  if (typeof directTag === 'string' && directTag.startsWith('<:') && directTag.endsWith('>')) {
    return directTag;
  }

  const emojiId = teamData.discordEmojiId || teamData.emojiId;
  if (emojiId) {
    const rawCode = teamData.kodeTim || teamData.abbreviation || teamData.tag || 'team';
    const cleanName = rawCode.replace(/\s+/g, '');
    return `<:${cleanName}:${emojiId}>`;
  }

  return undefined;
}

async function updateStaffHistory(
  type: 'REFEREE' | 'STREAMER',
  staffId: string,
  matchId: string,
  action: 'ADD' | 'REMOVE'
) {
  const kvKey = type === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const idx = staffList.findIndex((s) => s.discordId === staffId);

  if (idx !== -1) {
    const history = new Set(staffList[idx].assignMatch || []);
    if (action === 'ADD') {
      history.add(matchId);
    } else {
      history.delete(matchId);
    }
    staffList[idx].assignMatch = Array.from(history);
    await kv.set(kvKey, staffList);
  }
}

/**
 * EXECUTE ASSIGN STAFF (/assign)
 */
export async function executeAssignStaff(params: {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  targetStaffId: string;
}) {
  const { matchId, assignType, targetStaffId } = params;

  if (!isValidSnowflake(targetStaffId)) {
    throw new Error('ID Staf tidak valid! Staf harus berupa akun Discord asli agar bisa di-tag.');
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di Redis KV');

  const match = schedules[idx];

  const kvKey = assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const staffObj = staffList.find((s) => s.discordId === targetStaffId);

  const staffDisplayName = staffObj?.discordName || targetStaffId;

  if (assignType === 'REFEREE') {
    match.referee = staffDisplayName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = staffDisplayName;
    match.streamerDiscordId = targetStaffId;
  }

  if (!isValidSnowflake(match.refereeDiscordId)) {
    match.referee = undefined;
    match.refereeDiscordId = undefined;
  }
  if (!isValidSnowflake(match.streamerDiscordId)) {
    match.streamer = undefined;
    match.streamerDiscordId = undefined;
  }

  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);

  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  const kodeTimA = teamA?.kodeTim || teamA?.abbreviation || slugA.toUpperCase();
  const kodeTimB = teamB?.kodeTim || teamB?.abbreviation || slugB.toUpperCase();
  const roleAId = teamA?.discordRoleId || teamA?.roleId || '';
  const roleBId = teamB?.discordRoleId || teamB?.roleId || '';
  const calculatedWeek = (match as any).weekName || `Week ${(match as any).calculatedWeekNumber || 1}`;

  const teamAEmoji = resolveTeamEmoji(teamA);
  const teamBEmoji = resolveTeamEmoji(teamB);

  const guildId = DISCORD_CONFIG.GUILD_ID;

  if (guildId && isValidSnowflake(targetStaffId)) {
    if (assignType === 'REFEREE') {
      if (isValidSnowflake(roleAId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleAId}`, 'PUT').catch(() => null);
      }
      if (isValidSnowflake(roleBId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleBId}`, 'PUT').catch(() => null);
      }
    }
    if (assignType === 'STREAMER' && (match as any).discordChannelId) {
      await discordAPI(`/channels/${(match as any).discordChannelId}/permissions/${targetStaffId}`, 'PUT', {
        type: 1,
        allow: '66560',
        deny: '0',
      }).catch(() => null);
    }
  }

  // Kirim / Update Embed Opening di Channel Match saat Assign
  const finalRefereeMention = isValidSnowflake(match.refereeDiscordId) ? `<@${match.refereeDiscordId}>` : undefined;
  const finalStreamerMention = isValidSnowflake(match.streamerDiscordId) ? `<@${match.streamerDiscordId}>` : undefined;

  if ((match as any).discordChannelId) {
    const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
      channelId: (match as any).discordChannelId,
      matchId: match.id,
      groupName: match.groupName,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAEmoji,
      teamBEmoji,
      kodeTimA,
      kodeTimB,
      roleAId,
      roleBId,
      weekName: calculatedWeek,
      matchDateIso: match.matchDate,
      refereeName: finalRefereeMention,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: finalStreamerMention,
      streamerDiscordId: match.streamerDiscordId,
      streamLink: match.streamLink,
      existingMsgId: (match as any).openingMsgId,
      isFinished: false,
    });

    if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
  }

  // Kirim Log Assign ke #CH_ASSIGN
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  if (chAssign) {
    const logParams = {
      channelId: chAssign,
      matchId: match.id,
      weekName: calculatedWeek,
      groupName: match.groupName,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAEmoji,
      teamBEmoji,
      matchChannelId: (match as any).discordChannelId,
      matchDateIso: match.matchDate,
      staffName: `<@${targetStaffId}>`,
      staffDiscordId: targetStaffId,
      existingMsgId: assignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId,
    };

    const newLogMsgId =
      assignType === 'REFEREE'
        ? await sendOrUpdateRefereeAssignmentLog(logParams)
        : await sendOrUpdateStreamerAssignmentLog(logParams);

    if (newLogMsgId) {
      if (assignType === 'REFEREE') (match as any).refereeLogMsgId = newLogMsgId;
      else (match as any).streamerLogMsgId = newLogMsgId;
    }
  }

  await updateStaffHistory(assignType, targetStaffId, match.id, 'ADD');
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, staffName: staffDisplayName };
}

/**
 * EXECUTE UNASSIGN STAFF (/unassign)
 */
export async function executeUnassignStaff(params: {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  scoreA?: number;
  scoreB?: number;
  streamLink?: string;
}) {
  const { matchId, assignType, scoreA = 0, scoreB = 0, streamLink } = params;

  if (assignType === 'STREAMER' && (!streamLink || !streamLink.trim().startsWith('http'))) {
    throw new Error('Link streaming (YouTube/Twitch) yang valid wajib disertakan saat unassign Streamer!');
  }

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di Redis KV');

  const match = schedules[idx];
  const targetStaffId = assignType === 'REFEREE' ? match.refereeDiscordId : match.streamerDiscordId;
  const targetStaffName = assignType === 'REFEREE' ? match.referee : match.streamer;

  if (!targetStaffId || !isValidSnowflake(targetStaffId)) {
    throw new Error(`Tidak ada ${assignType === 'REFEREE' ? 'Referee' : 'Streamer'} ber-ID valid yang terdaftar di match ini.`);
  }

  const slugA = getTeamSlug(match.teamAName);
  const slugB = getTeamSlug(match.teamBName);

  const [teamA, teamB] = await Promise.all([
    kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
    kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
  ]);

  const roleAId = teamA?.discordRoleId || teamA?.roleId || '';
  const roleBId = teamB?.discordRoleId || teamB?.roleId || '';
  const calculatedWeek = (match as any).weekName || `Week ${(match as any).calculatedWeekNumber || 1}`;

  const teamAEmoji = resolveTeamEmoji(teamA);
  const teamBEmoji = resolveTeamEmoji(teamB);

  const guildId = DISCORD_CONFIG.GUILD_ID;
  const matchChannelId = (match as any).discordChannelId;

  // 1. Cabut Role / Izin Akses Channel Discord
  if (guildId && isValidSnowflake(targetStaffId)) {
    if (assignType === 'REFEREE') {
      if (isValidSnowflake(roleAId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
      }
      if (isValidSnowflake(roleBId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
      }

      if (matchChannelId) {
        if (isValidSnowflake(roleAId)) {
          await discordAPI(`/channels/${matchChannelId}/permissions/${roleAId}`, 'DELETE').catch(() => null);
        }
        if (isValidSnowflake(roleBId)) {
          await discordAPI(`/channels/${matchChannelId}/permissions/${roleBId}`, 'DELETE').catch(() => null);
        }
      }
    }

    if (assignType === 'STREAMER' && matchChannelId) {
      await discordAPI(`/channels/${matchChannelId}/permissions/${targetStaffId}`, 'DELETE').catch(() => null);
    }
  }

  // 2. Simpan Data Baru ke KV (Tanpa sentuh/post ulang opening embed)
  if (streamLink) {
    match.streamLink = streamLink.trim();
  }

  if (assignType === 'REFEREE') {
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.isFinished = true;
    match.refereeDiscordId = undefined; // Cabut ID Discord agar tidak ada tag aktif
  } else {
    match.streamerDiscordId = undefined; // Cabut ID Discord streamer
  }

  // 3. Kirim Log Selesai ke #CH_ASSIGN
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  const targetLogMsgId = assignType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;

  if (chAssign && targetLogMsgId) {
    await sendCompletedAssignmentLog({
      channelId: chAssign,
      existingMsgId: targetLogMsgId,
      roleType: assignType,
      staffDiscordId: targetStaffId,
      matchId: match.id,
      groupName: match.groupName,
      weekName: calculatedWeek,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      teamAEmoji,
      teamBEmoji,
      matchDateIso: match.matchDate,
      scoreA,
      scoreB,
      streamLink: match.streamLink,
    });
  }

  // 4. HANYA REFEREE: Kirim Score Log ke #CH_SCORE
  if (assignType === 'REFEREE') {
    const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
    if (chScore) {
      await sendOfficialScoreLog({
        channelId: chScore,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        teamAEmoji,
        teamBEmoji,
        scoreA,
        scoreB,
      });
    }
  }

  // 5. Hapus dari riwayat penugasan aktif staf di KV & simpan match
  await updateStaffHistory(assignType, targetStaffId, match.id, 'REMOVE');
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, targetStaffName: targetStaffName || `<@${targetStaffId}>`, targetStaffId };
}
