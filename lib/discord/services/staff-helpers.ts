import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

export function getTeamSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

export function resolveTeamEmoji(teamData: any): string | undefined {
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

export function resolveWeekName(match: any): string {
  if (match.weekNumber !== undefined && match.weekNumber !== null) return `Week ${match.weekNumber}`;
  if (match.weekName?.trim()) return match.weekName;
  return 'Week 1';
}

export async function getMatchContext(match: MatchScheduleItem) {
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

export async function updateStaffHistory(type: 'REFEREE' | 'STREAMER', staffId: string, matchId: string, action: 'ADD' | 'REMOVE') {
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