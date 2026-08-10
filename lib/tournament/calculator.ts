import { MatchScheduleItem, TeamStandingItem, DIVISION_MAP } from '@/lib/types/tournament';

export function calculateStandings(matches: MatchScheduleItem[], masterTeams: any[]): TeamStandingItem[] {
  const standingsMap = new Map<string, TeamStandingItem>();

  // 1. Inisialisasi daftar tim dari masterTeams
  masterTeams.forEach((team) => {
    if (!team || !team.name) return;
    standingsMap.set(team.name, {
      rank: 0,
      teamId: team.id || team.name,
      teamName: team.name,
      teamLogo: team.logo || '/logo.webp',
      groupName: team.groupName || DIVISION_MAP.GROUP_A,
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
    });
  });

  // 2. Filter match yang sudah selesai (isFinished === true atau skor sudah terisi)
  const completedMatches = matches.filter(
    (m) => m.isFinished || (m as any).isCompleted || m.scoreA > 0 || m.scoreB > 0
  );

  completedMatches.forEach((match) => {
    const teamA = standingsMap.get(match.teamAName);
    const teamB = standingsMap.get(match.teamBName);

    if (teamA && teamB) {
      teamA.matchPlayed += 1;
      teamB.matchPlayed += 1;

      teamA.setWins += match.scoreA;
      teamA.setLosses += match.scoreB;
      teamB.setWins += match.scoreB;
      teamB.setLosses += match.scoreA;

      if (match.scoreA > match.scoreB) {
        teamA.matchWins += 1;
        teamA.points += 10;
        teamB.matchLosses += 1;
      } else if (match.scoreB > match.scoreA) {
        teamB.matchWins += 1;
        teamB.points += 10;
        teamA.matchLosses += 1;
      }

      teamA.roundDifference = teamA.setWins - teamA.setLosses;
      teamB.roundDifference = teamB.setWins - teamB.setLosses;
    }
  });

  // 3. Konversi ke Array & Urutkan berdasarkan Tie-Breaker resmi
  const standingsList = Array.from(standingsMap.values());

  standingsList.sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins; // 1. Match Wins
    if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference; // 2. Round Difference
    if (b.setWins !== a.setWins) return b.setWins - a.setWins; // 3. Set Wins
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign Rank
  return standingsList.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}