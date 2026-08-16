import {
  MatchScheduleItem,
  TeamStandingItem,
} from './types';
import { DIVISION_MAP } from './constants';

export interface ExtendedStandingItem extends TeamStandingItem {
  isTopGroup?: boolean;
  groupColor?: 'GROUP_A' | 'GROUP_B';
  customRankLabel?: string;
  rankTrend?: 'up' | 'down' | 'stay';
}

export function calculateStandings(
  schedules: MatchScheduleItem[] = [],
  masterTeams: any[] = [],
  maxWeek?: number
): ExtendedStandingItem[] {
  const filteredSchedules =
    typeof maxWeek === 'number' && maxWeek > 0
      ? schedules.filter((m) => (m.weekNumber || 1) <= maxWeek)
      : schedules;

  const teamMap = new Map<string, ExtendedStandingItem>();

  // 1. Inisialisasi tim master
  masterTeams.forEach((t) => {
    const groupName =
      t.groupName === 'Group A' || t.groupName === DIVISION_MAP.GROUP_A
        ? DIVISION_MAP.GROUP_A
        : DIVISION_MAP.GROUP_B;

    const tName = t.name || t.teamName;
    teamMap.set(tName, {
      rank: 1,
      teamId: t.id || tName,
      teamName: tName,
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

  // 2. Akumulasi hasil pertandingan
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

    // 🟢 REGULASI POIN: Menang = 10 Poin, Kalah = Poin dari skor set yang dimenangkan
    if (scoreA > scoreB) {
      itemA.matchWins += 1;
      itemA.points += 10;
      itemB.matchLosses += 1;
      itemB.points += scoreB;
    } else if (scoreB > scoreA) {
      itemB.matchWins += 1;
      itemB.points += 10;
      itemA.matchLosses += 1;
      itemA.points += scoreA;
    }
  });

  const allTeams = Array.from(teamMap.values());

  const sortTeams = (teams: ExtendedStandingItem[]) => {
    return teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      if (b.setWins !== a.setWins) return b.setWins - a.setWins;

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