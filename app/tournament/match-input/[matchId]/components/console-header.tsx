"use client";

import { MatchScheduleItem, GameDetailLog } from "@/app/tournament/_library";

interface ConsoleHeaderProps {
  match: MatchScheduleItem;
  gameLogs?: GameDetailLog[];
  onExit: () => void;
}

export function ConsoleHeader({ match, gameLogs = [], onExit }: ConsoleHeaderProps) {
  // Hitung skor real-time dari array gameLogs
  const liveScoreA = gameLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
  const liveScoreB = gameLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

  const isMatchFinished = match.isFinished || liveScoreA >= 10 || liveScoreB >= 10;

  return (
    <div className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-3 text-xs">
        <span className="font-extrabold text-foreground uppercase">
          {match.groupName} • {match.id} • WEEK {match.weekNumber || 1}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-border bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted transition cursor-pointer"
        >
          ← Keluar Ke Jadwal
        </button>
      </div>

      <div className="flex items-center justify-between font-black text-sm sm:text-base">
        <div className="flex items-center gap-2.5">
          <img src={match.teamALogo || "/logo.webp"} alt="" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" />
          <span className="text-foreground">{match.teamAName}</span>
        </div>

        <div className="text-center px-2">
          <span className="text-xl sm:text-2xl font-black text-primary">
            {liveScoreA} - {liveScoreB}
          </span>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
            {isMatchFinished ? "FINISHED" : "IN PROGRESS"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-foreground">{match.teamBName}</span>
          <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" />
        </div>
      </div>
    </div>
  );
}