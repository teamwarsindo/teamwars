import { REFEREE_PAYROLL_CONFIG } from '@/app/tournament/_library/constants';

export interface MatchDetail {
  id: string;
  matchDate?: string;
  weekNumber?: number;
  weekName?: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
  isFinished?: boolean;
  streamLink?: string | null;
  streamPlatform?: string;
}

export interface BaseStaffData {
  discordId: string;
  discordName: string;
  avatar?: string;
  activeMatches: MatchDetail[];
  historyMatches: MatchDetail[];
  totalFinishedMatches?: number;
  totalBroadcastMatches?: number;
}

export interface FinishedScheduleSummary {
  id: string;
  weekNumber: number;
  scoreA: number;
  scoreB: number;
  hasStream?: boolean;
}

export type RankFluctuationDirection = 'UP' | 'DOWN' | 'SAME';

export interface RankChangeInfo {
  direction: RankFluctuationDirection;
  delta: number;
}

export interface CompactMatchTime {
  dateLine: string;
  timeLine: string;
}

export interface ComputedStaffItem extends BaseStaffData {
  cumulativeHistory: MatchDetail[];
  matchCount: number;
  totalGames: number;
  performNum: number;
  gpmNum: number;
  favDay: string;
  primaryPlatform: string;
  rankChange: RankChangeInfo;
}

const DAY_CYCLE_PRIORITY: Record<number, { name: string; priority: number; isWeekend: boolean }> = {
  3: { name: 'Rabu', priority: 1, isWeekend: false },
  4: { name: 'Kamis', priority: 2, isWeekend: false },
  5: { name: 'Jumat', priority: 3, isWeekend: false },
  6: { name: 'Sabtu', priority: 4, isWeekend: true },
  0: { name: 'Minggu', priority: 5, isWeekend: true },
  1: { name: 'Senin', priority: 6, isWeekend: false },
  2: { name: 'Selasa', priority: 7, isWeekend: false },
};

export function formatMatchDateTimeCompact(dateStr?: string): CompactMatchTime | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
  const dayNum = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit' });
  const monthShort = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', month: 'short' });
  const yearShort = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: '2-digit' });

  const timeFormatted = d
    .toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(':', '.');

  return {
    dateLine: `${dayName}, ${dayNum} ${monthShort} ${yearShort}`,
    timeLine: `${timeFormatted} WIB`,
  };
}

export function determineFavoriteDay(matches: MatchDetail[]): string {
  const dayCounts = new Map<number, number>();

  matches.forEach((m) => {
    if (!m.matchDate) return;
    const d = new Date(m.matchDate);
    if (!isNaN(d.getTime())) {
      const dayIndex = d.getDay();
      dayCounts.set(dayIndex, (dayCounts.get(dayIndex) || 0) + 1);
    }
  });

  if (dayCounts.size === 0) return '-';

  const dayStats = Array.from(dayCounts.entries()).map(([dayIndex, count]) => {
    const meta = DAY_CYCLE_PRIORITY[dayIndex] || { name: 'Rabu', priority: 99, isWeekend: false };
    return {
      count,
      name: meta.name,
      priority: meta.priority,
      category: meta.isWeekend ? 'Weekend' : 'Weekday',
    };
  });

  dayStats.sort((a, b) => b.count - a.count || a.priority - b.priority);
  const best = dayStats[0];
  return `${best.category} - ${best.name} (${best.count}x)`;
}

export function sortMatchesDescending(matches: MatchDetail[]): MatchDetail[] {
  return [...matches].sort((a, b) => {
    const wA = Number(a.weekNumber || String(a.weekName).replace(/\D/g, '') || 1);
    const wB = Number(b.weekNumber || String(b.weekName).replace(/\D/g, '') || 1);
    if (wB !== wA) return wB - wA;

    if (a.matchDate && b.matchDate) {
      const tA = new Date(a.matchDate).getTime();
      const tB = new Date(b.matchDate).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tB !== tA) return tB - tA;
    }

    const idA = Number(String(a.id).replace(/\D/g, '')) || 0;
    const idB = Number(String(b.id).replace(/\D/g, '')) || 0;
    return idB - idA;
  });
}

export function computeStaffRanking(items: Array<{ discordId: string; matchCount: number; performNum: number; gpmNum: number; discordName: string }>): Map<string, number> {
  const sorted = [...items].sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.performNum - a.performNum ||
      b.gpmNum - a.gpmNum ||
      a.discordName.localeCompare(b.discordName)
  );

  const rankMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    rankMap.set(item.discordId, index + 1);
  });
  return rankMap;
}

export function calculateRankFluctuation(oldRank?: number, newRank?: number): RankChangeInfo {
  if (oldRank === undefined || newRank === undefined) return { direction: 'SAME', delta: 0 };
  if (oldRank > newRank) return { direction: 'UP', delta: oldRank - newRank };
  if (oldRank < newRank) return { direction: 'DOWN', delta: newRank - oldRank };
  return { direction: 'SAME', delta: 0 };
}

export function calculateStaffCumulativeMetrics(
  staffList: BaseStaffData[],
  selectedWeekNum: number,
  finishedSchedules: FinishedScheduleSummary[] = [],
  role: 'referee' | 'streamer'
) {
  let totalTournamentMatches = 0;
  let totalTournamentGames = 0;

  finishedSchedules.forEach((m) => {
    if (Number(m.weekNumber || 1) <= selectedWeekNum) {
      if (role === 'streamer' && !m.hasStream) return;
      totalTournamentMatches += 1;
      totalTournamentGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
    }
  });

  const list: ComputedStaffItem[] = staffList.map((st) => {
    const rawMatches = st.historyMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const cumulativeHistory = sortMatchesDescending(rawMatches);
    const matchCount = cumulativeHistory.length;
    let totalGames = 0;
    const uniqueWeeks = new Set<number>();
    const platformCounts = new Map<string, number>();

    cumulativeHistory.forEach((m) => {
      const games = (m.scoreA ?? 0) + (m.scoreB ?? 0);
      totalGames += games;
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      uniqueWeeks.add(wNum);

      if (finishedSchedules.length === 0) {
        totalTournamentMatches += 1;
        totalTournamentGames += games;
      }

      if (role === 'streamer') {
        const plat = m.streamPlatform || (m.streamLink?.includes('tiktok') ? 'TikTok' : 'YouTube');
        platformCounts.set(plat, (platformCounts.get(plat) || 0) + 1);
      }
    });

    const favDay = determineFavoriteDay(cumulativeHistory);
    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;

    let primaryPlatform = 'YouTube';
    let maxPlat = 0;
    platformCounts.forEach((cnt, plat) => {
      if (cnt > maxPlat) {
        maxPlat = cnt;
        primaryPlatform = plat;
      }
    });

    const safeWeekDenom = Math.max(1, selectedWeekNum);
    const performNum = Math.min(100, Math.round((uniqueWeeks.size / safeWeekDenom) * 100));

    return {
      ...st,
      cumulativeHistory,
      matchCount,
      totalGames,
      performNum,
      gpmNum,
      favDay,
      primaryPlatform,
      rankChange: { direction: 'SAME', delta: 0 },
    };
  });

  if (selectedWeekNum > 1) {
    const prevWeekStats = staffList.map((st) => {
      const prevMatches = st.historyMatches.filter((m) => {
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        return wNum <= selectedWeekNum - 1;
      });
      const pCount = prevMatches.length;
      let pGames = 0;
      const pWeeks = new Set<number>();

      prevMatches.forEach((m) => {
        pGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
        pWeeks.add(Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1));
      });

      return {
        discordId: st.discordId,
        matchCount: pCount,
        performNum: Math.min(100, Math.round((pWeeks.size / (selectedWeekNum - 1)) * 100)),
        gpmNum: pCount > 0 ? Number((pGames / pCount).toFixed(1)) : 0.0,
        discordName: st.discordName,
      };
    });

    const prevRank = computeStaffRanking(prevWeekStats);
    const curRank = computeStaffRanking(list);

    list.forEach((item) => {
      item.rankChange = calculateRankFluctuation(prevRank.get(item.discordId), curRank.get(item.discordId));
    });
  }

  const baselineGpm =
    totalTournamentMatches > 0
      ? Number((totalTournamentGames / totalTournamentMatches).toFixed(1))
      : 15.0;

  list.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.performNum - a.performNum ||
      b.gpmNum - a.gpmNum ||
      a.discordName.localeCompare(b.discordName)
  );

  return { statsList: list, baselineGpm };
}