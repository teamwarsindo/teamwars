import {
  MatchScheduleItem,
  TeamStandingItem,
} from './types';
import { DIVISION_MAP, TOURNAMENT_RULES } from './constants';

export interface ExtendedStandingItem extends TeamStandingItem {
  isTopGroup?: boolean;
  groupColor?: 'GROUP_A' | 'GROUP_B';
  customRankLabel?: string;
  rankTrend?: 'up' | 'down' | 'stay';
}

/**
 * Algoritma Resmi Kalkulasi Klasemen Turnamen:
 * 1. Filter match hingga maxWeek yang dipilih (jika ada).
 * 2. Hitung Match Win-Loss, Set Win-Loss, Round Difference (RD), dan Poin (Win = 10, Lose = 0).
 * 3. Tie-breaker bertingkat:
 *    a. Total Poin (Tertinggi)
 *    b. Total Match Wins (Tertinggi)
 *    c. Round Difference / RD (Tertinggi)
 *    d. Total Set Wins (Tertinggi)
 *    e. Head-to-Head (Jika 2 tim berimbang persis)
 */
export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  maxWeek?: number
): ExtendedStandingItem[] {
  const filteredSchedules = typeof maxWeek === 'number' && maxWeek > 0
    ? schedules.filter((m) => (m.weekNumber || 1) <= maxWeek)
    : schedules;

  const teamMap = new Map<string, ExtendedStandingItem>();

  // 1. Inisialisasi semua master team ke Map
  masterTeams.forEach((t) => {
    const groupName =
      t.groupName === 'Group A' || t.groupName === DIVISION_MAP.GROUP_A
        ? DIVISION_MAP.GROUP_A
        : DIVISION_MAP.GROUP_B;

    teamMap.set(t.name || t.teamName, {
      rank: 1,
      teamId: t.id || t.name || t.teamName,
      teamName: t.name || t.teamName,
      teamLogo: t.logo || t.teamLogo || '/logo.webp',
      groupName,
      matchPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      roundDifference: 0,
      points: 0,
    });
  });

  // 2. Akumulasi hasil setiap pertandingan yang sudah selesai atau memiliki skor
  filteredSchedules.forEach((m) => {
    const isFinished = Boolean(m.isFinished);
    const scoreA = m.scoreA || 0;
    const scoreB = m.scoreB || 0;

    if (!isFinished && scoreA === 0 && scoreB === 0) return;

    let itemA = teamMap.get(m.teamAName);
    let itemB = teamMap.get(m.teamBName);

    if (!itemA) {
      itemA = {
        rank: 1,
        teamId: m.teamAId || m.teamAName,
        teamName: m.teamAName,
        teamLogo: m.teamALogo || '/logo.webp',
        groupName: m.groupName === 'Group A' ? DIVISION_MAP.GROUP_A : m.groupName,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
      };
      teamMap.set(m.teamAName, itemA);
    }

    if (!itemB) {
      itemB = {
        rank: 1,
        teamId: m.teamBId || m.teamBName,
        teamName: m.teamBName,
        teamLogo: m.teamBLogo || '/logo.webp',
        groupName: m.groupName === 'Group B' ? DIVISION_MAP.GROUP_B : m.groupName,
        matchPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        setWins: 0,
        setLosses: 0,
        roundDifference: 0,
        points: 0,
      };
      teamMap.set(m.teamBName, itemB);
    }

    itemA.matchPlayed += 1;
    itemB.matchPlayed += 1;

    itemA.setWins += scoreA;
    itemA.setLosses += scoreB;
    itemB.setWins += scoreB;
    itemB.setLosses += scoreA;

    itemA.roundDifference = itemA.setWins - itemA.setLosses;
    itemB.roundDifference = itemB.setWins - itemB.setLosses;

    if (scoreA > scoreB) {
      itemA.matchWins += 1;
      itemA.points += TOURNAMENT_RULES.POINTS_WIN;
      itemB.matchLosses += 1;
      itemB.points += TOURNAMENT_RULES.POINTS_LOSE;
    } else if (scoreB > scoreA) {
      itemB.matchWins += 1;
      itemB.points += TOURNAMENT_RULES.POINTS_WIN;
      itemA.matchLosses += 1;
      itemA.points += TOURNAMENT_RULES.POINTS_LOSE;
    }
  });

  const allTeams = Array.from(teamMap.values());

  // 3. Helper Sorting Tie-Breaker
  const sortTeams = (teams: ExtendedStandingItem[]) => {
    return teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      if (b.setWins !== a.setWins) return b.setWins - a.setWins;

      // Head to Head check
      const h2hMatch = filteredSchedules.find(
        (m) =>
          (m.teamAName === a.teamName && m.teamBName === b.teamName) ||
          (m.teamAName === b.teamName && m.teamBName === a.teamName)
      );

      if (h2hMatch && (h2hMatch.scoreA > 0 || h2hMatch.scoreB > 0)) {
        const aScore = h2hMatch.teamAName === a.teamName ? h2hMatch.scoreA : h2hMatch.scoreB;
        const bScore = h2hMatch.teamBName === b.teamName ? h2hMatch.scoreB : h2hMatch.scoreA;
        if (aScore !== bScore) return bScore - aScore;
      }

      return a.teamName.localeCompare(b.teamName);
    });
  };

  const groupATeams = sortTeams(allTeams.filter((t) => t.groupName === DIVISION_MAP.GROUP_A)).map(
    (t, idx) => ({ ...t, rank: idx + 1 })
  );

  const groupBTeams = sortTeams(allTeams.filter((t) => t.groupName === DIVISION_MAP.GROUP_B)).map(
    (t, idx) => ({ ...t, rank: idx + 1 })
  );

  return [...groupATeams, ...groupBTeams];
}