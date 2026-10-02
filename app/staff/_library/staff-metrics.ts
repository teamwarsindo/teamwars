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
  performNum: number;
  gpmNum: number;
  favTeam: string;
  calculatedFee: number;
}

export interface ComputedStreamerItem extends StreamerData {
  cumulativeHistory: any[];
  cumulativeActive: any[];
  matchCount: number;
  totalGames: number;
  performNum: number;
  gpmNum: number;
  favTeam: string;
  primaryPlatform: string;
}

interface TeamStatTracker {
  name: string;
  matches: number;
  wins: number;
  pointsConceded: number;
}

/**
 * Tie-Breaker 4 Tingkat Tim Favorit: Match -> Menang Terbanyak -> Kalah Tersedikit -> Abjad
 */
function determineFavoriteTeam(matches: any[]): string {
  const teamStats = new Map<string, TeamStatTracker>();

  matches.forEach((m) => {
    const aName = m.teamAName;
    const bName = m.teamBName;
    const sA = m.scoreA ?? 0;
    const sB = m.scoreB ?? 0;

    if (aName) {
      const cur = teamStats.get(aName) || { name: aName, matches: 0, wins: 0, pointsConceded: 0 };
      cur.matches += 1;
      if (sA > sB) cur.wins += 1;
      cur.pointsConceded += sB;
      teamStats.set(aName, cur);
    }

    if (bName) {
      const cur = teamStats.get(bName) || { name: bName, matches: 0, wins: 0, pointsConceded: 0 };
      cur.matches += 1;
      if (sB > sA) cur.wins += 1;
      cur.pointsConceded += sA;
      teamStats.set(bName, cur);
    }
  });

  if (teamStats.size === 0) return '-';

  const sortedTeams = Array.from(teamStats.values()).sort((a, b) => {
    if (b.matches !== a.matches) return b.matches - a.matches;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.pointsConceded !== b.pointsConceded) return a.pointsConceded - b.pointsConceded;
    return a.name.localeCompare(b.name);
  });

  const best = sortedTeams[0];
  return `${best.name} (${best.matches}x)`;
}

/**
 * Urutkan riwayat match dari yang terbaru: Pekan terbaru -> Tanggal/Waktu terbaru -> ID terbesar
 */
export function sortMatchesDescending(matches: any[]) {
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

    const favTeam = determineFavoriteTeam(cumulativeMatches);
    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;
    const feePerMatch = ref.payroll?.feePerMatch ?? 25000;
    const calculatedFee = matchCount * feePerMatch;

    // Attendance Rate berbasis pekan unik bertugas (Maksimal 100%)
    const safeWeekDenominator = Math.max(1, selectedWeekNum);
    const performNum = Math.min(100, Math.round((uniqueWeeks.size / safeWeekDenominator) * 100));

    return {
      ...ref,
      cumulativeMatches,
      matchCount,
      totalGames,
      performNum,
      gpmNum,
      favTeam,
      calculatedFee,
    };
  });

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

    const favTeam = determineFavoriteTeam(cumulativeHistory);
    const gpmNum = matchCount > 0 ? Number((totalGames / matchCount).toFixed(1)) : 0.0;

    let primaryPlatform = 'YouTube';
    let maxPlat = 0;
    platformCounts.forEach((count, plat) => {
      if (count > maxPlat) {
        maxPlat = count;
        primaryPlatform = plat;
      }
    });

    // Attendance Rate siaran berbasis pekan unik aktif (Maksimal 100%)
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
      favTeam,
      primaryPlatform,
    };
  });

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
