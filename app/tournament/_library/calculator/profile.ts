import { MatchScheduleItem } from "../types";
import { DIVISION_MAP } from "../constants";
import { ExtendedStandingItem, getTeamQualification, QualificationStatus } from "./standings";

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

export function getTeamHistoryMap(
  teamName: string,
  allSchedules: MatchScheduleItem[] = []
): Map<number, MatchHistoryCardItem> {
  const map = new Map<number, MatchHistoryCardItem>();
  const clean = (teamName || "").toLowerCase().trim();
  if (!clean) return map;

  allSchedules
    .filter(
      (m) =>
        m?.isFinished &&
        (m.teamAName?.toLowerCase().trim() === clean || m.teamBName?.toLowerCase().trim() === clean)
    )
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
  const history = Array.from(historyMap.values()).sort((a, b) => a.week - b.week);
  const streak = history.map((h) => (h.isWin ? ("W" as const) : ("L" as const)));

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
    form: standingItem?.form?.length ? standingItem.form : streak,
    streak,
    history,
  };
}

export const getTeamProfileStats = (
  teamInput: any,
  standings: ExtendedStandingItem[] = [],
  allSchedules: MatchScheduleItem[] = []
) => getTeamStatsFromStandings(teamInput, standings, undefined, allSchedules);
