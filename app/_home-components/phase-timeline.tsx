"use client";

import { useMemo } from "react";
import { TOURNAMENT_RULES } from "@/app/tournament/_library";

interface PhaseTimelineProps {
  currentWeek: number;
}

export function PhaseTimeline({ currentWeek }: PhaseTimelineProps) {
  // Hitung pekan tiap fase secara dinamis dari TOURNAMENT_RULES
  const groupStageEndWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK - 1; // Week 7
  const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK;            // Week 8
  const playoffWeek = playInsWeek + 1;                               // Week 9
  const grandFinalWeek = playoffWeek + 1;                            // Week 10

  const phases = useMemo(
    () => [
      {
        key: "REG",
        name: "Registration",
        fullLabel: "Registration",
        isPast: currentWeek >= 1,
        isCurrent: currentWeek < 1,
      },
      {
        key: "GS",
        name: "Group Stage",
        fullLabel: `Group Stage — Week ${Math.max(1, currentWeek)} of ${groupStageEndWeek}`,
        isPast: currentWeek > groupStageEndWeek,
        isCurrent: currentWeek >= 1 && currentWeek <= groupStageEndWeek,
      },
      {
        key: "PLAY_INS",
        name: "Play-Ins",
        fullLabel: "Play-Ins (Wildcard Round)",
        isPast: currentWeek > playInsWeek,
        isCurrent: currentWeek === playInsWeek,
      },
      {
        key: "PLAYOFF",
        name: "Play-Off",
        fullLabel: "Play-Off (Quarter & Semi Finals)",
        isPast: currentWeek > playoffWeek,
        isCurrent: currentWeek === playoffWeek,
      },
      {
        key: "GF",
        name: "Grand Final",
        fullLabel: "Grand Final",
        isPast: false,
        isCurrent: currentWeek >= grandFinalWeek,
      },
    ],
    [currentWeek, groupStageEndWeek, playInsWeek, playoffWeek, grandFinalWeek]
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
