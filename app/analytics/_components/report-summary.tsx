import { useMemo } from "react";
import { computeTeamSummary, GameRecord } from "./summary-helper";

interface ReportSummaryProps {
  games: GameRecord[];
  isFinished: boolean;
  scoreA: number;
  scoreB: number;
  liveInstruction: { nextGameNumber: number; stayTable: string; nextActionTeam: string } | null;
}

export function ReportSummary({
  games,
  isFinished,
  liveInstruction,
}: ReportSummaryProps) {
  const statA = useMemo(() => computeTeamSummary(games, true), [games]);
  const statB = useMemo(() => computeTeamSummary(games, false), [games]);

  if (!isFinished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-1.5 text-xs">
        {liveInstruction ? (
          <>
            <div className="font-black text-amber-500 uppercase tracking-wide flex items-center justify-between text-[11px]">
              <span className="animate-pulse">Instruksi Game #{liveInstruction.nextGameNumber}</span>
              <span className="text-[9px] font-mono text-muted-foreground font-normal">
                {games.length} Game Dimainkan
              </span>
            </div>
            <div className="space-y-0.5 text-[10.5px]">
              <div className="text-foreground">• <strong>{liveInstruction.stayTable}</strong> (Stay table)</div>
              <div className="text-muted-foreground">• <strong>{liveInstruction.nextActionTeam}:</strong> (Next deck or repeat)</div>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-muted-foreground text-center">
            Pertandingan siap dimulai. Menunggu ronde pertama dari wasit.
          </div>
        )}
      </div>
    );
  }

  const renderRecord = (wins: number, losses: number) => (
    <div className="text-[10px] font-medium text-muted-foreground">
      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wins} Win</span>
      <span className="mx-1 text-muted-foreground/60">-</span>
      <span className="text-rose-600 dark:text-rose-400 font-semibold">{losses} Lose</span>
    </div>
  );

  const renderAgg = (agg: number) => {
    const isPositive = agg > 0;
    const isNegative = agg < 0;
    const colorClass = isPositive
      ? "text-emerald-600 dark:text-emerald-400"
      : isNegative
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

    return (
      <div className="text-[10px] text-muted-foreground font-mono">
        Agg <span className={`font-bold ${colorClass}`}>{isPositive ? `+${agg}` : agg}</span>
      </div>
    );
  };

  const renderWpm = (wpmVal: number) => {
    const colorClass =
      wpmVal > 50
        ? "text-emerald-600 dark:text-emerald-400"
        : wpmVal < 50
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

    return (
      <div className="text-[10px] text-muted-foreground font-mono">
        WPM <span className={`font-bold ${colorClass}`}>{wpmVal}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* ── KOTAK 1: DUELIST HIGHLIGHT ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="py-2 px-3 bg-muted/30 border-b border-border text-center">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Duelist Highlight
          </span>
        </div>

        <div className="p-2.5 space-y-2.5">
          {/* Top Player */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <div className="py-1 px-2 bg-muted/30 border-b border-border/60 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <span>⭐</span> Top Player
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2 text-center">
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center">
                  {statA.topPlayer.ign}
                </div>
                {renderRecord(statA.topPlayer.wins, statA.topPlayer.losses)}
                {renderAgg(statA.topPlayer.agregat)}
                {renderWpm(statA.topPlayer.wpmVal)}
              </div>
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center">
                  {statB.topPlayer.ign}
                </div>
                {renderRecord(statB.topPlayer.wins, statB.topPlayer.losses)}
                {renderAgg(statB.topPlayer.agregat)}
                {renderWpm(statB.topPlayer.wpmVal)}
              </div>
            </div>
          </div>

          {/* Top Streak */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <div className="py-1 px-2 bg-muted/30 border-b border-border/60 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <span>🔥</span> Top Streak
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2 text-center">
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center">
                  {statA.maxStreak.player}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {statA.maxStreak.hasStreak ? `${statA.maxStreak.count} Win Streak` : "-"}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {statA.maxStreak.rangeStr}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-full" title={statA.maxStreak.deck}>
                  {statA.maxStreak.deck}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center">
                  {statB.maxStreak.player}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {statB.maxStreak.hasStreak ? `${statB.maxStreak.count} Win Streak` : "-"}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {statB.maxStreak.rangeStr}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-full" title={statB.maxStreak.deck}>
                  {statB.maxStreak.deck}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KOTAK 2: ARCHETYPE HIGHLIGHT ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="py-2 px-3 bg-muted/30 border-b border-border text-center">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Archetype Highlight
          </span>
        </div>

        <div className="p-2.5 space-y-2.5">
          {/* Best Archetype */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <div className="py-1 px-2 bg-muted/30 border-b border-border/60 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <span>🏆</span> Best Archetype
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2 text-center">
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div
                  className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center"
                  title={statA.bestDeck.name}
                >
                  {statA.bestDeck.name}
                </div>
                {renderRecord(statA.bestDeck.wins, statA.bestDeck.losses)}
                {renderAgg(statA.bestDeck.agregat)}
                {renderWpm(statA.bestDeck.wpmVal)}
              </div>
              <div className="flex flex-col items-center justify-center px-1 space-y-0.5">
                <div
                  className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center"
                  title={statB.bestDeck.name}
                >
                  {statB.bestDeck.name}
                </div>
                {renderRecord(statB.bestDeck.wins, statB.bestDeck.losses)}
                {renderAgg(statB.bestDeck.agregat)}
                {renderWpm(statB.bestDeck.wpmVal)}
              </div>
            </div>
          </div>

          {/* Most Played Archetype (Rata Air Sempurna dengan grid teratur) */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <div className="py-1 px-2 bg-muted/30 border-b border-border/60 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <span>🃏</span> Most Played Archetype
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2 text-center">
              {/* Sisi Kiri */}
              <div className="flex flex-col justify-between px-1 h-full">
                <div className="space-y-0.5">
                  <div
                    className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center justify-center"
                    title={statA.mostDeck.name}
                  >
                    {statA.mostDeck.name}
                  </div>
                  {renderRecord(statA.mostDeck.wins, statA.mostDeck.losses)}
                  {renderWpm(statA.mostDeck.wpmVal)}
                </div>
                {/* Min-height dikunci sama agar sejajar meskipun beda jumlah baris */}
                <div
                  className="text-[9.5px] text-muted-foreground leading-tight w-full px-0.5 pt-1 text-center min-h-[32px] flex items-center justify-center"
                  title={statA.mostDeck.users}
                >
                  <span className="line-clamp-2">{statA.mostDeck.users}</span>
                </div>
              </div>

              {/* Sisi Kanan */}
              <div className="flex flex-col justify-between px-1 h-full">
                <div className="space-y-0.5">
                  <div
                    className="font-bold text-xs text-foreground truncate max-w-full min-h-[18px] flex items-center justify-center"
                    title={statB.mostDeck.name}
                  >
                    {statB.mostDeck.name}
                  </div>
                  {renderRecord(statB.mostDeck.wins, statB.mostDeck.losses)}
                  {renderWpm(statB.mostDeck.wpmVal)}
                </div>
                {/* Min-height dikunci sama agar sejajar meskipun beda jumlah baris */}
                <div
                  className="text-[9.5px] text-muted-foreground leading-tight w-full px-0.5 pt-1 text-center min-h-[32px] flex items-center justify-center"
                  title={statB.mostDeck.users}
                >
                  <span className="line-clamp-2">{statB.mostDeck.users}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
