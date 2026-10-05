"use client";

import { useMemo } from "react";
import { TOURNAMENT_RULES } from "@/app/tournament/_library";

interface PhaseTimelineProps {
  currentWeek: number;
}

export function PhaseTimeline({ currentWeek }: PhaseTimelineProps) {
  const groupStageEndWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK - 1; // Week 7
  const { PLAY_INS, QUARTER_FINAL, SEMI_FINAL, GRAND_FINAL } = TOURNAMENT_RULES.PLAYOFF_WEEKS;

  const phases = useMemo(
    () => [
      {
        key: "GS",
        name: "Group Stage",
        fullLabel: `Group Stage — Week ${Math.min(Math.max(1, currentWeek), groupStageEndWeek)} of ${groupStageEndWeek}`,
        isPast: currentWeek > groupStageEndWeek,
        isCurrent: currentWeek >= 1 && currentWeek <= groupStageEndWeek,
      },
      {
        key: "PLAY_INS",
        name: "Play-Ins",
        fullLabel: "Play-Ins (Wildcard Round)",
        isPast: currentWeek > PLAY_INS,
        isCurrent: currentWeek === PLAY_INS,
      },
      {
        key: "QF",
        name: "Quarter Final",
        fullLabel: "Quarter Final",
        isPast: currentWeek > QUARTER_FINAL,
        isCurrent: currentWeek === QUARTER_FINAL,
      },
      {
        key: "SF",
        name: "Semifinal",
        fullLabel: "Semifinal",
        isPast: currentWeek > SEMI_FINAL,
        isCurrent: currentWeek === SEMI_FINAL,
      },
      {
        key: "GF",
        name: "Grand Final",
        fullLabel: "Grand Final",
        isPast: false,
        isCurrent: currentWeek >= GRAND_FINAL,
      },
    ],
    [currentWeek, groupStageEndWeek, PLAY_INS, QUARTER_FINAL, SEMI_FINAL, GRAND_FINAL]
  );

  const activePhase = phases.find((p) => p.isCurrent) || phases[phases.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 md:p-4 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-slate-400 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
          Fase Turnamen:
        </span>
        <span className="text-sky-400 font-black text-xs sm:text-sm">
          {activePhase.fullLabel}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 md:gap-2.5 pt-0.5">
        {phases.map((p) => {
          let barClass = "bg-muted/60";
          let textClass = "text-slate-400 dark:text-slate-400 font-medium";

          if (p.isCurrent) {
            barClass = "bg-sky-500 shadow-xs";
            textClass = "text-sky-400 font-black";
          } else if (p.isPast) {
            barClass = "bg-emerald-500";
            textClass = "text-foreground font-bold";
          }

          return (
            <div key={p.key} className="flex flex-col gap-1.5 items-center text-center">
              <div className={`h-1.5 md:h-2 w-full rounded-full transition-all ${barClass}`} />
              <span className={`text-[10px] sm:text-[11px] md:text-xs tracking-tight leading-none ${textClass}`}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PhaseTimeline;
