export interface DuelistEntry {
  ign: string;
  archetype?: string;
  skill?: string;
  skillAbbr?: string;
}

export interface GameRecord {
  winner: "teamA" | "teamB";
  playerA?: DuelistEntry;
  playerB?: DuelistEntry;
  isRepeatA?: boolean;
  isRepeatB?: boolean;
  isDeckloss?: boolean;
  decklossTeam?: "teamA" | "teamB";
}

export interface PlayerSummaryStat {
  ign: string;
  wins: number;
  losses: number;
  agregat: number;
  wpmVal: number;
}

export interface StreakSummaryStat {
  player: string;
  count: number;
  rangeStr: string;
  deck: string;
  hasStreak: boolean;
}

export interface ArchetypeSummaryStat {
  name: string;
  wins: number;
  losses: number;
  agregat: number;
  wpmVal: number;
  users: string;
}

export interface TeamSummaryStat {
  topPlayer: PlayerSummaryStat;
  maxStreak: StreakSummaryStat;
  bestDeck: ArchetypeSummaryStat;
  mostDeck: ArchetypeSummaryStat;
}

export function computeTeamSummary(
  games: GameRecord[],
  isTeamA: boolean
): TeamSummaryStat {
  const winsMap: Record<
    string,
    { wins: number; losses: number; maxStreak: number; currentStreak: number; firstSeen: number }
  > = {};

  const deckMap: Record<
    string,
    {
      wins: number;
      losses: number;
      users: Set<string>;
      firstSeen: number;
    }
  > = {};

  let currentStreakPlayer = "";
  let currentStreakCount = 0;
  let currentStreakStart = 1;
  let currentStreakDeck = "";

  let topStreakPlayer = "";
  let topStreakCount = 0;
  let topStreakStart = 1;
  let topStreakEnd = 1;
  let topStreakDeck = "";

  games.forEach((g, idx) => {
    const gNum = idx + 1;
    const isWinner = isTeamA ? g.winner === "teamA" : g.winner === "teamB";
    const p = isTeamA ? g.playerA : g.playerB;
    const ign = p?.ign || "";
    const deck = p?.archetype || "Unknown Deck";

    if (ign) {
      if (!winsMap[ign]) {
        winsMap[ign] = { wins: 0, losses: 0, maxStreak: 0, currentStreak: 0, firstSeen: gNum };
      }

      if (!deckMap[deck]) {
        deckMap[deck] = { wins: 0, losses: 0, users: new Set(), firstSeen: gNum };
      }

      deckMap[deck].users.add(ign);

      if (isWinner) {
        winsMap[ign].wins += 1;
        winsMap[ign].currentStreak += 1;
        if (winsMap[ign].currentStreak > winsMap[ign].maxStreak) {
          winsMap[ign].maxStreak = winsMap[ign].currentStreak;
        }

        deckMap[deck].wins += 1;

        if (currentStreakPlayer === ign) {
          currentStreakCount += 1;
        } else {
          currentStreakPlayer = ign;
          currentStreakCount = 1;
          currentStreakStart = gNum;
          currentStreakDeck = deck;
        }

        if (currentStreakCount > topStreakCount) {
          topStreakCount = currentStreakCount;
          topStreakPlayer = currentStreakPlayer;
          topStreakStart = currentStreakStart;
          topStreakEnd = gNum;
          topStreakDeck = currentStreakDeck;
        }
      } else {
        winsMap[ign].losses += 1;
        winsMap[ign].currentStreak = 0;
        deckMap[deck].losses += 1;

        if (currentStreakPlayer === ign) {
          currentStreakPlayer = "";
          currentStreakCount = 0;
        }
      }
    }
  });

  // 1. Top Player
  const playerEntries = Object.entries(winsMap).map(([ign, s]) => {
    const total = s.wins + s.losses;
    const agregat = s.wins - s.losses;
    const wpmVal = total > 0 ? Math.round((s.wins / total) * 100) : 0;
    return {
      ign,
      wins: s.wins,
      losses: s.losses,
      agregat,
      maxStreak: s.maxStreak,
      wpmVal,
      firstSeen: s.firstSeen,
    };
  });

  const topPlayerRaw = playerEntries.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.agregat - a.agregat ||
      b.maxStreak - a.maxStreak ||
      a.firstSeen - b.firstSeen
  )[0];

  const topPlayer: PlayerSummaryStat = topPlayerRaw
    ? {
        ign: topPlayerRaw.ign,
        wins: topPlayerRaw.wins,
        losses: topPlayerRaw.losses,
        agregat: topPlayerRaw.agregat,
        wpmVal: topPlayerRaw.wpmVal,
      }
    : {
        ign: "-",
        wins: 0,
        losses: 0,
        agregat: 0,
        wpmVal: 0,
      };

  // 2. Top Streak (Hanya jika streak >= 2)
  const hasStreak = topStreakCount >= 2;
  const maxStreak: StreakSummaryStat = {
    player: hasStreak ? topStreakPlayer : "-",
    count: hasStreak ? topStreakCount : 0,
    rangeStr: hasStreak ? `G${topStreakStart} — G${topStreakEnd}` : "-",
    deck: hasStreak ? topStreakDeck : "-",
    hasStreak,
  };

  // Mapping Deck Base
  const deckEntries = Object.entries(deckMap).map(([name, d]) => {
    const total = d.wins + d.losses;
    const agregat = d.wins - d.losses;
    const wpmVal = total > 0 ? Math.round((d.wins / total) * 100) : 0;

    return {
      name,
      total,
      wins: d.wins,
      losses: d.losses,
      agregat,
      wpmVal,
      users: Array.from(d.users).join(", "),
      firstSeen: d.firstSeen,
    };
  });

  // 3. Best Archetype: Filter main >= 2x (fallback 1x jika tidak ada)
  const decksWithMin2 = deckEntries.filter((d) => d.total >= 2);
  const eligibleDecks = decksWithMin2.length > 0 ? decksWithMin2 : deckEntries;

  const bestDeckRaw = [...eligibleDecks].sort(
    (a, b) =>
      b.agregat - a.agregat ||
      b.wins - a.wins ||
      b.wpmVal - a.wpmVal ||
      a.firstSeen - b.firstSeen
  )[0];

  const bestDeck: ArchetypeSummaryStat = bestDeckRaw
    ? {
        name: bestDeckRaw.name,
        wins: bestDeckRaw.wins,
        losses: bestDeckRaw.losses,
        agregat: bestDeckRaw.agregat,
        wpmVal: bestDeckRaw.wpmVal,
        users: bestDeckRaw.users,
      }
    : {
        name: "-",
        wins: 0,
        losses: 0,
        agregat: 0,
        wpmVal: 0,
        users: "-",
      };

  // 4. Most Played Archetype: Total Pick > Total Win > Agregat > First Seen
  const mostDeckRaw = [...deckEntries].sort(
    (a, b) =>
      b.total - a.total ||
      b.wins - a.wins ||
      b.agregat - a.agregat ||
      a.firstSeen - b.firstSeen
  )[0];

  const mostDeck: ArchetypeSummaryStat = mostDeckRaw
    ? {
        name: mostDeckRaw.name,
        wins: mostDeckRaw.wins,
        losses: mostDeckRaw.losses,
        agregat: mostDeckRaw.agregat,
        wpmVal: mostDeckRaw.wpmVal,
        users: mostDeckRaw.users,
      }
    : {
        name: "-",
        wins: 0,
        losses: 0,
        agregat: 0,
        wpmVal: 0,
        users: "-",
      };

  return {
    topPlayer,
    maxStreak,
    bestDeck,
    mostDeck,
  };
}
