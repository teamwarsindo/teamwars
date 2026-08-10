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

/**
 * Helper Resolusi Tag Emoji dari KV Store TWI
 */
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

/**
 * Helper Update Riwayat Penugasan Staff di KV Store
 */
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

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di Redis KV');

  const match = schedules[idx];

  const kvKey = assignType === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
  const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];
  const staffObj = staffList.find((s) => s.discordId === targetStaffId);
  const staffName = staffObj?.discordName || `<@${targetStaffId}>`;

  if (assignType === 'REFEREE') {
    match.referee = staffName;
    match.refereeDiscordId = targetStaffId;
  } else {
    match.streamer = staffName;
    match.streamerDiscordId = targetStaffId;
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
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: match.streamerDiscordI,
      streamLink: match.streamLink,
      existingMsgId: (match as any).openingMsgId,
      isCompleted: false,
    });

    if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
  }

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
      staffName,
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

  return { match, staffName };
}

/**
 * EXECUTE UNASSIGN STAFF (/unassign)
 */
export async function executeUnassignStaff(params: {
  matchId: string;
  assignType: 'REFEREE' | 'STREAMER';
  scoreA?: number;
  scoreB?: number;
}) {
  const { matchId, assignType, scoreA = 0, scoreB = 0 } = params;

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const idx = schedules.findIndex((m) => m.id === matchId);
  if (idx === -1) throw new Error('Match tidak ditemukan di Redis KV');

  const match = schedules[idx];
  const targetStaffId = assignType === 'REFEREE' ? match.refereeDiscordId : (match.streamerDiscordId);
  const targetStaffName = assignType === 'REFEREE' ? match.referee : match.streamer;

  if (!targetStaffId) {
    throw new Error(`Tidak ada ${assignType === 'REFEREE' ? 'Referee' : 'Streamer'} terdaftar di match ini.`);
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
  const matchChannelId = (match as any).discordChannelId;

  // 1. Cabut Role / Akses Discord
  if (guildId && isValidSnowflake(targetStaffId)) {
    if (assignType === 'REFEREE') {
      // Cabut Role Tim dari akun Referee
      if (isValidSnowflake(roleAId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleAId}`, 'DELETE').catch(() => null);
      }
      if (isValidSnowflake(roleBId)) {
        await discordAPI(`/guilds/${guildId}/members/${targetStaffId}/roles/${roleBId}`, 'DELETE').catch(() => null);
      }

      // 🎯 CABUT AKSES ROLE TIM A & TIM B DARI CHANNEL MATCH PERTANDINGAN
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

  // 2. HANYA REFEREE: Update Opening Embed di Match Channel
  if (assignType === 'REFEREE') {
    (match as any).scoreA = scoreA;
    (match as any).scoreB = scoreB;
    (match as any).isCompleted = true;

    if (matchChannelId) {
      const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
        channelId: matchChannelId,
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
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.streamerDiscordId,
        streamLink: match.streamLink,
        existingMsgId: (match as any).openingMsgId,
        isCompleted: true,
        scoreA,
        scoreB,
      });

      if (newOpeningMsgId) (match as any).openingMsgId = newOpeningMsgId;
    }
  }

  // 3. Send Reply Log ke #CH_ASSIGN
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

  // 4. HANYA REFEREE: Send Embed Score ke #CH_SCORE
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

  // 5. Reset ID Discord dari objek match agar tidak dianggap busy
  if (assignType === 'REFEREE') {
    match.refereeDiscordId = undefined;
  } else {
    match.streamerDiscordId = undefined; di 
  }

  // Simpan Schedule & Lepas Staff History
  await updateStaffHistory(assignType, targetStaffId, match.id, 'REMOVE');
  schedules[idx] = match;
  await kv.set('twi:schedules', schedules);

  return { match, targetStaffName, targetStaffId };
}
