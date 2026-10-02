import { RefereeData, MatchDetail } from '../_components/referee-tab';
import { StreamerData } from '../_components/streamer-tab';

export interface FinishedScheduleSummary {
  id: string;
  weekNumber: number;
  scoreA: number;
  scoreB: number;
  hasStream?: boolean;
}

export interface ComputedRefereeItem extends RefereeData {
  cumulativeMatches: MatchDetail[];
  matchCount: number;
  totalGames: number;
  ratioNum: number;
  gpmNum: number;
  favTeam: string;
}

export interface ComputedStreamerItem extends StreamerData {
  cumulativeHistory: any[];
  cumulativeActive: any[];
  matchCount: number;
  ratioNum: number;
  coverageNum: number;
  favTeam: string;
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
    const cumulativeMatches = ref.historyMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const matchCount = cumulativeMatches.length;
    let totalGames = 0;
    const teamFrequencyMap = new Map<string, number>();

    cumulativeMatches.forEach((m) => {
      const gamesInMatch = (m.scoreA ?? 0) + (m.scoreB ?? 0);
      totalGames += gamesInMatch;

      if (!finishedSchedules || finishedSchedules.length === 0) {
        tournamentTotalMatches += 1;
        tournamentTotalGames += gamesInMatch;
      }

      if (m.teamAName) teamFrequencyMap.set(m.teamAName, (teamFrequencyMap.get(m.teamAName) || 0) + 1);
      if (m.teamBName) teamFrequencyMap.set(m.teamBName, (teamFrequencyMap.get(m.teamBName) || 0) + 1);
    });

    let favTeam = '-';
    let maxFreq = 0;
    teamFrequencyMap.forEach((freq, tName) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        favTeam = `${tName} (${freq}x)`;
      }
    });

    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;
    const ratioNum = Number((matchCount / Math.max(1, selectedWeekNum)).toFixed(1));

    return {
      ...ref,
      cumulativeMatches,
      matchCount,
      totalGames,
      ratioNum,
      gpmNum,
      favTeam,
    };
  });

  const baselineRatio =
    referees.length > 0
      ? Number((tournamentTotalMatches / (Math.max(1, selectedWeekNum) * referees.length)).toFixed(1))
      : 1.0;

  const baselineGpm =
    tournamentTotalMatches > 0
      ? Number((tournamentTotalGames / tournamentTotalMatches).toFixed(1))
      : 15.0;

  // Urutkan: MATCH (Desc) -> RATIO (Desc) -> GAME (Desc) -> GPM (Desc)
  list.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.ratioNum - a.ratioNum ||
      b.totalGames - a.totalGames ||
      b.gpmNum - a.gpmNum
  );

  return { statsList: list, baselineRatio, baselineGpm };
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

  if (finishedSchedules && finishedSchedules.length > 0) {
    finishedSchedules.forEach((m) => {
      if (Number(m.weekNumber || 1) <= selectedWeekNum && m.hasStream) {
        totalTournamentBroadcasts += 1;
      }
    });
  }

  const list: ComputedStreamerItem[] = streamers.map((strm) => {
    const cumulativeHistory = strm.historyMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const cumulativeActive = strm.activeMatches.filter((m) => {
      const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      return wNum <= selectedWeekNum;
    });

    const matchCount = cumulativeHistory.length;
    if (!finishedSchedules || finishedSchedules.length === 0) {
      totalTournamentBroadcasts += matchCount;
    }

    const teamFrequencyMap = new Map<string, number>();
    cumulativeHistory.forEach((m) => {
      if (m.teamAName) teamFrequencyMap.set(m.teamAName, (teamFrequencyMap.get(m.teamAName) || 0) + 1);
      if (m.teamBName) teamFrequencyMap.set(m.teamBName, (teamFrequencyMap.get(m.teamBName) || 0) + 1);
    });

    let favTeam = '-';
    let maxFreq = 0;
    teamFrequencyMap.forEach((freq, tName) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        favTeam = `${tName} (${freq}x)`;
      }
    });

    const ratioNum = Number((matchCount / Math.max(1, selectedWeekNum)).toFixed(1));

    return {
      ...strm,
      cumulativeHistory,
      cumulativeActive,
      matchCount,
      ratioNum,
      coverageNum: 0,
      favTeam,
    };
  });

  list.forEach((item) => {
    item.coverageNum =
      totalTournamentBroadcasts > 0
        ? Math.round((item.matchCount / totalTournamentBroadcasts) * 100)
        : 0;
  });

  const baselineRatio =
    streamers.length > 0
      ? Number((totalTournamentBroadcasts / (Math.max(1, selectedWeekNum) * streamers.length)).toFixed(1))
      : 1.0;

  const baselineCoverage = streamers.length > 0 ? Math.round(100 / streamers.length) : 10;

  // Urutkan: MATCH (Desc) -> RATIO (Desc) -> COVERAGE (Desc)
  list.sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.ratioNum - a.ratioNum ||
      b.coverageNum - a.coverageNum
  );

  return {
    statsList: list,
    baselineRatio,
    baselineCoverage,
    totalTournamentBroadcasts,
  };
}
