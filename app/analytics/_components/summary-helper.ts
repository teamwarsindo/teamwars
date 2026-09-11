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

export interface TeamSummaryStat {
  topPlayer: {
    ign: string;
    wins: number;
    losses: number;
    agregat: number;
    wr: string;
  };
  maxStreak: {
    player: string;
    count: number;
    range: string;
    deck: string;
    skill: string;
  };
  playerAktifCount: number;
  teamWR: string;
  playerPoin: string;
  mostDeck: {
    name: string;
    wins: number;
    losses: number;
    wr: string;
    users: string;
  };
}

export function computeTeamSummary(
  games: GameRecord[],
  isTeamA: boolean,
  teamScore: number
): TeamSummaryStat {
  const winsMap: Record<string, { wins: number; losses: number; firstSeen: number }> = {};
  const deckMap: Record<string, { wins: number; losses: number; users: Set<string>; firstSeen: number }> = {};
  const activePlayers = new Set<string>();

  let currentStreakPlayer = "";
  let currentStreakCount = 0;
  let currentStreakStart = 1;
  let currentStreakDeck = "";
  let currentStreakSkill = "";

  let maxStreakPlayer = "";
  let maxStreakCount = 0;
  let maxStreakStart = 1;
  let maxStreakEnd = 1;
  let maxStreakDeck = "";
  let maxStreakSkill = "";

  games.forEach((g, idx) => {
    const gNum = idx + 1;
    const isWinner = isTeamA ? g.winner === "teamA" : g.winner === "teamB";
    const p = isTeamA ? g.playerA : g.playerB;
    const ign = p?.ign || "";
    const deck = p?.archetype || "Unknown Deck";
    const skill = p?.skillAbbr || p?.skill || "-";

    if (ign) {
      activePlayers.add(ign);
      if (!winsMap[ign]) winsMap[ign] = { wins: 0, losses: 0, firstSeen: gNum };
      if (!deckMap[deck]) deckMap[deck] = { wins: 0, losses: 0, users: new Set(), firstSeen: gNum };
      deckMap[deck].users.add(ign);

      if (isWinner) {
        winsMap[ign].wins += 1;
        deckMap[deck].wins += 1;

        if (currentStreakPlayer === ign) {
          currentStreakCount += 1;
        } else {
          currentStreakPlayer = ign;
          currentStreakCount = 1;
          currentStreakStart = gNum;
          currentStreakDeck = deck;
          currentStreakSkill = skill;
        }

        if (currentStreakCount > maxStreakCount) {
          maxStreakCount = currentStreakCount;
          maxStreakPlayer = currentStreakPlayer;
          maxStreakStart = currentStreakStart;
          maxStreakEnd = gNum;
          maxStreakDeck = currentStreakDeck;
          maxStreakSkill = currentStreakSkill;
        }
      } else {
        winsMap[ign].losses += 1;
        deckMap[deck].losses += 1;
        if (currentStreakPlayer === ign) {
          currentStreakPlayer = "";
          currentStreakCount = 0;
        }
      }
    }
  });

  // Tiebreaker Top Player
  const playerEntries = Object.entries(winsMap).map(([ign, s]) => {
    const total = s.wins + s.losses;
    return {
      ign,
      wins: s.wins,
      losses: s.losses,
      total,
      agregat: s.wins - s.losses,
      wrNum: total > 0 ? (s.wins / total) * 100 : 0,
      wr: total > 0 ? ((s.wins / total) * 100).toFixed(1) : "0.0",
      firstSeen: s.firstSeen,
    };
  });

  const topPlayer = playerEntries.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.agregat - a.agregat ||
      b.wrNum - a.wrNum ||
      a.total - b.total ||
      a.firstSeen - b.firstSeen
  )[0] || {
    ign: "-",
    wins: 0,
    losses: 0,
    agregat: 0,
    wr: "0.0",
  };

  // Agregat Tim
  const playerAktifCount = activePlayers.size;
  const teamWR = games.length > 0 ? ((teamScore / games.length) * 100).toFixed(1) : "0.0";
  const playerPoin = playerAktifCount > 0 ? (teamScore / playerAktifCount).toFixed(1) : "0.0";

  // Tiebreaker Most Played Deck
  const deckEntries = Object.entries(deckMap).map(([name, d]) => {
    const total = d.wins + d.losses;
    return {
      name,
      total,
      wins: d.wins,
      losses: d.losses,
      wrNum: total > 0 ? (d.wins / total) * 100 : 0,
      wr: total > 0 ? ((d.wins / total) * 100).toFixed(0) : "0",
      users: Array.from(d.users).join(", "),
      firstSeen: d.firstSeen,
    };
  });

  const mostDeck = deckEntries.sort(
    (a, b) =>
      b.total - a.total ||
      b.wins - a.wins ||
      b.wrNum - a.wrNum ||
      a.firstSeen - b.firstSeen
  )[0] || {
    name: "-",
    wins: 0,
    losses: 0,
    wr: "0",
    users: "-",
  };

  return {
    topPlayer,
    maxStreak: {
      player: maxStreakPlayer || "-",
      count: maxStreakCount,
      range: maxStreakCount > 0 ? `G${maxStreakStart} — G${maxStreakEnd}` : "-",
      deck: maxStreakDeck || "-",
      skill: maxStreakSkill || "-",
    },
    playerAktifCount,
    teamWR,
    playerPoin,
    mostDeck,
  };
          }
