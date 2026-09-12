interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
  games: any[];
  isFinished: boolean;
  isMatchStarted?: boolean;
}

export function ReportLineup({ lineupA, lineupB, games, isFinished }: ReportLineupProps) {
  const statsMap: Record<string, { wins: number; losses: number }> = {};
  const activePlayers = new Set<string>();

  games.forEach((g) => {
    const isWinnerA = g.winner === "teamA";
    const ignA = g.playerA?.ign;
    const ignB = g.playerB?.ign;

    if (ignA) {
      activePlayers.add(ignA);
      if (!statsMap[ignA]) statsMap[ignA] = { wins: 0, losses: 0 };
      if (isWinnerA) statsMap[ignA].wins += 1;
      else statsMap[ignA].losses += 1;
    }
    if (ignB) {
      activePlayers.add(ignB);
      if (!statsMap[ignB]) statsMap[ignB] = { wins: 0, losses: 0 };
      if (!isWinnerA) statsMap[ignB].wins += 1;
      else statsMap[ignB].losses += 1;
    }
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2">
      <div className="text-center font-black text-xs uppercase tracking-wider text-muted-foreground">
        Lineup Duelist
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Kolom Kubu A */}
        <div className="space-y-1.5">
          {lineupA.map((p, idx) => {
            const hasPlayed = p && activePlayers.has(p.ign);
            const isRevealed = isFinished || hasPlayed;
            const stats = p ? statsMap[p.ign] : null;

            return (
              <div
                key={idx}
                className="h-8 px-2.5 rounded-xl border border-border/60 bg-muted/20 text-center flex items-center justify-between min-w-0"
              >
                {isRevealed && p ? (
                  <>
                    <span
                      className={`text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/50"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && stats && (
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-black">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {stats.wins}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          {stats.losses}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="w-full text-center font-medium text-muted-foreground/40 italic text-[11px]">
                    🔒 Menunggu giliran
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Kolom Kubu B */}
        <div className="space-y-1.5">
          {lineupB.map((p, idx) => {
            const hasPlayed = p && activePlayers.has(p.ign);
            const isRevealed = isFinished || hasPlayed;
            const stats = p ? statsMap[p.ign] : null;

            return (
              <div
                key={idx}
                className="h-8 px-2.5 rounded-xl border border-border/60 bg-muted/20 text-center flex items-center justify-between min-w-0"
              >
                {isRevealed && p ? (
                  <>
                    <span
                      className={`text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/50"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && stats && (
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-black">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {stats.wins}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          {stats.losses}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="w-full text-center font-medium text-muted-foreground/40 italic text-[11px]">
                    🔒 Menunggu giliran
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
