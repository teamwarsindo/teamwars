export interface GameEntry {
  gameNumber: number;
  winner: "teamA" | "teamB" | string;
  playerA?: {
    ign: string;
    archetype?: string;
  };
  playerB?: {
    ign: string;
    archetype?: string;
  };
}

export interface LineupPlayer {
  ign: string;
  totalWins?: number;
  totalLosses?: number;
}

export interface RawMatchReport {
  matchId?: string;
  id?: string;
  week?: number;
  teamA: {
    name: string;
    slug?: string;
    score?: number;
    lineup?: LineupPlayer[];
    groupName?: string;
    logo?: string;
  };
  teamB: {
    name: string;
    slug?: string;
    score?: number;
    lineup?: LineupPlayer[];
    groupName?: string;
    logo?: string;
  };
  games?: GameEntry[];
  isFinished?: boolean;
}

export interface TeamRosterData {
  slug: string;
  name: string;
  logo?: string;
  groupName?: string;
  members: string[];
}

export interface PowerRankingPlayer {
  rank: number;
  name: string;
  teamSlug: string;
  teamName: string;
  teamLogo?: string;
  groupName?: string;
  played: number;
  won: number;
  lost: number;
  wpm: number;
  agg: number;
  isExPlayer?: boolean;
}

export interface PowerRankingGrandTotal {
  played: number;
  won: number;
  lost: number;
  wpm: number;
  agg: number;
}

export function calculatePowerRanking({
  reports,
  targetWeek,
  teams = [],
  filterScope = "GLOBAL",
  selectedTeamSlug,
}: {
  reports: RawMatchReport[];
  targetWeek: number;
  teams?: TeamRosterData[];
  filterScope: "GLOBAL" | "Anda Yakin?" | "Sakurasawa Fighters" | "TEAM";
  selectedTeamSlug?: string;
}): {
  players: PowerRankingPlayer[];
  grandTotal?: PowerRankingGrandTotal;
} {
  // 1. Filter match hingga targetWeek
  const validReports = reports.filter((r) => {
    const w = Number(r.week || 1);
    return w <= targetWeek;
  });

  // Map agregasi: key = `${teamSlug}:${playerName.toLowerCase()}`
  const playerStatsMap = new Map<
    string,
    {
      name: string;
      teamSlug: string;
      teamName: string;
      teamLogo?: string;
      groupName?: string;
      won: number;
      lost: number;
      matchesAppeared: Set<string>;
    }
  >();

  for (const rep of validReports) {
    const reportId = rep.matchId || rep.id || `${rep.week}-${rep.teamA.name}-vs-${rep.teamB.name}`;
    const slugA = rep.teamA.slug || rep.teamA.name.toLowerCase().replace(/\s+/g, "-");
    const slugB = rep.teamB.slug || rep.teamB.name.toLowerCase().replace(/\s+/g, "-");

    // Ekstraksi dari games duel
    if (Array.isArray(rep.games) && rep.games.length > 0) {
      for (const g of rep.games) {
        const pAName = g.playerA?.ign?.trim();
        const pBName = g.playerB?.ign?.trim();
        if (!pAName || !pBName) continue;

        const keyA = `${slugA}:${pAName.toLowerCase()}`;
        const keyB = `${slugB}:${pBName.toLowerCase()}`;

        if (!playerStatsMap.has(keyA)) {
          playerStatsMap.set(keyA, {
            name: pAName,
            teamSlug: slugA,
            teamName: rep.teamA.name,
            teamLogo: rep.teamA.logo,
            groupName: rep.teamA.groupName,
            won: 0,
            lost: 0,
            matchesAppeared: new Set(),
          });
        }

        if (!playerStatsMap.has(keyB)) {
          playerStatsMap.set(keyB, {
            name: pBName,
            teamSlug: slugB,
            teamName: rep.teamB.name,
            teamLogo: rep.teamB.logo,
            groupName: rep.teamB.groupName,
            won: 0,
            lost: 0,
            matchesAppeared: new Set(),
          });
        }

        const statA = playerStatsMap.get(keyA)!;
        const statB = playerStatsMap.get(keyB)!;

        statA.matchesAppeared.add(reportId);
        statB.matchesAppeared.add(reportId);

        if (g.winner === "teamA" || g.winner === pAName) {
          statA.won += 1;
          statB.lost += 1;
        } else if (g.winner === "teamB" || g.winner === pBName) {
          statB.won += 1;
          statA.lost += 1;
        }
      }
    } else {
      // Fallback: Jika array games kosong, baca dari totalWins/totalLosses di lineup
      const processLineup = (lineup: LineupPlayer[] = [], slug: string, tName: string, logo?: string, group?: string) => {
        for (const p of lineup) {
          if (!p.ign) continue;
          const wins = Number(p.totalWins || 0);
          const losses = Number(p.totalLosses || 0);
          if (wins === 0 && losses === 0) continue; // belum tanding

          const key = `${slug}:${p.ign.toLowerCase()}`;
          if (!playerStatsMap.has(key)) {
            playerStatsMap.set(key, {
              name: p.ign,
              teamSlug: slug,
              teamName: tName,
              teamLogo: logo,
              groupName: group,
              won: 0,
              lost: 0,
              matchesAppeared: new Set(),
            });
          }
          const stat = playerStatsMap.get(key)!;
          stat.won += wins;
          stat.lost += losses;
          stat.matchesAppeared.add(reportId);
        }
      };

      processLineup(rep.teamA.lineup, slugA, rep.teamA.name, rep.teamA.logo, rep.teamA.groupName);
      processLineup(rep.teamB.lineup, slugB, rep.teamB.name, rep.teamB.logo, rep.teamB.groupName);
    }
  }

  // 2. Format ke PowerRankingPlayer
  let playerList: PowerRankingPlayer[] = Array.from(playerStatsMap.values()).map((p) => {
    const played = p.matchesAppeared.size;
    const won = p.won;
    const lost = p.lost;
    const wpm = played > 0 ? Number((won / played).toFixed(2)) : 0;
    const agg = won - lost;

    return {
      rank: 0,
      name: p.name,
      teamSlug: p.teamSlug,
      teamName: p.teamName,
      teamLogo: p.teamLogo,
      groupName: p.groupName,
      played,
      won,
      lost,
      wpm,
      agg,
    };
  });

  // 3. Filter Scope & Mode Tim
  let grandTotal: PowerRankingGrandTotal | undefined;

  if (filterScope === "TEAM" && selectedTeamSlug) {
    const selectedTeam = teams.find((t) => t.slug === selectedTeamSlug);
    const activeMembers = new Set((selectedTeam?.members || []).map((m) => m.toLowerCase()));

    const teamReportPlayers = playerList.filter((p) => p.teamSlug === selectedTeamSlug);
    const recordedNames = new Set<string>();

    const processedTeamPlayers: PowerRankingPlayer[] = teamReportPlayers.map((p) => {
      const isEx = activeMembers.size > 0 && !activeMembers.has(p.name.toLowerCase());
      if (!isEx) recordedNames.add(p.name.toLowerCase());
      return { ...p, isExPlayer: isEx };
    });

    // Masukkan anggota tim yang belum pernah main (0/0/0)
    for (const memberName of selectedTeam?.members || []) {
      if (!recordedNames.has(memberName.toLowerCase())) {
        processedTeamPlayers.push({
          rank: 0,
          name: memberName,
          teamSlug: selectedTeamSlug,
          teamName: selectedTeam?.name || "",
          teamLogo: selectedTeam?.logo,
          groupName: selectedTeam?.groupName,
          played: 0,
          won: 0,
          lost: 0,
          wpm: 0,
          agg: 0,
          isExPlayer: false,
        });
      }
    }

    playerList = processedTeamPlayers;

    const totalWon = playerList.reduce((acc, cur) => acc + cur.won, 0);
    const totalLost = playerList.reduce((acc, cur) => acc + cur.lost, 0);
    const totalPlayed = playerList.reduce((acc, cur) => acc + cur.played, 0);
    const totalWpm = totalPlayed > 0 ? Number((totalWon / totalPlayed).toFixed(2)) : 0;

    grandTotal = {
      played: totalPlayed,
      won: totalWon,
      lost: totalLost,
      wpm: totalWpm,
      agg: totalWon - totalLost,
    };
  } else {
    // Hanya yang pernah main (played >= 1)
    playerList = playerList.filter((p) => p.played >= 1);

    if (filterScope === "Anda Yakin?" || filterScope === "Sakurasawa Fighters") {
      playerList = playerList.filter((p) => p.groupName === filterScope);
    }
  }

  // 4. Urutan Ranking Paten: (1) Total Win, (2) WPM, (3) AGG
  playerList.sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.agg !== a.agg) return b.agg - a.agg;
    return a.played - b.played;
  });

  playerList = playerList.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));

  return {
    players: playerList,
    grandTotal,
  };
            }
                                                
