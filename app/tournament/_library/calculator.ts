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
  rankLabel: string;
  stageLabel: string;
  isQualified: boolean;
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
 * 3. QUALIFICATION RESOLVER
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
 * 6. MULTI-VARIABLE MATCH PREDICTION ENGINE (LOGIKA DIPERBAIKI)
 */
export function calculateMatchPrediction(
  statsA: TeamComparisonStats,
  statsB: TeamComparisonStats,
  allSchedules: MatchScheduleItem[] = [],
  standings: ExtendedStandingItem[] = []
) {
  if (statsA.matchPlayed === 0 && statsB.matchPlayed === 0) {
    return { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 };
  }

  // 1. Base Win Rate (Skala 0 - 100)
  const baseRateA = statsA.matchPlayed > 0 ? (statsA.matchWins / statsA.matchPlayed) * 100 : 50;
  const baseRateB = statsB.matchPlayed > 0 ? (statsB.matchWins / statsB.matchPlayed) * 100 : 50;

  // 2. Margin Dominasi / Pts Diff Rate (Skala netral 50, +/- hingga 100)
  // Rentang ptsDiffRate umumnya -10 s/d +10, kita normalisasi ke skala 0 - 100
  const diffScoreA = Math.max(0, Math.min(100, 50 + statsA.ptsDiffRate * 5));
  const diffScoreB = Math.max(0, Math.min(100, 50 + statsB.ptsDiffRate * 5));

  // 3. Form Momentum (4 Laga Terakhir)
  const computeFormScore = (form: ("W" | "L")[]) => {
    if (!form.length) return 50;
    const recent = form.slice(-4);
    const weights = [1, 1.25, 1.5, 2].slice(4 - recent.length);
    let pts = 0, totalW = 0;
    recent.forEach((res, i) => {
      const w = weights[i] || 1;
      totalW += w;
      if (res === "W") pts += 100 * w;
    });
    return totalW > 0 ? pts / totalW : 50;
  };

  const formScoreA = computeFormScore(statsA.form);
  const formScoreB = computeFormScore(statsB.form);

  // 4. Strength of Schedule (SoS)
  const computeSoS = (teamName: string) => {
    if (!allSchedules.length) return 50;
    const clean = teamName.toLowerCase().trim();
    const past = allSchedules.filter(
      (m) => m.isFinished && (m.teamAName?.toLowerCase().trim() === clean || m.teamBName?.toLowerCase().trim() === clean)
    );
    if (!past.length) return 50;

    let totalOppWinRate = 0;
    past.forEach((m) => {
      const opp = (m.teamAName?.toLowerCase().trim() === clean ? m.teamBName : m.teamAName)?.toLowerCase().trim();
      const oppItem = standings.find((s) => s.teamName.toLowerCase().trim() === opp);
      const wr = oppItem && oppItem.matchPlayed > 0 ? (oppItem.matchWins / oppItem.matchPlayed) * 100 : 50;
      totalOppWinRate += wr;
    });
    return totalOppWinRate / past.length;
  };

  const sosA = computeSoS(statsA.teamName);
  const sosB = computeSoS(statsB.teamName);

  // 5. Direct H2H Rekor
  const directMatches = allSchedules.filter(
    (m) =>
      m.isFinished &&
      ((m.teamAName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim() && m.teamBName?.toLowerCase().trim() === statsB.teamName.toLowerCase().trim()) ||
        (m.teamAName?.toLowerCase().trim() === statsB.teamName.toLowerCase().trim() && m.teamBName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim()))
  );

  let h2hWinRateA = 50;
  const hasH2H = directMatches.length > 0;
  if (hasH2H) {
    let winsA = 0;
    directMatches.forEach((m) => {
      const isA = m.teamAName?.toLowerCase().trim() === statsA.teamName.toLowerCase().trim();
      const sA = Number(isA ? m.scoreA : m.scoreB) || 0;
      const sB = Number(isA ? m.scoreB : m.scoreA) || 0;
      if (sA > sB) winsA++;
    });
    h2hWinRateA = (winsA / directMatches.length) * 100;
  }

  // 6. Pembobotan Berimbang
  // Win Rate (40%) + Pts Diff Margin (25%) + Form (20%) + SoS (15%)
  const wWinRate = 0.40;
  const wDiff = 0.25;
  const wForm = 0.20;
  const wSos = hasH2H ? 0.05 : 0.15;
  const wH2H = hasH2H ? 0.10 : 0.0;

  const powerA = baseRateA * wWinRate + diffScoreA * wDiff + formScoreA * wForm + sosA * wSos + h2hWinRateA * wH2H;
  const powerB = baseRateB * wWinRate + diffScoreB * wDiff + formScoreB * wForm + sosB * wSos + (100 - h2hWinRateA) * wH2H;

  const total = powerA + powerB || 1;
  const rawProbA = Math.round((powerA / total) * 100);
  const probA = Math.max(15, Math.min(85, rawProbA));
  const probB = 100 - probA;

  // 7. Estimasi Skor Dinamis Berdasarkan Margin Probabilitas & Pts Rata-Rata
  let predScoreA = 10;
  let predScoreB = 10;

  const probDiff = Math.abs(probA - probB);

  // Estimasi skor tim yang kalah: makin lebar beda probabilitas, makin rendah skor tim yang kalah (skor 10-0 s/d 10-9)
  let loserScore = 9;
  if (probDiff >= 40) {
    loserScore = Math.max(1, Math.min(4, Math.round(9 - (probDiff / 50) * 7)));
  } else if (probDiff >= 20) {
    loserScore = Math.max(4, Math.min(7, Math.round(9 - (probDiff / 40) * 4)));
  } else if (probDiff >= 8) {
    loserScore = 8;
  } else {
    loserScore = 9; // Laga sangat ketat
  }

  if (probA >= probB) {
    predScoreA = 10;
    predScoreB = loserScore;
  } else {
    predScoreA = loserScore;
    predScoreB = 10;
  }

  return { probA, probB, predScoreA, predScoreB };
}

/**
 * 7. NEXT DATE MATCHES GETTER
 */
export function getNextDateMatches(currentWeekSchedules: MatchScheduleItem[], todayDateStrWIB: string) {
  const candidates = currentWeekSchedules
    .filter((m) => !m.isFinished && m.matchDate && getWibDateKey(new Date(m.matchDate)) > todayDateStrWIB)
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  if (!candidates.length) return [];
  const nextDate = getWibDateKey(new Date(candidates[0].matchDate));
  return candidates.filter((m) => getWibDateKey(new Date(m.matchDate)) === nextDate);
}
