import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';
import { StaffItem, MatchContextResult, BaseLogPayload } from './types';

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

function getTeamSlug(name: string): string {
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

export async function getMatchContext(match: MatchScheduleItem): Promise<MatchContextResult> {
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
    campChannelAId: teamA?.discordChannelId || teamA?.campChannelId || teamA?.channelId || '',
    campChannelBId: teamB?.discordChannelId || teamB?.campChannelId || teamB?.channelId || '',
    teamAEmoji: resolveTeamEmoji(teamA),
    teamBEmoji: resolveTeamEmoji(teamB),
    calculatedWeek: resolveWeekName(match),
  };
}

export function buildBaseLogPayload(
  match: MatchScheduleItem,
  ctx: MatchContextResult,
  matchChannelId?: string
): BaseLogPayload {
  return {
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
}

export async function updateStaffHistory(
  type: 'REFEREE' | 'STREAMER',
  staffId: string,
  matchId: string,
  action: 'ADD' | 'REMOVE'
): Promise<void> {
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

export async function grantStaffPermissions(params: {
  type: 'REFEREE' | 'STREAMER';
  staffId: string;
  matchChannelId?: string;
  roleAId?: string;
  roleBId?: string;
}): Promise<void> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;
  const { type, staffId, matchChannelId, roleAId, roleBId } = params;

  if (!guildId || !isValidSnowflake(staffId)) return;

  const tasks: Promise<any>[] = [];

  if (type === 'REFEREE') {
    if (isValidSnowflake(roleAId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleAId}`, 'PUT'));
    }
    if (isValidSnowflake(roleBId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleBId}`, 'PUT'));
    }
    if (matchChannelId && isValidSnowflake(rolePengawas)) {
      tasks.push(
        discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'PUT', {
          type: 0,
          allow: '66560',
          deny: '0',
        })
      );
    }
  } else if (matchChannelId) {
    tasks.push(
      discordAPI(`/channels/${matchChannelId}/permissions/${staffId}`, 'PUT', {
        type: 1,
        allow: '66560',
        deny: '0',
      })
    );
  }

  await Promise.all(tasks).catch(() => null);
}

export async function revokeStaffPermissions(params: {
  type: 'REFEREE' | 'STREAMER';
  staffId: string;
  matchChannelId?: string;
  roleAId?: string;
  roleBId?: string;
}): Promise<void> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;
  const { type, staffId, matchChannelId, roleAId, roleBId } = params;

  if (!guildId || !isValidSnowflake(staffId)) return;

  const tasks: Promise<any>[] = [];

  if (type === 'REFEREE') {
    if (isValidSnowflake(roleAId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleAId}`, 'DELETE'));
    }
    if (isValidSnowflake(roleBId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleBId}`, 'DELETE'));
    }
    if (matchChannelId && isValidSnowflake(rolePengawas)) {
      tasks.push(discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'DELETE'));
    }
  } else if (matchChannelId) {
    tasks.push(discordAPI(`/channels/${matchChannelId}/permissions/${staffId}`, 'DELETE'));
  }

  await Promise.all(tasks).catch(() => null);
}