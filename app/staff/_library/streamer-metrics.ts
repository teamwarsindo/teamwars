import { StreamerData } from '../_components/streamer-tab';
import {
  FinishedScheduleSummary,
  RankChangeInfo,
  determineFavoriteDay,
  sortMatchesDescending,
  computeStaffRanking,
  calculateRankFluctuation,
  RankableStaff,
} from './staff-metrics';

export interface ComputedStreamerItem extends StreamerData {
  cumulativeHistory: any[];
  cumulativeActive: any[];
  matchCount: number;
  totalGames: number;
  performNum: number;
  gpmNum: number;
  favDay: string;
  primaryPlatform: string;
  rankChange: RankChangeInfo;
}

/**
 * Kalkulasi performa siaran streamer kumulatif berdasarkan batas pekan aktif
 */
export function calculateStreamerCumulativeMetrics(
  streamers: StreamerData[],
  selectedWeekNum: number,
  finishedSchedules?: FinishedScheduleSummary[]
) {
  let totalTournamentBroadcasts = 0;
  let totalBroadcastGames = 0;

  if (finishedSchedules && finishedSchedules.length > 0) {
    finishedSchedules.forEach((m) => {
      if (Number(m.weekNumber || 1) <= selectedWeekNum && m.hasStream) {
        totalTournamentBroadcasts += 1;
        totalBroadcastGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
      }
    });
  }

  const list: ComputedStreamerItem[] = streamers.map((strm) => {
    const rawHistory = strm.historyMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const cumulativeHistory = sortMatchesDescending(rawHistory);
    const cumulativeActive = strm.activeMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const matchCount = cumulativeHistory.length;
    let totalGames = 0;
    const uniqueWeeks = new Set<number>();
    const platformCounts = new Map<string, number>();

    cumulativeHistory.forEach((m) => {
      const gamesInMatch = (m.scoreA ?? 0) + (m.scoreB ?? 0);
      totalGames += gamesInMatch;

      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      uniqueWeeks.add(wNum);

      if (!finishedSchedules || finishedSchedules.length === 0) {
        totalTournamentBroadcasts += 1;
        totalBroadcastGames += gamesInMatch;
      }

      const plat =
        m.streamPlatform ||
        (m.streamLink?.includes('tiktok') ? 'TikTok' : 'YouTube');
      platformCounts.set(plat, (platformCounts.get(plat) || 0) + 1);
    });

    const favDay = determineFavoriteDay(cumulativeHistory);
    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;

    let primaryPlatform = 'YouTube';
    let maxPlat = 0;
    platformCounts.forEach((count, plat) => {
      if (count > maxPlat) {
        maxPlat = count;
        primaryPlatform = plat;
      }
    });

    const safeWeekDenominator = Math.max(1, selectedWeekNum);
    const performNum = Math.min(100, Math.round((uniqueWeeks.size / safeWeekDenominator) * 100));

    return {
      ...strm,
      cumulativeHistory,
      cumulativeActive,
      matchCount,
      totalGames,
      performNum,
      gpmNum,
      favDay,
      primaryPlatform,
      rankChange: { direction: 'SAME', delta: 0 },
    };
  });

  // Hitung fluktuasi peringkat semantik dibandingkan pekan sebelumnya
  if (selectedWeekNum > 1) {
    const prevWeekStats: RankableStaff[] = streamers.map((strm) => {
      const prevMatches = strm.historyMatches.filter((m) => {
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        return wNum <= selectedWeekNum - 1;
      });
      const pMatchCount = prevMatches.length;
      let pTotalGames = 0;
      const pUniqueWeeks = new Set<number>();

      prevMatches.forEach((m) => {
        pTotalGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        pUniqueWeeks.add(wNum);
      });

      const pGpm = pMatchCount > 0 ? Number((pTotalGames / pMatchCount).toFixed(1)) : 0.0;
      const pPerform = Math.min(100, Math.round((pUniqueWeeks.size / (selectedWeekNum - 1)) * 100));

      return {
        discordId: strm.discordId,
        matchCount: pMatchCount,
        performNum: pPerform,
        gpmNum: pGpm,
        discordName: strm.discordName,
      };
    });

    const prevRankMap = computeStaffRanking(prevWeekStats);
    const curRankMap = computeStaffRanking(list);

    list.forEach((item) => {
      const oldRank = prevRankMap.get(item.discordId);
      const newRank = curRankMap.get(item.discordId);
      item.rankChange = calculateRankFluctuation(oldRank, newRank);
    });
  }

  const baselineGpm =
    totalTournamentBroadcasts > 0
      ? Number((totalBroadcastGames / totalTournamentBroadcasts).toFixed(1))
      : 15.0;

  // Sortir: MATCH -> PERFORM -> GPM -> NAMA ABJAD
  list.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.performNum - a.performNum ||
      b.gpmNum - a.gpmNum ||
      a.discordName.localeCompare(b.discordName)
  );

  return {
    statsList: list,
    baselineGpm,
    totalTournamentBroadcasts,
  };
}
