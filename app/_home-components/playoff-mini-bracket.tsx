"use client";

import { Crown } from "lucide-react";
import { PlayoffBracketMatchItem } from "@/app/tournament/_library/calculator";
import { TimelineMatchCard } from "@/app/tournament/_components/playoff-tab";

interface PlayoffMiniBracketProps {
  matches: PlayoffBracketMatchItem[];
  grandFinal?: PlayoffBracketMatchItem | null;
  theme?: "amber" | "emerald" | "purple";
}

export function PlayoffMiniBracket({
  matches,
  grandFinal,
  theme = "emerald",
}: PlayoffMiniBracketProps) {
  if (grandFinal?.isFinished) {
    return (
      <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-center space-y-2">
        <Crown className="h-6 w-6 text-yellow-500 mx-auto animate-bounce" />
        <div className="text-xs font-black uppercase text-yellow-600 dark:text-yellow-400">
          Champion of Season 7
        </div>
        <div className="text-sm font-bold text-foreground">
          {grandFinal.teamA.isWinner ? grandFinal.teamA.name : grandFinal.teamB.name}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
        Jadwal babak ini akan segera diumumkan.
      </div>
    );
  }

  const nextStageLabel =
    theme === "amber" ? "Semi-Finals" : theme === "emerald" ? "Grand Final" : "Champion 🏆";
  const nextBadgeColor =
    theme === "amber" ? "emerald" : theme === "emerald" ? "purple" : "gold";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {matches.map((m) => (
        <TimelineMatchCard
          key={m.id}
          match={m}
          colorTheme={theme}
          nextStageLabel={nextStageLabel}
          nextBadgeColor={nextBadgeColor}
        />
      ))}
    </div>
  );
}
