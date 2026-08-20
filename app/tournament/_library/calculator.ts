import { MatchScheduleItem, TeamStandingItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { getWibDateKey, getMatchWeekNumber, getCurrentServerWeek } from "./utils";

export interface ExtendedStandingItem extends TeamStandingItem {
  isTopGroup?: boolean;
  groupColor?: "GROUP_A" | "GROUP_B";
  customRankLabel?: string;
  rankTrend?: "up" | "down" | "stay";
}

export interface QualificationStatus {
  rankLabel: string;   // "#1 Group" | "#1 Wildcard" | "#10 Wildcard"
  stageLabel: string;  // "Quarter" | "Play-Ins" | "Eliminasi"
  isQualified: boolean; // true = Hijau, false = Merah
}

export interface MatchHistoryCardItem {
  id: string;
  week: number;
  isWin: boolean;
  myScore: number;
  oppScore: number;
  oppName: string;
  oppLogo: string;
  reportLink?: string;
}

export interface TeamComparisonStats {
  teamName: string;
  teamLogo: string;
  teamColor?: string;
  groupName: string;
  isGroupA: boolean;
  rank: number | string;
  divRank: number;
  wildcardRank: number | null;
  qualification: QualificationStatus;
  matchPlayed: number;
  matchWins: number;
  matchLosses: number;
  setWins: number;
  rawDiff: number;
  roundDifference: string;
  ptsDiffRate: number;
  ptsDiffRateLabel: string;
  winRate: number;
  form: ("W" | "L")[];
  streak: ("W" | "L")[];
  history: MatchHistoryCardItem[];
}

export function getTournamentWeekNumber(dateString?: string): number {
  return dateString ? getMatchWeekNumber(dateString) : getCurrentServerWeek();
}

/**
 * 1. STANDINGS CALCULATOR
 */
export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  maxWeek?: number
): ExtendedStandingItem[] {
  const filtered = typeof maxWeek === "number" && maxWeek > 0
    ? schedules.filter((m) => (m.weekNumber || 1) <= maxWeek)
    : schedules;

  const teamMap = new Map<string, ExtendedStandingItem>();
  const formMap = new Map<string, { date: string; res: "W" | "L" }[]>();

  masterTeams.forEach((t) => {
    if (!t) return;
    const name = t.name || t.teamName || "";
    if (!name) return;

    teamMap.set(name.toLowerCase(), {
      rank: 1,
      teamId: t.id || name,
      teamName: name,
      teamLogo: t.logo || t.teamLogo || "/logo.webp",
      teamColor: t.color || t.primaryColor || t.teamColor || undefined,
      groupName: t.groupName === "Group A" || t.groupName === DIVISION_MAP.GROUP_A ? DIVISION_MAP.GROUP_A : DIVISION_MAP.GROUP_B,
      matchPlayed: 0, matchWins: 0, matchLosses: 0, setWins: 0, setLosses: 0, roundDifference: 0, points: 0, form: [],
    });
    formMap.set(name.toLowerCase(), []);
  });

  const sortedMatches = [...filtered].sort((a, b) => new Date(a.matchDate || 0).getTime() - new Date(b.matchDate || 0).getTime());

  sortedMatches.forEach((m) => {
    const sA = Number(m.scoreA) || 0;
    const sB = Number(m.scoreB) || 0;
    if (!m.isFinished && sA === 0 && sB === 0) return;
    if (!m.teamAName || !m.teamBName) return;

    const kA = m.teamAName.toLowerCase();
    const kB = m.teamBName.toLowerCase();

    if (!teamMap.has(kA)) {
      teamMap.set(kA, { rank: 1, teamId: m.teamAId || m.teamAName, teamName: m.teamAName, teamLogo: m.teamALogo || "/logo.webp", teamColor: m.teamAColor, groupName: m.groupName || DIVISION_MAP.GROUP_A, matchPlayed: 0, matchWins: 0, matchLosses: 0, setWins: 0, setLosses: 0, roundDifference: 0, points: 0, form: [] });
      formMap.set(kA, []);
    }
    if (!teamMap.has(kB)) {
      teamMap.set(kB, { rank: 1, teamId: m.teamBId || m.teamBName, teamName: m.teamBName, teamLogo: m.teamBLogo || "/logo.webp", teamColor: m.teamBColor, groupName: m.groupName || DIVISION_MAP.GROUP_B, matchPlayed: 0, matchWins: 0, matchLosses: 0, setWins: 0, setLosses: 0, roundDifference: 0, points: 0, form: [] });
      formMap.set(kB, []);
    }

    const tA = teamMap.get(kA)!;
    const tB = teamMap.get(kB)!;

    tA.matchPlayed++; tB.matchPlayed++;
    tA.setWins += sA; tA.setLosses += sB;
    tB.setWins += sB; tB.setLosses += sA;
    tA.roundDifference += sA - sB;
    tB.roundDifference += sB - sA;

    if (sA > sB) {
      tA.matchWins++; tA.points++; tB.matchLosses++;
      formMap.get(kA)!.push({ date: m.matchDate, res: "W" });
      formMap.get(kB)!.push({ date: m.matchDate, res: "L" });
    } else if (sB > sA) {
      tB.matchWins++; tB.points++; tA.matchLosses++;
      formMap.get(kB)!.push({ date: m.matchDate, res: "W" });
      formMap.get(kA)!.push({ date: m.matchDate, res: "L" });
    }
  });

  teamMap.forEach((t, k) => { t.form = (formMap.get(k) || []).map((f) => f.res); });

  const sortTeams = (list: ExtendedStandingItem[]) =>
    list.sort((a, b) => b.points - a.points || b.matchWins - a.matchWins || b.roundDifference - a.roundDifference || b.setWins - a.setWins || a.teamName.localeCompare(b.teamName));

  const all = Array.from(teamMap.values());
  const grpA = sortTeams(all.filter((t) => t.groupName === DIVISION_MAP.GROUP_A)).map((t, i) => ({ ...t, rank: i + 1 }));
  const grpB = sortTeams(all.filter((t) => t.groupName === DIVISION_MAP.GROUP_B)).map((t, i) => ({ ...t, rank: i + 1 }));

  return [...grpA, ...grpB];
}

/**
 * 2. GLOBAL STANDINGS BUILDER
 */
export function buildGlobalStandings(standings: ExtendedStandingItem[] = []) {
  if (!standings.length) return [];
  const topA = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A).slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({ ...t, isTopGroup: true, groupColor: "GROUP_A" as const, customRankLabel: `Top ${i + 1}` }));
  const topB = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B).slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({ ...t, isTopGroup: true, groupColor: "GROUP_B" as const, customRankLabel: `Top ${i + 1}` }));

  const topNames = new Set([...topA, ...topB].map((t) => t.teamName));
  const remaining = standings.filter((t) => !topNames.has(t.teamName))
    .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.matchWins || 0) - (a.matchWins || 0) || (b.roundDifference || 0) - (a.roundDifference || 0) || (b.setWins || 0) - (a.setWins || 0))
    .map((t, i) => ({ ...t, rank: i + 1, isTopGroup: false, groupColor: (t.groupName === DIVISION_MAP.GROUP_A ? "GROUP_A" : "GROUP_B") as "GROUP_A" | "GROUP_B", customRankLabel: `${i + 1}` }));

  return [...topA, ...topB, ...remaining].map((t, i) => ({ ...t, globalRank: i + 1 }));
}

/**
 * 3. QUALIFICATION RESOLVER (Satu Fungsi Terpadu Penentu Status)
 */
export function getTeamQualification(teamName: string, standings: ExtendedStandingItem[] = []): { qual: QualificationStatus; wildcardRank: number | null; divRank: number } {
  const clean = teamName.toLowerCase().trim();
  const t = standings.find((s) => s?.teamName?.toLowerCase().trim() === clean);
  const divRank = t?.rank ?? 1;

  if (divRank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
    return {
      qual: { rankLabel: `#${divRank} Group`, stageLabel: "Quarter", isQualified: true },
      wildcardRank: null,
      divRank,
    };
  }

  const globalList = buildGlobalStandings(standings);
  const wItem = globalList.find((item) => !item.isTopGroup && item.teamName.toLowerCase().trim() === clean);
  const wildcardRank = wItem ? wItem.rank : 99;
  const isPlayIns = wildcardRank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA;

  return {
    qual: {
      rankLabel: `#${wildcardRank} Wildcard`,
      stageLabel: isPlayIns ? "Play-Ins" : "Eliminasi",
      isQualified: isPlayIns,
    },
    wildcardRank,
    divRank,
  };
}

/**
 * 4. SINGLE SOURCE OF TRUTH: STATS & PROFILE EXTRACTOR
 */
export function getTeamStatsFromStandings(
  teamInput: string | any,
  standings: ExtendedStandingItem[] = [],
  explicitColor?: string,
  allSchedules: MatchScheduleItem[] = []
): TeamComparisonStats {
  const teamName = typeof teamInput === "string" ? teamInput : teamInput?.teamName || teamInput?.name || "";
  const clean = teamName.toLowerCase().trim();
  const standingItem = standings.find((s) => s?.teamName?.toLowerCase().trim() === clean);

  const { qual, wildcardRank, divRank } = getTeamQualification(teamName, standings);

  const matchWins = standingItem?.matchWins ?? teamInput?.matchWins ?? 0;
  const matchLosses = standingItem?.matchLosses ?? teamInput?.matchLosses ?? 0;
  const matchPlayed = standingItem?.matchPlayed ?? (matchWins + matchLosses);
  const winRate = matchPlayed > 0 ? Math.round((matchWins / matchPlayed) * 100) : 0;

  const rawDiff = standingItem?.roundDifference ?? teamInput?.roundDifference ?? 0;
  const ptsDiffRate = matchPlayed > 0 ? parseFloat((rawDiff / matchPlayed).toFixed(1)) : 0;
  const groupName = standingItem?.groupName || teamInput?.groupName || DIVISION_MAP.GROUP_A;

  // History & Streak Extractor
  const historyMap = getTeamHistoryMap(teamName, allSchedules);
  const history = Array.from(historyMap.values()).sort((a, b) => b.week - a.week);
  const streak = [...history].slice(0, 5).reverse().map((h) => (h.isWin ? ("W" as const) : ("L" as const)));

  return {
    teamName,
    teamLogo: teamInput?.teamLogo || teamInput?.logo || standingItem?.teamLogo || "/logo.webp",
    teamColor: explicitColor || teamInput?.color || teamInput?.teamColor || standingItem?.teamColor,
    groupName,
    isGroupA: groupName === DIVISION_MAP.GROUP_A,
    rank: standingItem ? standingItem.rank : "-",
    divRank,
    wildcardRank,
    qualification: qual,
    matchPlayed,
    matchWins,
    matchLosses,
    setWins: standingItem?.setWins ?? teamInput?.setWins ?? 0,
    rawDiff,
    roundDifference: rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`,
    ptsDiffRate,
    ptsDiffRateLabel: ptsDiffRate > 0 ? `+${ptsDiffRate}` : `${ptsDiffRate}`,
    winRate,
    form: standingItem?.form || [],
    streak,
    history,
  };
}

export const getTeamProfileStats = (teamInput: any, standings: ExtendedStandingItem[] = [], allSchedules: MatchScheduleItem[] = []) =>
  getTeamStatsFromStandings(teamInput, standings, undefined, allSchedules);

/**
 * 5. MATCH HISTORY MAPPER
 */
export function getTeamHistoryMap(teamName: string, allSchedules: MatchScheduleItem[] = []): Map<number, MatchHistoryCardItem> {
  const map = new Map<number, MatchHistoryCardItem>();
  const clean = (teamName || "").toLowerCase().trim();
  if (!clean) return map;

  allSchedules
    .filter((m) => m?.isFinished && (m.teamAName?.toLowerCase().trim() === clean || m.teamBName?.toLowerCase().trim() === clean))
    .forEach((m) => {
      const isA = (m.teamAName || "").toLowerCase().trim() === clean;
      const myScore = Number(isA ? m.scoreA : m.scoreB) || 0;
      const oppScore = Number(isA ? m.scoreB : m.scoreA) || 0;
      map.set(m.weekNumber || 1, {
        id: m.id,
        week: m.weekNumber || 1,
        isWin: myScore > oppScore,
        myScore,
        oppScore,
        oppName: isA ? m.teamBName : m.teamAName,
        oppLogo: (isA ? m.teamBLogo : m.teamALogo) || "/logo.webp",
        reportLink: m.maskedImageUrl || m.reportImageUrl || undefined,
      });
    });

  return map;
}

/**
 * 6. MATCH PREDICTION ENGINE
 */
export function calculateMatchPrediction(statsA: TeamComparisonStats, statsB: TeamComparisonStats) {
  if (statsA.matchPlayed === 0 && statsB.matchPlayed === 0) {
    return { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 };
  }

  const compute = (s: TeamComparisonStats) => {
    const wr = s.matchPlayed > 0 ? s.matchWins / s.matchPlayed : 0.5;
    const normDiff = (Math.max(-5, Math.min(5, s.ptsDiffRate)) + 5) / 10;
    const formWins = s.form.slice(-3).filter((f) => f === "W").length;
    const formScore = s.form.length > 0 ? formWins / Math.min(3, s.form.length) : 0.5;
    const rankScore = (9 - (typeof s.rank === "number" ? s.rank : 4)) / 8;
    return wr * 0.4 + normDiff * 0.3 + formScore * 0.2 + rankScore * 0.1;
  };

  const scA = compute(statsA);
  const scB = compute(statsB);
  const total = scA + scB;

  let probA = total > 0 ? Math.max(15, Math.min(85, Math.round((scA / total) * 100))) : 50;
  let probB = 100 - probA;

  let predScoreA = 10;
  let predScoreB = 10;
  if (probA >= probB) {
    predScoreB = Math.max(4, Math.min(9, Math.round((probB / probA) * 9.5)));
  } else {
    predScoreA = Math.max(4, Math.min(9, Math.round((probA / probB) * 9.5)));
  }

  return { probA, probB, predScoreA, predScoreB };
}

export function getNextDateMatches(currentWeekSchedules: MatchScheduleItem[], todayDateStrWIB: string) {
  const candidates = currentWeekSchedules
    .filter((m) => !m.isFinished && m.matchDate && getWibDateKey(new Date(m.matchDate)) > todayDateStrWIB)
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  if (!candidates.length) return [];
  const nextDate = getWibDateKey(new Date(candidates[0].matchDate));
  return candidates.filter((m) => getWibDateKey(new Date(m.matchDate)) === nextDate);
}