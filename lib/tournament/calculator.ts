import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";

export interface ExtendedStandingItem extends TeamStandingItem {
  previousRank?: number;
  rankTrend?: "up" | "down" | "stay";
  isTopGroup?: boolean;
}

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  upToWeek?: number
): ExtendedStandingItem[] {
  // 🟢 Penanganan TypeScript strict: Tentukan targetWeek secara pasti (bertipe number)
  const maxWeekInSchedules = schedules.length
    ? Math.max(...schedules.map((s) => s.weekNumber || 1))
    : 1;
  const targetWeek: number = typeof upToWeek === "number" ? upToWeek : maxWeekInSchedules;

  // Filter match hanya sampai minggu target yang dipilih dan sudah FINISHED
  const filteredMatches = schedules.filter(
    (m) => (m.weekNumber || 1) <= targetWeek && m.isFinished
  );

  const statsMap = new Map<string, ExtendedStandingItem>();

  masterTeams.forEach((team) => {
    statsMap.set(team.name, {
      rank: 0,
      teamId: team.name,
      teamName: team.name,
      teamLogo: team.logo || "/logo.webp",
      groupName: team.groupName || "Group A",
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
    });
  });

  filteredMatches.forEach((m) => {
    const teamA = statsMap.get(m.teamAName);
    const teamB = statsMap.get(m.teamBName);

    if (teamA) {
      teamA.matchPlayed += 1;
      teamA.setWins += m.scoreA || 0;
      teamA.setLosses += m.scoreB || 0;
      teamA.roundDifference += (m.scoreA || 0) - (m.scoreB || 0);

      if (m.scoreA > m.scoreB) {
        teamA.matchWins += 1;
        teamA.points += 10;
      } else if (m.scoreA < m.scoreB) {
        teamA.matchLosses += 1;
      }
    }

    if (teamB) {
      teamB.matchPlayed += 1;
      teamB.setWins += m.scoreB || 0;
      teamB.setLosses += m.scoreA || 0;
      teamB.roundDifference += (m.scoreB || 0) - (m.scoreA || 0);

      if (m.scoreB > m.scoreA) {
        teamB.matchWins += 1;
        teamB.points += 10;
      } else if (m.scoreB < m.scoreA) {
        teamB.matchLosses += 1;
      }
    }
  });

  const standingsList = Array.from(statsMap.values());

  standingsList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
    return b.setWins - a.setWins;
  });

  standingsList.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Hitung tren rank jika target minggu > 1
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