import { MatchScheduleItem, TeamStandingItem } from "../types";
import { DIVISION_MAP, TOURNAMENT_RULES } from "../constants";

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

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  maxWeek?: number
): ExtendedStandingItem[] {
  const filtered =
    typeof maxWeek === "number" && maxWeek > 0
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
      groupName:
        t.groupName === "Group A" || t.groupName === DIVISION_MAP.GROUP_A
          ? DIVISION_MAP.GROUP_A
          : DIVISION_MAP.GROUP_B,
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
      form: [],
    });
    formMap.set(name.toLowerCase(), []);
  });

  const sortedMatches = [...filtered].sort(
    (a, b) => new Date(a.matchDate || 0).getTime() - new Date(b.matchDate || 0).getTime()
  );

  sortedMatches.forEach((m) => {
    const sA = Number(m.scoreA) || 0;
    const sB = Number(m.scoreB) || 0;
    if (!m.isFinished && sA === 0 && sB === 0) return;
    if (!m.teamAName || !m.teamBName) return;

    const kA = m.teamAName.toLowerCase();
    const kB = m.teamBName.toLowerCase();

    if (!teamMap.has(kA)) {
      teamMap.set(kA, {
        rank: 1,
        teamId: m.teamAId || m.teamAName,
        teamName: m.teamAName,
        teamLogo: m.teamALogo || "/logo.webp",
        teamColor: m.teamAColor,
        groupName: m.groupName || DIVISION_MAP.GROUP_A,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
        form: [],
      });
      formMap.set(kA, []);
    }
    if (!teamMap.has(kB)) {
      teamMap.set(kB, {
        rank: 1,
        teamId: m.teamBId || m.teamBName,
        teamName: m.teamBName,
        teamLogo: m.teamBLogo || "/logo.webp",
        teamColor: m.teamBColor,
        groupName: m.groupName || DIVISION_MAP.GROUP_B,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
        form: [],
      });
      formMap.set(kB, []);
    }

    const tA = teamMap.get(kA)!;
    const tB = teamMap.get(kB)!;

    tA.matchPlayed++;
    tB.matchPlayed++;
    tA.setWins += sA;
    tA.setLosses += sB;
    tB.setWins += sB;
    tB.setLosses += sA;
    tA.roundDifference += sA - sB;
    tB.roundDifference += sB - sA;

    if (sA > sB) {
      tA.matchWins++;
      tA.points++;
      tB.matchLosses++;
      formMap.get(kA)!.push({ date: m.matchDate, res: "W" });
      formMap.get(kB)!.push({ date: m.matchDate, res: "L" });
    } else if (sB > sA) {
      tB.matchWins++;
      tB.points++;
      tA.matchLosses++;
      formMap.get(kB)!.push({ date: m.matchDate, res: "W" });
      formMap.get(kA)!.push({ date: m.matchDate, res: "L" });
    }
  });

  teamMap.forEach((t, k) => {
    t.form = (formMap.get(k) || []).map((f) => f.res);
  });

  const sortTeams = (list: ExtendedStandingItem[]) =>
    list.sort(
      (a, b) =>
        b.points - a.points ||
        b.matchWins - a.matchWins ||
        b.roundDifference - a.roundDifference ||
        b.setWins - a.setWins ||
        a.teamName.localeCompare(b.teamName)
    );

  const all = Array.from(teamMap.values());
  const grpA = sortTeams(all.filter((t) => t.groupName === DIVISION_MAP.GROUP_A)).map((t, i) => ({
    ...t,
    rank: i + 1,
  }));
  const grpB = sortTeams(all.filter((t) => t.groupName === DIVISION_MAP.GROUP_B)).map((t, i) => ({
    ...t,
    rank: i + 1,
  }));

  return [...grpA, ...grpB];
}

export function buildGlobalStandings(standings: ExtendedStandingItem[] = []) {
  if (!standings.length) return [];
  const topA = standings
    .filter((s) => s.groupName === DIVISION_MAP.GROUP_A)
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_A" as const,
      customRankLabel: `Top ${i + 1}`,
    }));
  const topB = standings
    .filter((s) => s.groupName === DIVISION_MAP.GROUP_B)
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_B" as const,
      customRankLabel: `Top ${i + 1}`,
    }));

  const topNames = new Set([...topA, ...topB].map((t) => t.teamName));
  const remaining = standings
    .filter((t) => !topNames.has(t.teamName))
    .sort(
      (a, b) =>
        (b.points || 0) - (a.points || 0) ||
        (b.matchWins || 0) - (a.matchWins || 0) ||
        (b.roundDifference || 0) - (a.roundDifference || 0) ||
        (b.setWins || 0) - (a.setWins || 0)
    )
    .map((t, i) => ({
      ...t,
      rank: i + 1,
      isTopGroup: false,
      groupColor: (t.groupName === DIVISION_MAP.GROUP_A ? "GROUP_A" : "GROUP_B") as "GROUP_A" | "GROUP_B",
      customRankLabel: `${i + 1}`,
    }));

  return [...topA, ...topB, ...remaining].map((t, i) => ({ ...t, globalRank: i + 1 }));
}

export function getTeamQualification(
  teamName: string,
  standings: ExtendedStandingItem[] = []
): { qual: QualificationStatus; wildcardRank: number | null; divRank: number } {
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
