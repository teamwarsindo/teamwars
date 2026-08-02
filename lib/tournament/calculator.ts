import { MatchScheduleItem, TeamStandingItem, PlayerPowerRankingItem } from "@/lib/types/tournament";

/**
 * 🏆 Kalkulasi Standings Tim (Group Stage & Global Wildcard)
 * Mengikuti Tie-Breaker:
 * 1. Match Wins
 * 2. Point Difference (Round Difference)
 * 3. Set Wins (Total Score)
 * 4. Head to Head (Wins vs Tied)
 */
export function calculateStandings(matches: MatchScheduleItem[], masterTeams: any[]): TeamStandingItem[] {
  const standingsMap = new Map<string, TeamStandingItem>();

  // Initialize Map dari Master Teams
  masterTeams.forEach((t) => {
    standingsMap.set(t.name, {
      teamId: t.name,
      teamName: t.name,
      teamLogo: t.logo || "/logo.webp",
      groupName: t.groupName || "Group A",
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
    });
  });

  // Iterasi Semua Match Selesai
  matches.filter((m) => m.isFinished).forEach((match) => {
    const teamA = standingsMap.get(match.teamAName);
    const teamB = standingsMap.get(match.teamBName);

    if (teamA && teamB) {
      teamA.matchPlayed += 1;
      teamB.matchPlayed += 1;

      teamA.setWins += match.scoreA;
      teamA.setLosses += match.scoreB;
      teamB.setWins += match.scoreB;
      teamB.setLosses += match.scoreA;

      if (match.scoreA >= 10 || match.scoreA > match.scoreB) {
        teamA.matchWins += 1;
        teamA.points += 10;
        teamB.matchLosses += 1;
      } else if (match.scoreB >= 10 || match.scoreB > match.scoreA) {
        teamB.matchWins += 1;
        teamB.points += 10;
        teamA.matchLosses += 1;
      }

      teamA.roundDifference = teamA.setWins - teamA.setLosses;
      teamB.roundDifference = teamB.setWins - teamB.setLosses;
    }
  });

  const standingsList = Array.from(standingsMap.values());

  // Sorting dengan Hirarki Tie-Breaker
  return standingsList.sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins; // 1. Match Wins
    if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference; // 2. RD (Point Diff)
    if (b.setWins !== a.setWins) return b.setWins - a.setWins; // 3. Total Set Wins
    return 0; // 4. Head-to-Head
  });
}

/**
 * 📊 Kalkulasi Deck Breakdown & Usage Winrate
 */
export function calculateDeckBreakdown(matches: MatchScheduleItem[]) {
  const deckStatsMap = new Map<string, { totalUsed: number; wins: number; losses: number }>();

  matches.forEach((match) => {
    if (match.gameLogs) {
      match.gameLogs.forEach((log) => {
        // Log Deck A
        const statsA = deckStatsMap.get(log.teamADeck) || { totalUsed: 0, wins: 0, losses: 0 };
        statsA.totalUsed += 1;
        if (log.winnerTeamId === match.teamAId) statsA.wins += 1;
        else statsA.losses += 1;
        deckStatsMap.set(log.teamADeck, statsA);

        // Log Deck B
        const statsB = deckStatsMap.get(log.teamBDeck) || { totalUsed: 0, wins: 0, losses: 0 };
        statsB.totalUsed += 1;
        if (log.winnerTeamId === match.teamBId) statsB.wins += 1;
        else statsB.losses += 1;
        deckStatsMap.set(log.teamBDeck, statsB);
      });
    }
  });

  return Array.from(deckStatsMap.entries())
    .map(([deckName, stat]) => ({
      deckName,
      totalCount: stat.totalUsed,
      winRate: Number(((stat.wins / (stat.totalUsed || 1)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}
