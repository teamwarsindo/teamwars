import { RefereeData, MatchDetail } from '../_components/referee-tab';
import {
  FinishedScheduleSummary,
  RankChangeInfo,
  determineFavoriteDay,
  sortMatchesDescending,
  computeStaffRanking,
  calculateRankFluctuation,
  RankableStaff,
} from './staff-metrics';

export interface ComputedRefereeItem extends RefereeData {
  cumulativeMatches: MatchDetail[];
  matchCount: number;
  totalGames: number;
  performNum: number;
  gpmNum: number;
  favDay: string;
  calculatedFee: number;
  rankChange: RankChangeInfo;
}

/**
 * Kalkulasi performa wasit kumulatif berdasarkan batas pekan aktif
 */
export function calculateRefereeCumulativeMetrics(
  referees: RefereeData[],
  selectedWeekNum: number,
  finishedSchedules?: FinishedScheduleSummary[]
) {
  let tournamentTotalMatches = 0;
  let tournamentTotalGames = 0;

  if (finishedSchedules && finishedSchedules.length > 0) {
    finishedSchedules.forEach((m) => {
      if (Number(m.weekNumber || 1) <= selectedWeekNum) {
        tournamentTotalMatches += 1;
        tournamentTotalGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
      }
    });
  }

  const list: ComputedRefereeItem[] = referees.map((ref) => {
    const rawMatches = ref.historyMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const cumulativeMatches = sortMatchesDescending(rawMatches);
    const matchCount = cumulativeMatches.length;
    let totalGames = 0;
    const uniqueWeeks = new Set<number>();

    cumulativeMatches.forEach((m) => {
      const gamesInMatch = (m.scoreA ?? 0) + (m.scoreB ?? 0);
      totalGames += gamesInMatch;

      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      uniqueWeeks.add(wNum);

      if (!finishedSchedules || finishedSchedules.length === 0) {
        tournamentTotalMatches += 1;
        tournamentTotalGames += gamesInMatch;
      }
    });

    const favDay = determineFavoriteDay(cumulativeMatches);
    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;
    const feePerMatch = ref.payroll?.feePerMatch ?? 25000;
    const calculatedFee = matchCount * feePerMatch;

    const safeWeekDenominator = Math.max(1, selectedWeekNum);
    const performNum = Math.min(100, Math.round((uniqueWeeks.size / safeWeekDenominator) * 100));

    return {
      ...ref,
      cumulativeMatches,
      matchCount,
      totalGames,
      performNum,
      gpmNum,
      favDay,
      calculatedFee,
      rankChange: { direction: 'SAME', delta: 0 },
    };
  });

  // Hitung fluktuasi peringkat semantik dibandingkan pekan sebelumnya
  if (selectedWeekNum > 1) {
    const prevWeekStats: RankableStaff[] = referees.map((ref) => {
      const prevMatches = ref.historyMatches.filter((m) => {
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
        discordId: ref.discordId,
        matchCount: pMatchCount,
        performNum: pPerform,
        gpmNum: pGpm,
        discordName: ref.discordName,
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
    tournamentTotalMatches > 0
      ? Number((tournamentTotalGames / tournamentTotalMatches).toFixed(1))
      : 15.0;

  // Sortir: MATCH -> PERFORM -> GPM -> NAMA ABJAD
  list.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.performNum - a.performNum ||
      b.gpmNum - a.gpmNum ||
      a.discordName.localeCompare(b.discordName)
  );

  return { statsList: list, baselineGpm };
}
