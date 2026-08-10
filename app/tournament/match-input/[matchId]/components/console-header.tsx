"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function ConsoleHeader({
  match,
  onExit,
}: {
  match: MatchScheduleItem;
  onExit: () => void;
}) {
  return (
    <div className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-3 text-xs">
        <span className="font-extrabold text-primary uppercase">
          {match.groupName} • {match.id} • WEEK {match.weekNumber || 1}
        </span>
        <button
          onClick={onExit}
          className="rounded-lg border border-border bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted transition cursor-pointer"
        >
          ← Keluar Ke Jadwal
        </button>
      </div>

      <div className="flex items-center justify-between font-black text-sm sm:text-base">
        <div className="flex items-center gap-2.5">
          <img src={match.teamALogo} alt="" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" />
          <span>{match.teamAName}</span>
        </div>
        <div className="text-center px-2">
          <span className="text-xl sm:text-2xl font-black text-primary">
            {match.scoreA} - {match.scoreB}
          </span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
            {match.isFinished ? "FINISHED" : "SCHEDULED"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span>{match.teamBName}</span>
          <img src={match.teamBLogo} alt="" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" />
        </div>
      </div>
    </div>
  );
}