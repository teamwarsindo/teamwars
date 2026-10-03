"use client";

import { Crown } from "lucide-react";
import {
  PlayoffBracketMatchItem,
  PlayoffSlotTeam,
} from "@/app/tournament/_library/calculator";

export function MiniTeamSlot({
  team,
  isFinished,
}: {
  team: PlayoffSlotTeam;
  isFinished?: boolean;
}) {
  if (team.isPlaceholder) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-7 w-7 rounded-full shrink-0 overflow-hidden bg-muted/40 p-0.5 border border-border/70 flex items-center justify-center opacity-70">
          <img src="/logo-dc.png" alt="TBD" className="h-full w-full rounded-full object-contain" />
        </div>
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <span className="leading-tight text-[11px] sm:text-xs font-bold text-muted-foreground/70 truncate italic">
            {team.name}
          </span>
          <span className="text-[9px] text-muted-foreground/50 font-medium truncate mt-0.5">
            Menunggu Hasil
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="h-7 w-7 rounded-full shrink-0 overflow-hidden bg-muted/30 p-0.5 border border-border/70 flex items-center justify-center shadow-2xs">
        <img
          src={team.logo || "/logo-dc.png"}
          alt={team.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo-dc.png";
          }}
          className="h-full w-full rounded-full object-contain"
        />
      </div>
      <div className="flex flex-col min-w-0 flex-1 justify-center">
        <span
          className={`leading-tight text-[11px] sm:text-xs font-bold truncate ${
            team.isWinner ? "text-primary font-black" : "text-foreground"
          }`}
        >
          {team.name}
        </span>
        <span className="text-[9px] text-muted-foreground/80 font-medium truncate mt-0.5">
          {isFinished ? (team.isWinner ? "Pemenang" : "Gugur") : team.seedLabel}
        </span>
      </div>
    </div>
  );
}

export function MiniBracketCard({ match }: { match: PlayoffBracketMatchItem }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3 flex flex-col gap-2 shadow-2xs">
      <div className="border-b border-border/30 pb-1 flex items-center justify-between">
        <span className="text-[9.5px] font-black uppercase tracking-wider text-primary">
          {match.label}
        </span>
      </div>
      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <MiniTeamSlot team={match.teamA} isFinished={match.isFinished} />
        <span
          className={`font-mono font-black text-xs shrink-0 pl-1 ${
            match.teamA.isWinner ? "text-emerald-500" : "text-muted-foreground"
          }`}
        >
          {match.isFinished ? match.teamA.score : 0}
        </span>
      </div>
      <div className="border-t border-border/30" />
      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <MiniTeamSlot team={match.teamB} isFinished={match.isFinished} />
        <span
          className={`font-mono font-black text-xs shrink-0 pl-1 ${
            match.teamB.isWinner ? "text-emerald-500" : "text-muted-foreground"
          }`}
        >
          {match.isFinished ? match.teamB.score : 0}
        </span>
      </div>
    </div>
  );
}

interface PlayoffMiniBracketProps {
  matches: PlayoffBracketMatchItem[];
  grandFinal?: PlayoffBracketMatchItem | null;
}

export function PlayoffMiniBracket({ matches, grandFinal }: PlayoffMiniBracketProps) {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {matches.map((m) => (
        <MiniBracketCard key={m.id} match={m} />
      ))}
    </div>
  );
}
