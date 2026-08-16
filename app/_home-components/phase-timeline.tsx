"use client";

import { TOURNAMENT_RULES } from "@/app/tournament/_library";

interface PhaseTimelineProps {
  currentWeek: number;
}

export function PhaseTimeline({ currentWeek }: PhaseTimelineProps) {
  // Penentuan Fase Aktif:
  // Week 1–7: Group Stage
  // Week 8: Play-Ins
  // Week 9: Play-Off
  // Week 10+: Grand Final
  const getPhaseStatus = () => {
    if (currentWeek < 1) return { phaseKey: "REG", label: "Registration" };
    if (currentWeek <= 7) return { phaseKey: "GS", label: `Group Stage — Week ${currentWeek} of 7` };
    if (currentWeek === 8) return { phaseKey: "PLAY_INS", label: "Play-Ins (Wildcard Round)" };
    if (currentWeek === 9) return { phaseKey: "PLAYOFF", label: "Play-Off (Quarter & Semi Finals)" };
    return { phaseKey: "GF", label: "Grand Final" };
  };

  const { phaseKey, label: activePhaseLabel } = getPhaseStatus();

  const phases = [
    { key: "REG", name: "Registration", isPast: currentWeek >= 1, isCurrent: currentWeek < 1 },
    { key: "GS", name: "Group Stage", isPast: currentWeek > 7, isCurrent: currentWeek >= 1 && currentWeek <= 7 },
    { key: "PLAY_INS", name: "Play-Ins", isPast: currentWeek > 8, isCurrent: currentWeek === 8 },
    { key: "PLAYOFF", name: "Play-Off", isPast: currentWeek > 9, isCurrent: currentWeek === 9 },
    { key: "GF", name: "Grand Final", isPast: false, isCurrent: currentWeek >= 10 },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[9.5px]">
          Fase Turnamen:
        </span>
        <span className="text-primary font-bold text-[10.5px]">
          {activePhaseLabel}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 pt-0.5">
        {phases.map((p) => {
          let barClass = "bg-muted/60";
          let textClass = "text-muted-foreground font-medium";

          if (p.isCurrent) {
            barClass = "bg-primary shadow-xs";
            textClass = "text-primary font-bold";
          } else if (p.isPast) {
            barClass = "bg-emerald-500";
            textClass = "text-foreground font-semibold";
          }

          return (
            <div key={p.key} className="flex flex-col gap-1 items-center text-center">
              <div className={`h-1.5 w-full rounded-full transition-all ${barClass}`} />
              <span className={`text-[8.5px] sm:text-[9px] tracking-tight leading-none ${textClass}`}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
      }
