import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";

export interface ExtendedStandingItem extends TeamStandingItem {
  previousRank?: number;
  rankTrend?: "up" | "down" | "stay";
  isTopGroup?: boolean;
  customRankLabel?: string;
}

function getMatchWeek(m: MatchScheduleItem): number {
  if (typeof m.weekNumber === "number" && m.weekNumber > 0) {
    return m.weekNumber;
  }

  if (m.matchDate) {
    const startDate = process.env.TWI_START_DATE;
    const matchDate = new Date(m.matchDate).getTime();

    // Pastikan kedua timestamp bernilai number yang valid (bukan NaN)
    if (!isNaN(matchDate) && !isNaN(startDate)) {
      const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.floor(diffDays / 7) + 1);
    }
  }

  return 1;
}

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  upToWeek?: number // 0 atau undefined berarti 'Semua Week'
): ExtendedStandingItem[] {
  const allMatchWeeks = schedules.map((m) => getMatchWeek(m));
  const maxWeek = allMatchWeeks.length ? Math.max(...allMatchWeeks) : 1;
  const targetWeek: number = typeof upToWeek === "number" && upToWeek > 0 ? upToWeek : maxWeek;

  // Filter match berdasarkan minggu
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

  // Helper Check Head-to-Head (H2H)
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

  // Poin -> Match Wins -> Round Difference -> H2H -> Alfabet
  standingsList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;

    const h2h = getH2HWinnerScore(a.teamName, b.teamName);
    if (h2h !== 0) return h2h > 0 ? -1 : 1;

    return a.groupName.localeCompare(b.groupName) || a.teamName.localeCompare(b.teamName);
  });

  standingsList.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Hitung tren naik/turun rank
  if (targetWeek > 1) {
    const prevStandings = calculateStandings(schedules, masterTeams, targetWeek - 1);
    const prevRankMap = new Map<string, number>();
    prevStandings.forEach((item) => prevRankMap.set(item.teamName, item.rank));

    standingsList.forEach((item) => {
      const prevRank = prevRankMap.get(item.teamName);
      if (prevRank) {
        item.previousRank = prevRank;
        if (item.rank < prevRank) item.rankTrend = "up";
        else if (item.rank > prevRank) item.rankTrend = "down";
        else item.rankTrend = "stay";
      } else {
        item.rankTrend = "stay";
      }
    });
  } else {
    standingsList.forEach((item) => (item.rankTrend = "stay"));
  }

  return standingsList;
}
