import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getTeamSlug(teamName: string) {
  return (teamName || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function getTournamentStartDate(): number {
  const startDateStr = process.env.TWI_START_DATE;
  if (!startDateStr) return Date.now();
  return new Date(`${startDateStr}T00:00:00+07:00`).getTime();
}

export function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = getTournamentStartDate();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function getTournamentWeekNumberSafe(): number {
  return getMatchWeekNumber(new Date().toISOString());
}

export async function ensureMatchReportInitialized(match: MatchScheduleItem, weekNumber: number) {
  const existingReport = await kv.hget<any>('twi:match_reports', match.id);

  if (!existingReport) {
    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);
    const matchDateStr = match.matchDate ? match.matchDate.split('T')[0] : '';

    const newReport = {
      matchId: match.id,
      week: weekNumber,
      metadata: {
        date: matchDateStr,
        streamPlatform: (match as any).streamPlatform || 'YouTube',
        streamer: match.streamer || '',
        referee: match.referee || '',
        streamUrl: match.streamLink || (match as any).streamUrl || '',
      },
      teamA: {
        name: match.teamAName,
        slug: slugA,
        score: 0,
        repeatsUsed: 0,
        warningsUsed: 0,
        lineup: [],
      },
      teamB: {
        name: match.teamBName,
        slug: slugB,
        score: 0,
        repeatsUsed: 0,
        warningsUsed: 0,
        lineup: [],
      },
      games: [],
      finalScore: { teamA: 0, teamB: 0 },
      winnerTeam: null,
      isFinished: false,
    };

    await kv.hset('twi:match_reports', { [match.id]: newReport });
  }
}
