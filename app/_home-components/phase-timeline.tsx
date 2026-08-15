interface PhaseTimelineProps {
  currentWeek: number;
}

export function PhaseTimeline({ currentWeek }: PhaseTimelineProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
          Fase Turnamen:
        </span>
        <span className="text-primary font-black">
          Group Stage — Week {currentWeek} of 7
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 pt-1">
        <div className="flex flex-col gap-1 items-center">
          <div className="h-1.5 w-full rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-muted-foreground">Pendaftaran</span>
        </div>
        <div className="flex flex-col gap-1 items-center">
          <div className="h-1.5 w-full rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-black text-primary">Group Stage</span>
        </div>
        <div className="flex flex-col gap-1 items-center">
          <div className="h-1.5 w-full rounded-full bg-muted" />
          <span className="text-[9px] font-bold text-muted-foreground">Playoff 8 Besar</span>
        </div>
        <div className="flex flex-col gap-1 items-center">
          <div className="h-1.5 w-full rounded-full bg-muted" />
          <span className="text-[9px] font-bold text-muted-foreground">Grand Final</span>
        </div>
      </div>
    </div>
  );
}
