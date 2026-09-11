interface ReportSummaryProps {
  games: any[];
  isFinished: boolean;
  scoreA: number;
  scoreB: number;
  teamAName: string;
  teamBName: string;
  lineupA: any[];
  lineupB: any[];
  liveInstruction: { nextGameNumber: number; stayTable: string; nextActionTeam: string } | null;
}

export function ReportSummary({
  games,
  isFinished,
  scoreA,
  scoreB,
  teamAName,
  teamBName,
  lineupA,
  lineupB,
  liveInstruction,
}: ReportSummaryProps) {
  if (!isFinished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-2 text-xs">
        {liveInstruction ? (
          <>
            <div className="font-black text-amber-500 uppercase tracking-wide flex items-center justify-between">
              <span className="animate-pulse">Instruksi Game #{liveInstruction.nextGameNumber}</span>
              <span className="text-[10px] font-mono text-muted-foreground font-normal">
                {games.length} Game Dimainkan
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="text-foreground">• <strong>{liveInstruction.stayTable}</strong> (Stay table)</div>
              <div className="text-muted-foreground">• <strong>{liveInstruction.nextActionTeam}:</strong> (Next deck or repeat)</div>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground text-center">
            Pertandingan siap dimulai. Menunggu ronde pertama dari wasit.
          </div>
        )}
      </div>
    );
  }

  // Helper Menghitung Statistik Tim
  const computeTeamStats = (isTeamA: boolean) => {
    const winsMap: Record<string, { wins: number; losses: number }> = {};
    const deckMap: Record<string, { wins: number; losses: number; users: Set<string> }> = {};
    const activePlayers = new Set<string>();

    let currentStreakPlayer = "";
    let currentStreakCount = 0;
    let currentStreakStart = 1;
    let currentStreakDeck = "";

    let maxStreakPlayer = "";
    let maxStreakCount = 0;
    let maxStreakStart = 1;
    let maxStreakEnd = 1;
    let maxStreakDeck = "";

    games.forEach((g, idx) => {
      const gNum = idx + 1;
      const isWinner = isTeamA ? g.winner === "teamA" : g.winner === "teamB";
      const p = isTeamA ? g.playerA : g.playerB;
      const ign = p?.ign || "";
      const deck = p?.archetype || "Unknown Deck";

      if (ign) {
        activePlayers.add(ign);
        if (!winsMap[ign]) winsMap[ign] = { wins: 0, losses: 0 };
        if (!deckMap[deck]) deckMap[deck] = { wins: 0, losses: 0, users: new Set() };
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
          }

          if (currentStreakCount > maxStreakCount) {
            maxStreakCount = currentStreakCount;
            maxStreakPlayer = currentStreakPlayer;
            maxStreakStart = currentStreakStart;
            maxStreakEnd = gNum;
            maxStreakDeck = currentStreakDeck;
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

    // Top Player
    const playerEntries = Object.entries(winsMap).map(([ign, s]) => ({
      ign,
      wins: s.wins,
      losses: s.losses,
      agregat: s.wins - s.losses,
      wr: s.wins + s.losses > 0 ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(1) : "0.0",
    }));

    const topPlayer = playerEntries.sort((a, b) => b.wins - a.wins || b.agregat - a.agregat)[0] || {
      ign: "-",
      wins: 0,
      losses: 0,
      agregat: 0,
      wr: "0.0",
    };

    // Agregat Tim
    const totalTeamWins = isTeamA ? scoreA : scoreB;
    const playerAktifCount = activePlayers.size;
    const teamWR = games.length > 0 ? ((totalTeamWins / games.length) * 100).toFixed(1) : "0.0";
    const playerPoin = playerAktifCount > 0 ? (totalTeamWins / playerAktifCount).toFixed(1) : "0.0";

    // Most Played Deck
    const deckEntries = Object.entries(deckMap).map(([name, d]) => ({
      name,
      total: d.wins + d.losses,
      wins: d.wins,
      losses: d.losses,
      wr: d.wins + d.losses > 0 ? ((d.wins / (d.wins + d.losses)) * 100).toFixed(0) : "0",
      users: Array.from(d.users).join(", "),
    }));

    const mostDeck = deckEntries.sort((a, b) => b.total - a.total || b.wins - a.wins)[0] || {
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
      },
      playerAktifCount,
      teamWR,
      playerPoin,
      mostDeck,
    };
  };

  const statA = computeTeamStats(true);
  const statB = computeTeamStats(false);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="p-2.5 bg-muted/30 border-b border-border text-center">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Match Summary
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/60 p-3 sm:p-4 text-xs gap-x-2">
        {/* Kolom Tim A */}
        <div className="space-y-3 pr-1 sm:pr-2">
          {/* Top Player */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Top Player</div>
            <div className="font-bold text-foreground truncate">
              {statA.topPlayer.ign} ({statA.topPlayer.wins}-{statA.topPlayer.losses})
            </div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              Agregat: {statA.topPlayer.agregat > 0 ? `+${statA.topPlayer.agregat}` : statA.topPlayer.agregat}
            </div>
            <div className="text-[10px] text-muted-foreground/80">
              Winrate: {statA.topPlayer.wr}%
            </div>
          </div>

          {/* Top Streak */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Top Streak</div>
            <div className="font-bold text-foreground truncate">{statA.maxStreak.player}</div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              {statA.maxStreak.count > 0 ? `${statA.maxStreak.count} Streak (${statA.maxStreak.range})` : "-"}
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              Deck: {statA.maxStreak.deck}
            </div>
          </div>

          {/* Agregat Tim */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Agregat Tim</div>
            <div className="text-[11px] text-foreground font-medium mt-0.5">
              Player Aktif: {statA.playerAktifCount}/5
            </div>
            <div className="text-[11px] text-foreground font-medium">
              Winrate Tim: {statA.teamWR}%
            </div>
            <div className="text-[11px] text-foreground font-medium">
              Player Poin: {statA.playerPoin}
            </div>
          </div>

          {/* Most Played Deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Most Played Deck</div>
            <div className="font-bold text-foreground truncate mt-0.5">
              {statA.mostDeck.name} ({statA.mostDeck.wins}-{statA.mostDeck.losses})
            </div>
            <div className="text-[10px] text-muted-foreground/80">
              Winrate: {statA.mostDeck.wr}%
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              Player: {statA.mostDeck.users}
            </div>
          </div>
        </div>

        {/* Kolom Tim B */}
        <div className="space-y-3 pl-2 sm:pl-3">
          {/* Top Player */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Top Player</div>
            <div className="font-bold text-foreground truncate">
              {statB.topPlayer.ign} ({statB.topPlayer.wins}-{statB.topPlayer.losses})
            </div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              Agregat: {statB.topPlayer.agregat > 0 ? `+${statB.topPlayer.agregat}` : statB.topPlayer.agregat}
            </div>
            <div className="text-[10px] text-muted-foreground/80">
              Winrate: {statB.topPlayer.wr}%
            </div>
          </div>

          {/* Top Streak */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Top Streak</div>
            <div className="font-bold text-foreground truncate">{statB.maxStreak.player}</div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              {statB.maxStreak.count > 0 ? `${statB.maxStreak.count} Streak (${statB.maxStreak.range})` : "-"}
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              Deck: {statB.maxStreak.deck}
            </div>
          </div>

          {/* Agregat Tim */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Agregat Tim</div>
            <div className="text-[11px] text-foreground font-medium mt-0.5">
              Player Aktif: {statB.playerAktifCount}/5
            </div>
            <div className="text-[11px] text-foreground font-medium">
              Winrate Tim: {statB.teamWR}%
            </div>
            <div className="text-[11px] text-foreground font-medium">
              Player Poin: {statB.playerPoin}
            </div>
          </div>

          {/* Most Played Deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Most Played Deck</div>
            <div className="font-bold text-foreground truncate mt-0.5">
              {statB.mostDeck.name} ({statB.mostDeck.wins}-{statB.mostDeck.losses})
            </div>
            <div className="text-[10px] text-muted-foreground/80">
              Winrate: {statB.mostDeck.wr}%
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              Player: {statB.mostDeck.users}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
      }
