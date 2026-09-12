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
    skillAbbr: string;
  };
  playerAktifCount: number;
  teamWR: string;
  playerPoin: string;
  mostDeck: {
    name: string;
    skillsList: string;
    recordStr: string;
    wrStr: string;
    users: string;
  };
}

export function computeTeamSummary(
  games: GameRecord[],
  isTeamA: boolean,
  teamScore: number
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
      skillsSet: Set<string>;
      firstSeen: number;
    }
  > = {};

  const activePlayers = new Set<string>();

  let overallStreakPlayer = "";
  let overallStreakCount = 0;
  let overallStreakStart = 1;
  let overallStreakDeck = "";
  let overallStreakSkillAbbr = "";

  let topOverallStreakPlayer = "";
  let topOverallStreakCount = 0;
  let topOverallStreakStart = 1;
  let topOverallStreakEnd = 1;
  let topOverallStreakDeck = "";
  let topOverallStreakSkillAbbr = "";

  games.forEach((g, idx) => {
    const gNum = idx + 1;
    const isWinner = isTeamA ? g.winner === "teamA" : g.winner === "teamB";
    const p = isTeamA ? g.playerA : g.playerB;
    const ign = p?.ign || "";
    const deck = p?.archetype || "Unknown Deck";
    const skillAbbr = p?.skillAbbr || p?.skill || "-";

    if (ign) {
      activePlayers.add(ign);

      if (!winsMap[ign]) {
        winsMap[ign] = { wins: 0, losses: 0, maxStreak: 0, currentStreak: 0, firstSeen: gNum };
      }

      if (!deckMap[deck]) {
        deckMap[deck] = { wins: 0, losses: 0, users: new Set(), skillsSet: new Set(), firstSeen: gNum };
      }

      deckMap[deck].users.add(ign);
      if (skillAbbr && skillAbbr !== "-") {
        deckMap[deck].skillsSet.add(skillAbbr);
      }

      if (isWinner) {
        winsMap[ign].wins += 1;
        winsMap[ign].currentStreak += 1;
        if (winsMap[ign].currentStreak > winsMap[ign].maxStreak) {
          winsMap[ign].maxStreak = winsMap[ign].currentStreak;
        }

        deckMap[deck].wins += 1;

        if (overallStreakPlayer === ign) {
          overallStreakCount += 1;
        } else {
          overallStreakPlayer = ign;
          overallStreakCount = 1;
          overallStreakStart = gNum;
          overallStreakDeck = deck;
          overallStreakSkillAbbr = skillAbbr;
        }

        if (overallStreakCount > topOverallStreakCount) {
          topOverallStreakCount = overallStreakCount;
          topOverallStreakPlayer = overallStreakPlayer;
          topOverallStreakStart = overallStreakStart;
          topOverallStreakEnd = gNum;
          topOverallStreakDeck = overallStreakDeck;
          topOverallStreakSkillAbbr = overallStreakSkillAbbr;
        }
      } else {
        winsMap[ign].losses += 1;
        winsMap[ign].currentStreak = 0;
        deckMap[deck].losses += 1;

        if (overallStreakPlayer === ign) {
          overallStreakPlayer = "";
          overallStreakCount = 0;
        }
      }
    }
  });

  // 1. Top Player: Cek Win -> Cek Agregat -> Cek Win Streak -> First Seen
  const playerEntries = Object.entries(winsMap).map(([ign, s]) => {
    const total = s.wins + s.losses;
    return {
      ign,
      wins: s.wins,
      losses: s.losses,
      agregat: s.wins - s.losses,
      maxStreak: s.maxStreak,
      wr: total > 0 ? ((s.wins / total) * 100).toFixed(1) : "0.0",
      firstSeen: s.firstSeen,
    };
  });

  const topPlayer = playerEntries.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.agregat - a.agregat ||
      b.maxStreak - a.maxStreak ||
      a.firstSeen - b.firstSeen
  )[0] || {
    ign: "-",
    wins: 0,
    losses: 0,
    agregat: 0,
    wr: "0.0",
  };

  // 2. Agregat Tim
  const playerAktifCount = activePlayers.size;
  const teamWR = games.length > 0 ? ((teamScore / games.length) * 100).toFixed(1) : "0.0";
  const playerPoin = playerAktifCount > 0 ? (teamScore / playerAktifCount).toFixed(1) : "0.0";

  // 3. Most Played Deck: Cek Total Pick -> Cek Win -> Cek Agregat
  const deckEntries = Object.entries(deckMap).map(([name, d]) => {
    const total = d.wins + d.losses;
    const agregat = d.wins - d.losses;
    const wr = total > 0 ? Math.round((d.wins / total) * 100) : 0;
    const skillsList = d.skillsSet.size > 0 ? Array.from(d.skillsSet).join(", ") : "-";

    return {
      name,
      total,
      wins: d.wins,
      losses: d.losses,
      agregat,
      skillsList,
      wrStr: `${wr}%`,
      recordStr: `${d.wins} Win - ${d.losses} Lose`,
      users: Array.from(d.users).join(", "),
      firstSeen: d.firstSeen,
    };
  });

  const mostDeck = deckEntries.sort(
    (a, b) =>
      b.total - a.total ||
      b.wins - a.wins ||
      b.agregat - a.agregat ||
      a.firstSeen - b.firstSeen
  )[0] || {
    name: "-",
    skillsList: "-",
    recordStr: "0 Win - 0 Lose",
    wrStr: "0%",
    users: "-",
  };

  return {
    topPlayer,
    maxStreak: {
      player: topOverallStreakPlayer || "-",
      count: topOverallStreakCount,
      range: topOverallStreakCount > 0 ? `G${topOverallStreakStart} — G${topOverallStreakEnd}` : "-",
      deck: topOverallStreakDeck || "-",
      skillAbbr: topOverallStreakSkillAbbr || "-",
    },
    playerAktifCount,
    teamWR,
    playerPoin,
    mostDeck,
  };
}
