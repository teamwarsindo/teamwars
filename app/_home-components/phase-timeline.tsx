"use client";

interface PhaseTimelineProps {
  currentWeek: number;
}

export function PhaseTimeline({ currentWeek }: PhaseTimelineProps) {
  const getPhaseStatus = () => {
    if (currentWeek < 1) return { phaseKey: "REG", label: "Registration" };
    if (currentWeek <= 7) return { phaseKey: "GS", label: `Group Stage — Week ${currentWeek} of 7` };
    if (currentWeek === 8) return { phaseKey: "PLAY_INS", label: "Play-Ins (Wildcard Round)" };
    if (currentWeek === 9) return { phaseKey: "PLAYOFF", label: "Play-Off (Quarter & Semi Finals)" };
    return { phaseKey: "GF", label: "Grand Final" };
  };

  const { label: activePhaseLabel } = getPhaseStatus();

  const phases = [
    { key: "REG", name: "Registration", isPast: currentWeek >= 1, isCurrent: currentWeek < 1 },
    { key: "GS", name: "Group Stage", isPast: currentWeek > 7, isCurrent: currentWeek >= 1 && currentWeek <= 7 },
    { key: "PLAY_INS", name: "Play-Ins", isPast: currentWeek > 8, isCurrent: currentWeek === 8 },
    { key: "PLAYOFF", name: "Play-Off", isPast: currentWeek > 9, isCurrent: currentWeek === 9 },
    { key: "GF", name: "Grand Final", isPast: false, isCurrent: currentWeek >= 10 },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 md:p-4 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-slate-400 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
          Fase Turnamen:
        </span>
        <span className="text-sky-400 font-black text-xs sm:text-sm">
          {activePhaseLabel}
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