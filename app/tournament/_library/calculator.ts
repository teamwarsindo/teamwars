import { MatchScheduleItem, TeamStandingItem } from "./types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "./constants";
import { getWibDateKey, getMatchWeekNumber, getCurrentServerWeek } from "./utils";

export interface ExtendedStandingItem extends TeamStandingItem {
  isTopGroup?: boolean;
  groupColor?: "GROUP_A" | "GROUP_B";
  customRankLabel?: string;
  rankTrend?: "up" | "down" | "stay";
}

/**
 * 🟢 Helper resmi menghitung nomor minggu turnamen (Backward Compatible)
 */
export function getTournamentWeekNumber(dateString?: string): number {
  if (dateString) {
    return getMatchWeekNumber(dateString);
  }
  return getCurrentServerWeek();
}

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  maxWeek?: number
): ExtendedStandingItem[] {
  const filteredSchedules =
    typeof maxWeek === "number" && maxWeek > 0
      ? schedules.filter((m) => (m.weekNumber || 1) <= maxWeek)
      : schedules;

  const teamMap = new Map<string, ExtendedStandingItem>();
  const teamFormMap = new Map<string, { dateStr: string; result: "W" | "L" }[]>();

  masterTeams.forEach((t) => {
    const groupName =
      t.groupName === "Group A" || t.groupName === DIVISION_MAP.GROUP_A
        ? DIVISION_MAP.GROUP_A
        : DIVISION_MAP.GROUP_B;

    const tName = t.name || t.teamName;
    const teamColor = t.color || t.primaryColor || t.teamColor || undefined;

    teamMap.set(tName, {
      rank: 1,
      teamId: t.id || tName,
      teamName: tName,
      teamLogo: t.logo || t.teamLogo || "/logo.webp",
      teamColor,
      groupName,
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
      form: [],
    });
    teamFormMap.set(tName, []);
  });

  const sortedMatches = [...filteredSchedules].sort((a, b) => {
    const dateA = new Date(a.matchDate || 0).getTime();
    const dateB = new Date(b.matchDate || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (a.weekNumber || 1) - (b.weekNumber || 1);
  });

  sortedMatches.forEach((m) => {
    const isFinished = Boolean(m.isFinished);
    const scoreA = m.scoreA || 0;
    const scoreB = m.scoreB || 0;

    if (!isFinished && scoreA === 0 && scoreB === 0) return;

    let itemA = teamMap.get(m.teamAName);
    let itemB = teamMap.get(m.teamBName);

    if (!itemA) {
      itemA = {
        rank: 1,
        teamId: m.teamAId || m.teamAName,
        teamName: m.teamAName,
        teamLogo: m.teamALogo || "/logo.webp",
        teamColor: m.teamAColor,
        groupName: m.groupName === "Group A" ? DIVISION_MAP.GROUP_A : m.groupName,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
        form: [],
      };
      teamMap.set(m.teamAName, itemA);
      teamFormMap.set(m.teamAName, []);
    }

    if (!itemB) {
      itemB = {
        rank: 1,
        teamId: m.teamBId || m.teamBName,
        teamName: m.teamBName,
        teamLogo: m.teamBLogo || "/logo.webp",
        teamColor: m.teamBColor,
        groupName: m.groupName === "Group B" ? DIVISION_MAP.GROUP_B : m.groupName,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
        form: [],
      };
      teamMap.set(m.teamBName, itemB);
      teamFormMap.set(m.teamBName, []);
    }

    itemA.matchPlayed += 1;
    itemB.matchPlayed += 1;

    itemA.setWins += scoreA;
    itemA.setLosses += scoreB;
    itemB.setWins += scoreB;
    itemB.setLosses += scoreA;

    itemA.roundDifference += scoreA - scoreB;
    itemB.roundDifference += scoreB - scoreA;

    const formsA = teamFormMap.get(m.teamAName) || [];
    const formsB = teamFormMap.get(m.teamBName) || [];

    if (scoreA > scoreB) {
      itemA.matchWins += 1;
      itemA.points += 1;
      itemB.matchLosses += 1;
      formsA.push({ dateStr: m.matchDate, result: "W" });
      formsB.push({ dateStr: m.matchDate, result: "L" });
    } else if (scoreB > scoreA) {
      itemB.matchWins += 1;
      itemB.points += 1;
      itemA.matchLosses += 1;
      formsB.push({ dateStr: m.matchDate, result: "W" });
      formsA.push({ dateStr: m.matchDate, result: "L" });
    }
  });

  teamMap.forEach((item, tName) => {
    const list = teamFormMap.get(tName) || [];
    item.form = list.map((f) => f.result);
  });

  const allTeams = Array.from(teamMap.values());

  const sortTeams = (teams: ExtendedStandingItem[]) => {
    return teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      if (b.setWins !== a.setWins) return b.setWins - a.setWins;

      const h2hMatch = filteredSchedules.find(
        (m) =>
          m.isFinished &&
          ((m.teamAName === a.teamName && m.teamBName === b.teamName) ||
            (m.teamAName === b.teamName && m.teamBName === a.teamName))
      );

      if (h2hMatch && (h2hMatch.scoreA > 0 || h2hMatch.scoreB > 0)) {
        const aScore = h2hMatch.teamAName === a.teamName ? h2hMatch.scoreA : h2hMatch.scoreB;
        const bScore = h2hMatch.teamBName === b.teamName ? h2hMatch.scoreB : h2hMatch.scoreA;
        if (aScore !== bScore) return bScore - aScore;
      }

      return a.teamName.localeCompare(b.teamName);
    });
  };

  const groupATeams = sortTeams(
    allTeams.filter((t) => t.groupName === DIVISION_MAP.GROUP_A)
  ).map((t, idx) => ({ ...t, rank: idx + 1 }));

  const groupBTeams = sortTeams(
    allTeams.filter((t) => t.groupName === DIVISION_MAP.GROUP_B)
  ).map((t, idx) => ({ ...t, rank: idx + 1 }));

  return [...groupATeams, ...groupBTeams];
}

export function buildGlobalStandings(
  standings: ExtendedStandingItem[]
): (ExtendedStandingItem & { globalRank: number; globalRankTrend?: "up" | "down" | "stay" })[] {
  const groupA = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  const groupB = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);

  const topGroupA = groupA
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_A" as const,
      customRankLabel: `Top ${i + 1}`,
    }));

  const topGroupB = groupB
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_B" as const,
      customRankLabel: `Top ${i + 1}`,
    }));

  const top4Combined = [...topGroupA, ...topGroupB];
  const top4Names = new Set(top4Combined.map((t) => t.teamName));

  const remainingTeams = standings
    .filter((t) => !top4Names.has(t.teamName))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      return b.setWins - a.setWins;
    })
    .map((t, idx) => ({
      ...t,
      rank: idx + 1,
      isTopGroup: false,
      groupColor: (t.groupName === DIVISION_MAP.GROUP_A ? "GROUP_A" : "GROUP_B") as "GROUP_A" | "GROUP_B",
      customRankLabel: `${idx + 1}`,
    }));

  const fullCombined = [...top4Combined, ...remainingTeams];

  return fullCombined.map((item, index) => ({
    ...item,
    globalRank: index + 1,
  }));
}

export function getNextDateMatches(
  currentWeekSchedules: MatchScheduleItem[],
  todayDateStrWIB: string
): MatchScheduleItem[] {
  const upcomingCandidates = currentWeekSchedules
    .filter((m) => {
      if (m.isFinished) return false;
      if (!m.matchDate) return false;
      const matchDayStr = getWibDateKey(new Date(m.matchDate));
      return matchDayStr > todayDateStrWIB;
    })
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  if (upcomingCandidates.length === 0) return [];

  const nextDateStr = getWibDateKey(new Date(upcomingCandidates[0].matchDate));
  return upcomingCandidates.filter(
    (m) => getWibDateKey(new Date(m.matchDate)) === nextDateStr
  );
}

export interface TeamComparisonStats {
  rank: number | string;
  groupName: string;
  teamColor: string;
  matchPlayed: number;
  matchWins: number;
  matchLosses: number;
  winRate: number;
  rawDiff: number;
  roundDifference: string;
  ptsDiffRate: number;
  ptsDiffRateLabel: string;
  setWins: number;
  form: ("W" | "L")[];
}

export function getTeamStatsFromStandings(
  teamName: string,
  standings: ExtendedStandingItem[] = [],
  defaultColor = "#2563EB"
): TeamComparisonStats {
  const t = standings.find((s) => s.teamName.toLowerCase() === teamName.toLowerCase());
  const matchPlayed = t ? t.matchPlayed : 0;
  const matchWins = t ? t.matchWins : 0;
  const matchLosses = t ? t.matchLosses : 0;
  const winRate = matchPlayed > 0 ? Math.round((matchWins / matchPlayed) * 100) : 0;

  const rawDiff = t ? t.roundDifference : 0;
  const ptsDiffRate = matchPlayed > 0 ? parseFloat((rawDiff / matchPlayed).toFixed(1)) : 0;
  const ptsDiffRateLabel = ptsDiffRate > 0 ? `+${ptsDiffRate}` : `${ptsDiffRate}`;
  const teamColor = t?.teamColor || defaultColor;

  return {
    rank: t ? t.rank : "-",
    groupName: t ? t.groupName : "Group Stage",
    teamColor,
    matchPlayed,
    matchWins,
    matchLosses,
    winRate,
    rawDiff,
    roundDifference: rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`,
    ptsDiffRate,
    ptsDiffRateLabel,
    setWins: t ? t.setWins : 0,
    form: t?.form || [],
  };
}

export function calculateMatchPrediction(
  statsA: TeamComparisonStats,
  statsB: TeamComparisonStats
): { probA: number; probB: number } {
  if (statsA.matchPlayed === 0 && statsB.matchPlayed === 0) {
    return { probA: 50, probB: 50 };
  }

  const computeScore = (stats: TeamComparisonStats) => {
    const wr = stats.matchPlayed > 0 ? stats.matchWins / stats.matchPlayed : 0.5;
    const clampedDiff = Math.max(-5, Math.min(5, stats.ptsDiffRate));
    const normDiff = (clampedDiff + 5) / 10;

    const recentForm = stats.form.slice(-3);
    const formWins = recentForm.filter((f) => f === "W").length;
    const formScore = recentForm.length > 0 ? formWins / recentForm.length : 0.5;

    const rankNum = typeof stats.rank === "number" ? stats.rank : 4;
    const rankScore = (9 - rankNum) / 8;

    return wr * 0.4 + normDiff * 0.3 + formScore * 0.2 + rankScore * 0.1;
  };

  const scoreA = computeScore(statsA);
  const scoreB = computeScore(statsB);

  const totalScore = scoreA + scoreB;
  if (totalScore <= 0) return { probA: 50, probB: 50 };

  const probA = Math.max(15, Math.min(85, Math.round((scoreA / totalScore) * 100)));
  const probB = 100 - probA;

  return { probA, probB };
}

export interface TeamMatchHistoryItem {
  matchId: string;
  weekNumber: number;
  result: "WIN" | "LOSE";
  opponentName: string;
  opponentLogo: string;
  teamScore: number;
  opponentScore: number;
  reportLink?: string;
}

export function getTeamMatchHistory(
  teamName: string,
  schedules: MatchScheduleItem[] = []
): Map<number, TeamMatchHistoryItem> {
  const historyMap = new Map<number, TeamMatchHistoryItem>();

  const finishedMatches = schedules
    .filter(
      (m) =>
        m.isFinished &&
        (m.teamAName.toLowerCase() === teamName.toLowerCase() ||
          m.teamBName.toLowerCase() === teamName.toLowerCase())
    )
    .sort((a, b) => (a.weekNumber || 1) - (b.weekNumber || 1));

  finishedMatches.forEach((m) => {
    const isTeamA = m.teamAName.toLowerCase() === teamName.toLowerCase();
    const teamScore = isTeamA ? m.scoreA || 0 : m.scoreB || 0;
    const opponentScore = isTeamA ? m.scoreB || 0 : m.scoreA || 0;
    const opponentName = isTeamA ? m.teamBName : m.teamAName;
    const opponentLogo = isTeamA ? m.teamBLogo || "/logo.webp" : m.teamALogo || "/logo.webp";
    const result = teamScore > opponentScore ? "WIN" : "LOSE";
    const weekNum = m.weekNumber || 1;
    const reportLink = m.maskedImageUrl || m.reportImageUrl || undefined;

    historyMap.set(weekNum, {
      matchId: m.id,
      weekNumber: weekNum,
      result,
      opponentName,
      opponentLogo,
      teamScore,
      opponentScore,
      reportLink,
    });
  });

  return historyMap;
} 