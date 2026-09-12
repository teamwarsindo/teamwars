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

  const renderAggBadge = (agg: number) => {
    const isPositive = agg > 0;
    const isZero = agg === 0;
    const colorClass = isPositive
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : isZero
      ? "bg-muted/40 text-muted-foreground border-border/50"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";

    return (
      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black font-mono border ${colorClass}`}>
        Agg {isPositive ? `+${agg}` : agg}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* ── KOTAK 1: DUELIST HIGHLIGHT ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="py-2.5 px-3 bg-muted/30 border-b border-border text-center">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Duelist Highlight
          </span>
        </div>

        <div className="p-3 space-y-3 text-xs">
          {/* Top Player (Header Digabung) */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
            <div className="py-1 px-2 bg-muted/40 border-b border-border/60 text-center text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
              <span>⭐</span> Top Player
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2.5">
              {/* Sisi Kiri */}
              <div className="flex flex-col items-center text-center pr-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full">
                  {statA.topPlayer.ign}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statA.topPlayer.recordStr}
                </div>
                <div className="my-1">{renderAggBadge(statA.topPlayer.agregat)}</div>
                <div className="text-[10px] font-semibold text-foreground/85">
                  {statA.topPlayer.wpm}
                </div>
              </div>

              {/* Sisi Kanan */}
              <div className="flex flex-col items-center text-center pl-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full">
                  {statB.topPlayer.ign}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statB.topPlayer.recordStr}
                </div>
                <div className="my-1">{renderAggBadge(statB.topPlayer.agregat)}</div>
                <div className="text-[10px] font-semibold text-foreground/85">
                  {statB.topPlayer.wpm}
                </div>
              </div>
            </div>
          </div>

          {/* Top Streak (Header Digabung) */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
            <div className="py-1 px-2 bg-muted/40 border-b border-border/60 text-center text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
              <span>🔥</span> Top Streak
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2.5">
              {/* Sisi Kiri */}
              <div className="flex flex-col items-center text-center pr-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full">
                  {statA.maxStreak.player}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statA.maxStreak.streakStr}
                </div>
                <div className="text-[10px] font-medium text-foreground/85 truncate max-w-full mt-0.5">
                  {statA.maxStreak.deck}
                </div>
              </div>

              {/* Sisi Kanan */}
              <div className="flex flex-col items-center text-center pl-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full">
                  {statB.maxStreak.player}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statB.maxStreak.streakStr}
                </div>
                <div className="text-[10px] font-medium text-foreground/85 truncate max-w-full mt-0.5">
                  {statB.maxStreak.deck}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KOTAK 2: ARCHETYPE HIGHLIGHT ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="py-2.5 px-3 bg-muted/30 border-b border-border text-center">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Archetype Highlight
          </span>
        </div>

        <div className="p-3 space-y-3 text-xs">
          {/* Most Played Archetype (Header Digabung) */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
            <div className="py-1 px-2 bg-muted/40 border-b border-border/60 text-center text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
              <span>🃏</span> Most Played Archetype
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2.5">
              {/* Sisi Kiri */}
              <div className="flex flex-col items-center text-center pr-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full" title={statA.mostDeck.name}>
                  {statA.mostDeck.name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statA.mostDeck.recordStr}
                </div>
                <div className="text-[10px] font-semibold text-foreground/85 mt-0.5">
                  {statA.mostDeck.wpm}
                </div>
                <div className="text-[9.5px] text-muted-foreground/80 truncate max-w-full mt-0.5" title={statA.mostDeck.users}>
                  {statA.mostDeck.users}
                </div>
              </div>

              {/* Sisi Kanan */}
              <div className="flex flex-col items-center text-center pl-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full" title={statB.mostDeck.name}>
                  {statB.mostDeck.name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statB.mostDeck.recordStr}
                </div>
                <div className="text-[10px] font-semibold text-foreground/85 mt-0.5">
                  {statB.mostDeck.wpm}
                </div>
                <div className="text-[9.5px] text-muted-foreground/80 truncate max-w-full mt-0.5" title={statB.mostDeck.users}>
                  {statB.mostDeck.users}
                </div>
              </div>
            </div>
          </div>

          {/* Best Archetype (Header Digabung) */}
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
            <div className="py-1 px-2 bg-muted/40 border-b border-border/60 text-center text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
              <span>🏆</span> Best Archetype
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/60 p-2.5">
              {/* Sisi Kiri */}
              <div className="flex flex-col items-center text-center pr-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full" title={statA.bestDeck.name}>
                  {statA.bestDeck.name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statA.bestDeck.recordStr}
                </div>
                <div className="my-1">{renderAggBadge(statA.bestDeck.agregat)}</div>
                <div className="text-[10px] font-semibold text-foreground/85">
                  {statA.bestDeck.wpm}
                </div>
              </div>

              {/* Sisi Kanan */}
              <div className="flex flex-col items-center text-center pl-1 min-w-0">
                <div className="font-bold text-xs text-foreground truncate max-w-full" title={statB.bestDeck.name}>
                  {statB.bestDeck.name}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {statB.bestDeck.recordStr}
                </div>
                <div className="my-1">{renderAggBadge(statB.bestDeck.agregat)}</div>
                <div className="text-[10px] font-semibold text-foreground/85">
                  {statB.bestDeck.wpm}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
                  }
                  
