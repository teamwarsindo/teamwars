import {
  RawMatchReport,
  TeamRosterData,
  PowerRankingPlayer,
  PowerRankingGrandTotal,
} from "./power-ranking";

export function normalizeKey(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/**
 * Kalkulasi Power Ranking Pemain & Roster Tim
 */
export function calculatePowerRanking(
  reports: RawMatchReport[],
  teams: TeamRosterData[],
  selectedTeamSlug?: string,
  selectedWeek?: number
): {
  players: PowerRankingPlayer[];
  grandTotal?: PowerRankingGrandTotal;
} {
  // 1. Filter laporan berdasarkan week jika dipilih
  const filteredReports = reports.filter((r) => {
    if (selectedWeek && selectedWeek > 0) {
      return Number(r.week) <= selectedWeek;
    }
    return true;
  });

  // Map akumulasi statistik per pemain (key: slugTim_ign)
  const playerStatsMap = new Map<
    string,
    {
      name: string;
      teamSlug: string;
      teamName: string;
      teamLogo?: string;
      groupName?: string;
      played: number;
      won: number;
      lost: number;
      agg: number;
      isExPlayer?: boolean;
      isAdded?: boolean;
    }
  >();

  // 2. Hitung statistik dari laporan duel
  filteredReports.forEach((rep) => {
    const games = rep.games || [];
    games.forEach((g) => {
      const ignA = g.playerA?.ign?.trim();
      const ignB = g.playerB?.ign?.trim();

      if (ignA) {
        const keyA = `${rep.teamA.slug || normalizeKey(rep.teamA.name)}_${normalizeKey(ignA)}`;
        const curA = playerStatsMap.get(keyA) || {
          name: ignA,
          teamSlug: rep.teamA.slug || normalizeKey(rep.teamA.name),
          teamName: rep.teamA.name,
          teamLogo: rep.teamA.logo,
          groupName: rep.teamA.groupName,
          played: 0,
          won: 0,
          lost: 0,
          agg: 0,
        };

        curA.played += 1;
        if (g.winner === "teamA") {
          curA.won += 1;
          curA.agg += 1;
        } else if (g.winner === "teamB") {
          curA.lost += 1;
          curA.agg -= 1;
        }
        playerStatsMap.set(keyA, curA);
      }

      if (ignB) {
        const keyB = `${rep.teamB.slug || normalizeKey(rep.teamB.name)}_${normalizeKey(ignB)}`;
        const curB = playerStatsMap.get(keyB) || {
          name: ignB,
          teamSlug: rep.teamB.slug || normalizeKey(rep.teamB.name),
          teamName: rep.teamB.name,
          teamLogo: rep.teamB.logo,
          groupName: rep.teamB.groupName,
          played: 0,
          won: 0,
          lost: 0,
          agg: 0,
        };

        curB.played += 1;
        if (g.winner === "teamB") {
          curB.won += 1;
          curB.agg += 1;
        } else if (g.winner === "teamA") {
          curB.lost += 1;
          curB.agg -= 1;
        }
        playerStatsMap.set(keyB, curB);
      }
    });
  });

  // 3. Gabungkan seluruh anggota roster resmi dari data tim
  teams.forEach((t) => {
    const rawList = t.players || t.members || [];
    const rosterList = Array.isArray(rawList) ? rawList : [];

    rosterList.forEach((m: any) => {
      const ign = (typeof m === "string" ? m : m.ign || m.name || "").trim();
      if (!ign) return;

      const key = `${t.slug || normalizeKey(t.name)}_${normalizeKey(ign)}`;
      const existing = playerStatsMap.get(key);

      const isAdded = Boolean(
        m.isAdded ||
        m.isTransfer ||
        (typeof m.teamsJoinedCount === "number" && m.teamsJoinedCount >= 1)
      );

      if (!existing) {
        // Pemain yang belum pernah main sama sekali (0 play)
        playerStatsMap.set(key, {
          name: ign,
          teamSlug: t.slug || normalizeKey(t.name),
          teamName: t.name,
          teamLogo: t.logo,
          groupName: t.groupName,
          played: 0,
          won: 0,
          lost: 0,
          agg: 0,
          isAdded,
          isExPlayer: false,
        });
      } else {
        existing.isAdded = isAdded;
      }
    });
  });

  // 4. Deteksi Transfer Out (Pemain yang punya record game di tim ini tapi sudah keluar dari roster)
  playerStatsMap.forEach((p, key) => {
    const teamObj = teams.find((t) => (t.slug || normalizeKey(t.name)) === p.teamSlug);
    if (teamObj) {
      const rawList = teamObj.players || teamObj.members || [];
      const rosterList = Array.isArray(rawList) ? rawList : [];
      const isStillInRoster = rosterList.some((m: any) => {
        const ign = (typeof m === "string" ? m : m.ign || m.name || "").trim();
        return normalizeKey(ign) === normalizeKey(p.name);
      });

      if (!isStillInRoster) {
        p.isExPlayer = true;
      }
    }
  });

  // 5. Filter jika memilih tim tertentu
  let playerList = Array.from(playerStatsMap.values());
  if (selectedTeamSlug && selectedTeamSlug !== "all") {
    playerList = playerList.filter(
      (p) => p.teamSlug === selectedTeamSlug || normalizeKey(p.teamName) === selectedTeamSlug
    );
  }

  // 6. ATURAN SORTIR: Pemain belum pernah main (played === 0) WAJIB DI PALING BAWAH
  playerList.sort((a, b) => {
    // a. Pemain yang sudah main selalu di atas pemain yang belum pernah main
    const aPlayed = a.played > 0 ? 1 : 0;
    const bPlayed = b.played > 0 ? 1 : 0;
    if (bPlayed !== aPlayed) {
      return bPlayed - aPlayed;
    }

    // b. Jika sama-sama sudah main, sortir berdasarkan WIN, WPM, AGG, lalu PLAY
    if (b.won !== a.won) return b.won - a.won;

    const wpmA = a.played > 0 ? a.won / a.played : 0;
    const wpmB = b.played > 0 ? b.won / b.played : 0;
    if (wpmB !== wpmA) return wpmB - wpmA;

    if (b.agg !== a.agg) return b.agg - a.agg;
    if (b.played !== a.played) return b.played - a.played;

    // c. Jika sama-sama belum pernah main (0 semua), sortir secara alfabetis nama
    return a.name.localeCompare(b.name);
  });

  // 7. Berikan peringkat (Rank) & format WPM
  const rankedPlayers: PowerRankingPlayer[] = playerList.map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    teamSlug: p.teamSlug,
    teamName: p.teamName,
    teamLogo: p.teamLogo,
    groupName: p.groupName,
    played: p.played,
    won: p.won,
    lost: p.lost,
    wpm: p.played > 0 ? Number((p.won / p.played).toFixed(1)) : 0,
    agg: p.agg,
    isExPlayer: p.isExPlayer,
    isAdded: p.isAdded,
  }));

  // 8. Hitung Grand Total Roster jika tampilan per tim
  let grandTotal: PowerRankingGrandTotal | undefined = undefined;
  if (selectedTeamSlug && selectedTeamSlug !== "all") {
    const totPlayed = rankedPlayers.reduce((acc, p) => acc + p.played, 0);
    const totWon = rankedPlayers.reduce((acc, p) => acc + p.won, 0);
    const totLost = rankedPlayers.reduce((acc, p) => acc + p.lost, 0);
    const totAgg = rankedPlayers.reduce((acc, p) => acc + p.agg, 0);
    const avgWpm = totPlayed > 0 ? Number((totWon / totPlayed).toFixed(1)) : 0;

    grandTotal = {
      played: totPlayed,
      won: totWon,
      lost: totLost,
      wpm: avgWpm,
      agg: totAgg,
    };
  }

  return {
    players: rankedPlayers,
    grandTotal,
  };
}

// Alias agar kedua nama ekspor valid
export const buildPowerRankingData = calculatePowerRanking;
        
