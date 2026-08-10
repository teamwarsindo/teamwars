import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";

export interface ExtendedStandingItem extends TeamStandingItem {
  previousRank?: number;
  rankTrend?: "up" | "down" | "stay";
  isTopGroup?: boolean;
}

function getMatchWeek(m: MatchScheduleItem): number {
  if (typeof m.weekNumber === "number" && m.weekNumber > 0) {
    return m.weekNumber;
  }
  if (m.matchDate) {
    const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
    const matchDate = new Date(m.matchDate).getTime();
    if (!isNaN(matchDate)) {
      const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
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
  const targetWeek: number = typeof upToWeek === "number" ? upToWeek : maxWeek;

  // Filter match yang sudah bertanding s/d targetWeek
  const filteredMatches = schedules.filter((m) => {
    const isPlayed = Boolean(m.isFinished || (m.scoreA || 0) + (m.scoreB || 0) > 0);
    if (!isPlayed) return false;

    if (targetWeek >= maxWeek) return true;
    return getMatchWeek(m) <= targetWeek;
  });

  const statsMap = new Map<string, ExtendedStandingItem>();

  // Inisialisasi daftar tim
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
        setWins: 0, // setWins nanti diisi murni sama dengan matchWins (total W)
        setLosses: 0,
        roundDifference: 0,
        points: 0,
      });
    }
  });

  // Kalkulasi Skor Pertandingan
  filteredMatches.forEach((m) => {
    const teamA = statsMap.get(m.teamAName);
    const teamB = statsMap.get(m.teamBName);

    const sA = Number(m.scoreA) || 0; // Poin game Tim A (misal 10)
    const sB = Number(m.scoreB) || 0; // Poin game Tim B (misal 6)

    if (teamA) {
      teamA.matchPlayed += 1;
      teamA.points += sA; // 🟢 Tim A dapat sA Poin (10)
      teamA.setLosses += sB;
      teamA.roundDifference += sA - sB;

      if (sA > sB) {
        teamA.matchWins += 1; // Menang Match (W)
      } else if (sA < sB) {
        teamA.matchLosses += 1; // Kalah Match (L)
      }
      teamA.setWins = teamA.matchWins; // 🟢 Set Wins murni mengambil total nilai W
    }

    if (teamB) {
      teamB.matchPlayed += 1;
      teamB.points += sB; // 🟢 Tim B tetap dapat sB Poin meskipun kalah (6)
      teamB.setLosses += sA;
      teamB.roundDifference += sB - sA;

      if (sB > sA) {
        teamB.matchWins += 1;
      } else if (sB < sA) {
        teamB.matchLosses += 1;
      }
      teamB.setWins = teamB.matchWins; // 🟢 Set Wins murni mengambil total nilai W
    }
  });

  const standingsList = Array.from(statsMap.values());

  // Urutan Klasemen: Points (Total Skor Game) -> Match Wins -> Round Difference
  standingsList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    return b.roundDifference - a.roundDifference;
  });

  standingsList.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Hitung Indikator Trend (Naik/Turun/Stay)
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
