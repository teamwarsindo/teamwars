export interface DuelLogEntry {
  playerA: string;
  playerB: string;
  winner: string; // nama pemain yang menang atau indikator pemenang
  deckA?: string;
  deckB?: string;
}

export interface MatchReportData {
  id: string;
  week: number;
  teamA: {
    slug: string;
    name: string;
    logo?: string;
    groupName?: string;
  };
  teamB: {
    slug: string;
    name: string;
    logo?: string;
    groupName?: string;
  };
  logs: DuelLogEntry[];
  isFinished: boolean;
}

export interface TeamRosterData {
  slug: string;
  name: string;
  logo?: string;
  groupName?: string;
  members: string[]; // nama-nama pemain aktif saat ini
}

export interface PowerRankingPlayer {
  rank: number;
  name: string;
  teamSlug: string;
  teamName: string;
  teamLogo?: string;
  groupName?: string;
  played: number; // P
  won: number; // W
  lost: number; // L
  wpm: number; // W / P
  agg: number; // W - L
  isExPlayer?: boolean;
}

export interface PowerRankingGrandTotal {
  played: number;
  won: number;
  lost: number;
  wpm: number;
  agg: number;
}

/**
 * Mengkalkulasi Power Ranking secara kumulatif berdasarkan log match report.
 */
export function calculatePowerRanking({
  reports,
  targetWeek,
  teams = [],
  filterScope = "GLOBAL",
  selectedTeamSlug,
}: {
  reports: MatchReportData[];
  targetWeek: number;
  teams?: TeamRosterData[];
  filterScope: "GLOBAL" | "Anda Yakin?" | "Sakurasawa Fighters" | "TEAM";
  selectedTeamSlug?: string;
}): {
  players: PowerRankingPlayer[];
  grandTotal?: PowerRankingGrandTotal;
} {
  // 1. Filter match report kumulatif (Week 1 s/d targetWeek) yang sudah selesai
  const validReports = reports.filter(
    (r) => r.isFinished && r.week <= targetWeek
  );

  // Map untuk agregasi statistik: key = `${teamSlug}:${playerName}`
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
      matchAppearanceSet: Set<string>; // ID match report untuk menghitung P (Played)
    }
  >();

  // 2. Iterasi setiap match report dan ekstrak duel murni dari logs
  for (const report of validReports) {
    for (const log of report.logs || []) {
      if (!log.winner) continue;

      const pA = log.playerA?.trim();
      const pB = log.playerB?.trim();
      const win = log.winner?.trim();

      if (!pA || !pB) continue;

      // Inisialisasi Player A
      const keyA = `${report.teamA.slug}:${pA}`;
      if (!playerStatsMap.has(keyA)) {
        playerStatsMap.set(keyA, {
          name: pA,
          teamSlug: report.teamA.slug,
          teamName: report.teamA.name,
          teamLogo: report.teamA.logo,
          groupName: report.teamA.groupName,
          won: 0,
          lost: 0,
          matchAppearanceSet: new Set(),
        });
      }

      // Inisialisasi Player B
      const keyB = `${report.teamB.slug}:${pB}`;
      if (!playerStatsMap.has(keyB)) {
        playerStatsMap.set(keyB, {
          name: pB,
          teamSlug: report.teamB.slug,
          teamName: report.teamB.name,
          teamLogo: report.teamB.logo,
          groupName: report.teamB.groupName,
          won: 0,
          lost: 0,
          matchAppearanceSet: new Set(),
        });
      }

      const statA = playerStatsMap.get(keyA)!;
      const statB = playerStatsMap.get(keyB)!;

      // Catat keikutsertaan match (1 match = 1 P)
      statA.matchAppearanceSet.add(report.id);
      statB.matchAppearanceSet.add(report.id);

      // Hitung skor ronde (termasuk hasil penalti/deckloss yang tercatat pada log duel)
      if (win === pA) {
        statA.won += 1;
        statB.lost += 1;
      } else if (win === pB) {
        statB.won += 1;
        statA.lost += 1;
      }
    }
  }

  // 3. Konversi map ke array dan hitung WPM serta AGG
  let playerList: PowerRankingPlayer[] = Array.from(
    playerStatsMap.values()
  ).map((p) => {
    const played = p.matchAppearanceSet.size;
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

  // 4. Penanganan Mode Filter Tim
  let grandTotal: PowerRankingGrandTotal | undefined;

  if (filterScope === "TEAM" && selectedTeamSlug) {
    const selectedTeam = teams.find((t) => t.slug === selectedTeamSlug);
    const activeMembers = new Set(selectedTeam?.members || []);

    // Filter pemain yang membela tim ini di log match report
    const teamReportPlayers = playerList.filter(
      (p) => p.teamSlug === selectedTeamSlug
    );

    const activeMemberNamesInReport = new Set<string>();

    // Beri penanda EX jika namanya tidak terdaftar di daftar roster tim saat ini
    const processedTeamPlayers: PowerRankingPlayer[] = teamReportPlayers.map(
      (p) => {
        const isEx = activeMembers.size > 0 && !activeMembers.has(p.name);
        if (!isEx) {
          activeMemberNamesInReport.add(p.name);
        }
        return {
          ...p,
          isExPlayer: isEx,
        };
      }
    );

    // Tambahkan pemain roster aktif yang belum pernah turun bertanding (0/0/0)
    for (const memberName of activeMembers) {
      if (!activeMemberNamesInReport.has(memberName)) {
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

    // Hitung Grand Total khusus mode tim
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
    // Mode Global atau Divisi: hanya sertakan yang sudah pernah tanding (P >= 1)
    playerList = playerList.filter((p) => p.played >= 1);

    if (filterScope === "Anda Yakin?" || filterScope === "Sakurasawa Fighters") {
      playerList = playerList.filter((p) => p.groupName === filterScope);
    }
  }

  // 5. Urutan Paten: (1) Total Win, (2) WPM, (3) AGG
  playerList.sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.agg !== a.agg) return b.agg - a.agg;
    return a.played - b.played; // tie-breaker efisiensi: played lebih sedikit didahulukan
  });

  // 6. Tetapkan rank angka
  playerList = playerList.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));

  return {
    players: playerList,
    grandTotal,
  };
          }
