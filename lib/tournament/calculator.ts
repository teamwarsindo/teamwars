import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";

export interface ExtendedStandingItem extends TeamStandingItem {
  previousRank?: number;
  rankTrend?: "up" | "down" | "stay";
  isTopGroup?: boolean;
  customRankLabel?: string;
  groupColor?: string;
}

function getMatchWeek(m: MatchScheduleItem): number {
  if (typeof m.weekNumber === "number" && m.weekNumber > 0) {
    return m.weekNumber;
  }

  if (m.matchDate && process.env.TWI_START_DATE) {
    const startTime = new Date(process.env.TWI_START_DATE).getTime();
    const matchTime = new Date(m.matchDate).getTime();

    if (!isNaN(matchTime) && !isNaN(startTime)) {
      const diffDays = Math.floor((matchTime - startTime) / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.floor(diffDays / 7) + 1);
    }
  }

  return 1;
}

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  upToWeek?: number
): ExtendedStandingItem[] {
  const allMatchWeeks = schedules.map((m) => getMatchWeek(m));
  const maxWeek = allMatchWeeks.length ? Math.max(...allMatchWeeks) : 1;
  const targetWeek: number = typeof upToWeek === "number" && upToWeek > 0 ? upToWeek : maxWeek;

  const filteredMatches = schedules.filter((m) => {
    const isPlayed = Boolean(m.isFinished || (m.scoreA || 0) + (m.scoreB || 0) > 0);
    if (!isPlayed) return false;

    if (!upToWeek || upToWeek === 0 || targetWeek >= maxWeek) return true;
    return getMatchWeek(m) <= targetWeek;
  });

  const statsMap = new Map<string, ExtendedStandingItem>();

  masterTeams.forEach((team) => {
    const tName = team.name || team.teamName || "";
    if (tName) {
      statsMap.set(tName, {
        rank: 0,
        teamId: tName,
        teamName: tName,
        teamLogo: team.logo || team.teamLogo || "/logo.webp",
        groupName: team.groupName || "Group A",
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
      });
    }
  });

  filteredMatches.forEach((m) => {
    const teamA = statsMap.get(m.teamAName);
    const teamB = statsMap.get(m.teamBName);

    const sA = Number(m.scoreA) || 0;
    const sB = Number(m.scoreB) || 0;

    if (teamA) {
      teamA.matchPlayed += 1;
      teamA.points += sA;
      teamA.setLosses += sB;
      teamA.roundDifference += sA - sB;

      if (sA > sB) {
        teamA.matchWins += 1;
      } else if (sA < sB) {
        teamA.matchLosses += 1;
      }
      teamA.setWins = teamA.matchWins;
    }

    if (teamB) {
      teamB.matchPlayed += 1;
      teamB.points += sB;
      teamB.setLosses += sA;
      teamB.roundDifference += sB - sA;

      if (sB > sA) {
        teamB.matchWins += 1;
      } else if (sB < sA) {
        teamB.matchLosses += 1;
      }
      teamB.setWins = teamB.matchWins;
    }
  });

  const standingsList = Array.from(statsMap.values());

  const getH2HWinnerScore = (teamA: string, teamB: string): number => {
    const directMatch = filteredMatches.find(
      (m) =>
        (m.teamAName === teamA && m.teamBName === teamB) ||
        (m.teamAName === teamB && m.teamBName === teamA)
    );
    if (!directMatch) return 0;
    if (directMatch.teamAName === teamA) {
      return (directMatch.scoreA || 0) - (directMatch.scoreB || 0);
    } else {
      return (directMatch.scoreB || 0) - (directMatch.scoreA || 0);
    }
  };

  const sortComparator = (a: ExtendedStandingItem, b: ExtendedStandingItem) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;

    const h2h = getH2HWinnerScore(a.teamName, b.teamName);
    if (h2h !== 0) return h2h > 0 ? -1 : 1;

    return a.teamName.localeCompare(b.teamName);
  };

  // Kelompokkan dan urutkan per grup secara mandiri
  const groupedTeams = new Map<string, ExtendedStandingItem[]>();
  standingsList.forEach((item) => {
    const group = item.groupName;
    if (!groupedTeams.has(group)) {
      groupedTeams.set(group, []);
    }
    groupedTeams.get(group)!.push(item);
  });

  const finalStandings: ExtendedStandingItem[] = [];

  groupedTeams.forEach((teamsInGroup) => {
    teamsInGroup.sort(sortComparator);
    teamsInGroup.forEach((item, index) => {
      item.rank = index + 1;
    });
    finalStandings.push(...teamsInGroup);
  });

  // Evaluasi tren rank per grup terhadap minggu sebelumnya
  if (targetWeek > 1) {
    const prevStandings = calculateStandings(schedules, masterTeams, targetWeek - 1);
    const prevRankMap = new Map<string, number>();
    prevStandings.forEach((item) => prevRankMap.set(item.teamName, item.rank));

    finalStandings.forEach((item) => {
      const prevRank = prevRankMap.get(item.teamName);
      if (typeof prevRank === "number") {
        item.previousRank = prevRank;
        if (item.rank < prevRank) item.rankTrend = "up";
        else if (item.rank > prevRank) item.rankTrend = "down";
        else item.rankTrend = "stay";
      } else {
        item.rankTrend = "stay";
      }
    });
  } else {
    finalStandings.forEach((item) => (item.rankTrend = "stay"));
  }

  return finalStandings;
        }
