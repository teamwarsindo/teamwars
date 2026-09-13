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

// Alias agar kompatibel dengan file view dan client component
export type MatchReportData = RawMatchReport;

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

// Helper normalisasi string untuk pencocokan aman
const normalizeKey = (str?: string) =>
  (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

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
  // 1. Filter match hingga targetWeek (termasuk match live/ongoing yang sudah ada games)
  const validReports = reports.filter((r) => {
    const w = Number(r.week || 1);
    return w <= targetWeek;
  });

  // Map agregasi: key = `${normSlug}:${playerName.toLowerCase()}`
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
    const reportId =
      rep.matchId ||
      rep.id ||
      `${rep.week}-${rep.teamA.name}-vs-${rep.teamB.name}`;

    const slugA = rep.teamA.slug || rep.teamA.name;
    const slugB = rep.teamB.slug || rep.teamB.name;
    const normSlugA = normalizeKey(slugA);
    const normSlugB = normalizeKey(slugB);

    // Ekstraksi dari games duel (support match sedang jalan / real-time)
    if (Array.isArray(rep.games) && rep.games.length > 0) {
      for (const g of rep.games) {
        const pAName = g.playerA?.ign?.trim();
        const pBName = g.playerB?.ign?.trim();
        if (!pAName || !pBName) continue;

        const keyA = `${normSlugA}:${pAName.toLowerCase()}`;
        const keyB = `${normSlugB}:${pBName.toLowerCase()}`;

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

        const w = (g.winner || "").toLowerCase().trim();
        const winA =
          w === "teama" ||
          w === pAName.toLowerCase() ||
          w === normalizeKey(rep.teamA.name);
        const winB =
          w === "teamb" ||
          w === pBName.toLowerCase() ||
          w === normalizeKey(rep.teamB.name);

        if (winA) {
          statA.won += 1;
          statB.lost += 1;
        } else if (winB) {
          statB.won += 1;
          statA.lost += 1;
        }
      }
    } else {
      // Fallback Lineup
      const processLineup = (
        lineup: LineupPlayer[] = [],
        slug: string,
        normSlug: string,
        tName: string,
        logo?: string,
        group?: string
      ) => {
        for (const p of lineup) {
          if (!p.ign) continue;
          const wins = Number(p.totalWins || 0);
          const losses = Number(p.totalLosses || 0);
          if (wins === 0 && losses === 0) continue;

          const key = `${normSlug}:${p.ign.toLowerCase().trim()}`;
          if (!playerStatsMap.has(key)) {
            playerStatsMap.set(key, {
              name: p.ign.trim(),
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

      processLineup(
        rep.teamA.lineup,
        slugA,
        normSlugA,
        rep.teamA.name,
        rep.teamA.logo,
        rep.teamA.groupName
      );
      processLineup(
        rep.teamB.lineup,
        slugB,
        normSlugB,
        rep.teamB.name,
        rep.teamB.logo,
        rep.teamB.groupName
      );
    }
  }

  // 2. Format ke PowerRankingPlayer
  let playerList: PowerRankingPlayer[] = Array.from(
    playerStatsMap.values()
  ).map((p) => {
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

  // 3. Filter Scope & Mode Tim (Perbaikan Pencocokan Aman)
  let grandTotal: PowerRankingGrandTotal | undefined;

  if (filterScope === "TEAM" && selectedTeamSlug) {
    const targetNorm = normalizeKey(selectedTeamSlug);

    // Cari tim di roster dengan pencocokan nama maupun slug
    const selectedTeam = teams.find(
      (t) =>
        normalizeKey(t.slug) === targetNorm ||
        normalizeKey(t.name) === targetNorm
    );

    const activeMembers = new Set(
      (selectedTeam?.members || []).map((m) => m.toLowerCase().trim())
    );

    // Filter pemain match report yang timnya cocok
    const teamReportPlayers = playerList.filter(
      (p) =>
        normalizeKey(p.teamSlug) === targetNorm ||
        normalizeKey(p.teamName) === targetNorm
    );

    const recordedNames = new Set<string>();

    const processedTeamPlayers: PowerRankingPlayer[] = teamReportPlayers.map(
      (p) => {
        const isEx =
          activeMembers.size > 0 &&
          !activeMembers.has(p.name.toLowerCase().trim());
        if (!isEx) recordedNames.add(p.name.toLowerCase().trim());
        return { ...p, isExPlayer: isEx };
      }
    );

    // Masukkan anggota roster yang belum pernah main (0/0/0)
    for (const memberName of selectedTeam?.members || []) {
      if (!recordedNames.has(memberName.toLowerCase().trim())) {
        processedTeamPlayers.push({
          rank: 0,
          name: memberName.trim(),
          teamSlug: selectedTeam?.slug || selectedTeamSlug,
          teamName: selectedTeam?.name || selectedTeamSlug,
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
    const totalWpm =
      totalPlayed > 0 ? Number((totalWon / totalPlayed).toFixed(2)) : 0;

    grandTotal = {
      played: totalPlayed,
      won: totalWon,
      lost: totalLost,
      wpm: totalWpm,
      agg: totalWon - totalLost,
    };
  } else {
    // Mode Global / Divisi: Hanya yang sudah pernah main
    playerList = playerList.filter((p) => p.played >= 1);

    if (
      filterScope === "Anda Yakin?" ||
      filterScope === "Sakurasawa Fighters"
    ) {
      playerList = playerList.filter((p) => p.groupName === filterScope);
    }
  }

  // 4. Urutan Ranking: (1) Total Win, (2) WPM, (3) AGG
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
