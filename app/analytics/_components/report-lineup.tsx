interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
  games: any[];
}

export function ReportLineup({ lineupA, lineupB, games }: ReportLineupProps) {
  // Hitung Skor Individu W-L untuk tiap pemain
  const statsMap: Record<string, { wins: number; losses: number }> = {};

  games.forEach((g) => {
    const isWinnerA = g.winner === "teamA";
    const ignA = g.playerA?.ign;
    const ignB = g.playerB?.ign;

    if (ignA) {
      if (!statsMap[ignA]) statsMap[ignA] = { wins: 0, losses: 0 };
      if (isWinnerA) statsMap[ignA].wins += 1;
      else statsMap[ignA].losses += 1;
    }
    if (ignB) {
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
            const stats = p ? statsMap[p.ign] : null;
            const hasPlayed = stats && (stats.wins > 0 || stats.losses > 0);

            return (
              <div
                key={idx}
                className={`px-2.5 py-1.5 rounded-lg border text-center transition min-w-0 flex items-center justify-center gap-1.5 ${
                  idx % 2 === 0 ? "bg-muted/30 border-border/50" : "bg-background/70 border-border/30"
                }`}
              >
                {p ? (
                  <>
                    <span
                      className={`text-[11px] sm:text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/45"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && (
                      <span className="font-mono text-[10px] shrink-0 font-bold">
                        <span className="text-emerald-500">{stats.wins}</span>
                        <span className="text-muted-foreground/40 font-normal">-</span>
                        <span className="text-rose-500">{stats.losses}</span>
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
            const stats = p ? statsMap[p.ign] : null;
            const hasPlayed = stats && (stats.wins > 0 || stats.losses > 0);

            return (
              <div
                key={idx}
                className={`px-2.5 py-1.5 rounded-lg border text-center transition min-w-0 flex items-center justify-center gap-1.5 ${
                  idx % 2 === 0 ? "bg-muted/30 border-border/50" : "bg-background/70 border-border/30"
                }`}
              >
                {p ? (
                  <>
                    <span
                      className={`text-[11px] sm:text-xs truncate ${
                        hasPlayed ? "font-bold text-foreground" : "font-normal text-muted-foreground/45"
                      }`}
                    >
                      {p.ign}
                    </span>
                    {hasPlayed && (
                      <span className="font-mono text-[10px] shrink-0 font-bold">
                        <span className="text-emerald-500">{stats.wins}</span>
                        <span className="text-muted-foreground/40 font-normal">-</span>
                        <span className="text-rose-500">{stats.losses}</span>
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
