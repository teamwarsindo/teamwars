interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
  games: any[];
  isFinished: boolean;
}

export function ReportLineup({ lineupA, lineupB, games, isFinished }: ReportLineupProps) {
  // Hitung Skor Individu Player
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
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs space-y-2.5">
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
                className="px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-center transition min-w-0 flex items-center justify-center gap-1.5"
              >
                {isRevealed && p ? (
                  <>
                    <span
                      className={`text-[11px] sm:text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/45"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && stats && (
                      <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-background/80 border border-border/60 text-muted-foreground shrink-0">
                        <span className="text-emerald-700 dark:text-emerald-400">{stats.wins}</span>
                        <span className="opacity-40">-</span>
                        <span className="text-rose-600 dark:text-rose-400">{stats.losses}</span>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-medium text-muted-foreground/40 italic text-[10px]">
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
                className="px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-center transition min-w-0 flex items-center justify-center gap-1.5"
              >
                {isRevealed && p ? (
                  <>
                    <span
                      className={`text-[11px] sm:text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/45"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && stats && (
                      <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-background/80 border border-border/60 text-muted-foreground shrink-0">
                        <span className="text-emerald-700 dark:text-emerald-400">{stats.wins}</span>
                        <span className="opacity-40">-</span>
                        <span className="text-rose-600 dark:text-rose-400">{stats.losses}</span>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-medium text-muted-foreground/40 italic text-[10px]">
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
