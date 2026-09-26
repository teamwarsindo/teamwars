import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) map[opt.name] = opt.value;
  return map;
}

export function formatMatchSchedule(matchDateStr?: string, matchTimeStr?: string): string {
  if (!matchDateStr) return 'Belum ditentukan';
  try {
    const d = new Date(matchDateStr);
    const dateFormatted = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
    const timeFormatted = matchTimeStr ? ` — ${matchTimeStr.replace(':', '.')} WIB` : '';
    return `${dateFormatted}${timeFormatted}`;
  } catch {
    return matchDateStr + (matchTimeStr ? ` — ${matchTimeStr} WIB` : '');
  }
}

export async function resolveMatchFromChannel(channelId: string) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const currentMatch = schedules.find((m) => m.discordChannelId === channelId);
  if (currentMatch) return currentMatch;

  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.matchChannel?.channelId === channelId) {
      return schedules.find((m) => m.id === matchId) || null;
    }
  }
  return null;
}

export async function getTeamEmojiByMatch(match: any, teamKey: 'A' | 'B', teamSlugOrName?: string): Promise<string> {
  const rawTarget =
    teamKey === 'A'
      ? match?.teamAId || match?.teamA || match?.teamASlug || teamSlugOrName
      : match?.teamBId || match?.teamB || match?.teamBSlug || teamSlugOrName;

  if (!rawTarget) return '⚔️';

  const slug = String(rawTarget)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  try {
    const teamData = await kv.hgetall<Record<string, any>>(`teams:${slug}`);
    if (teamData) {
      if (teamData.emoji) return teamData.emoji;
      if (teamData.emojiId) {
        const code = teamData.kodeTim || teamData.slug || slug;
        return `<:${code}:${teamData.emojiId}>`;
      }
    }
  } catch (err) {
    console.error(`Gagal mengambil emoji teams:${slug}:`, err);
  }

  if (teamKey === 'A' && match?.teamAEmoji) return match.teamAEmoji;
  if (teamKey === 'B' && match?.teamBEmoji) return match.teamBEmoji;

  return '⚔️';
}

export function resolveStreamDisplay(match: any, reportData?: any): { streamerDisplay: string; streamUrlDisplay: string } {
  const meta = reportData?.metadata || {};
  const streamerId = match?.streamerDiscordId || meta.streamerDiscordId;
  const streamerName = match?.streamer || match?.streamerName || meta.streamer;
  const streamUrl = match?.streamLink || meta.streamUrl || meta.streamLink;

  let streamerDisplay = '-';
  if (streamerId) {
    streamerDisplay = `<@${streamerId}>`;
  } else if (streamerName && String(streamerName).trim() !== '') {
    streamerDisplay = streamerName;
  }

  let streamUrlDisplay = 'Sharescreen Pemain';
  if (streamUrl && typeof streamUrl === 'string' && streamUrl.trim() !== '') {
    const cleanUrl = streamUrl.trim();
    if (cleanUrl.includes('tiktok.com')) {
      streamUrlDisplay = `[TikTok Live](${cleanUrl})`;
    } else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      streamUrlDisplay = `[YouTube Live](${cleanUrl})`;
    } else {
      streamUrlDisplay = `[Live Streaming](${cleanUrl})`;
    }
  }

  return { streamerDisplay, streamUrlDisplay };
}

export function hasPlayerPhysicalWin(games: any[], playerIgn: string, archetype?: string): boolean {
  return games.some((g) => {
    if (g.isDeckloss) return false;
    const isA =
      g.playerA?.ign?.toLowerCase() === playerIgn.toLowerCase() &&
      (!archetype || g.playerA?.archetype?.toLowerCase() === archetype.toLowerCase());
    const isB =
      g.playerB?.ign?.toLowerCase() === playerIgn.toLowerCase() &&
      (!archetype || g.playerB?.archetype?.toLowerCase() === archetype.toLowerCase());
    return (isA && g.winner === 'teamA') || (isB && g.winner === 'teamB');
  });
}
