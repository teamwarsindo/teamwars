"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generateAdvancedPlayoffAnalytics } from "@/app/tournament/_library/simulator";
import { Target, GitFork, Swords } from "lucide-react";

interface TeamStrategyViewProps {
  teamName: string;
  allTeams: ExtendedStandingItem[];
  allSchedules: MatchScheduleItem[];
}

export function TeamStrategyView({
  teamName,
  allTeams,
  allSchedules,
}: TeamStrategyViewProps) {
  const analytics = useMemo(() => {
    return generateAdvancedPlayoffAnalytics(teamName, allSchedules, allTeams, 2500);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-2.5 sm:p-3 text-card-foreground">
      {/* 1. BAR PROBABILITAS PROPORSIONAL */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] sm:text-[10px] font-bold">
          <span className="text-sky-700 dark:text-sky-400">Quarter: {analytics.quarterFinalsProb}%</span>
          <span className="text-emerald-700 dark:text-emerald-400">Play-Ins: {analytics.playInsProb}%</span>
          <span className="text-rose-700 dark:text-rose-400">Gugur: {analytics.eliminationProb}%</span>
        </div>
        <div className="flex h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div style={{ width: `${analytics.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-300" />
          <div style={{ width: `${analytics.playInsProb}%` }} className="bg-emerald-500 transition-all duration-300" />
          <div style={{ width: `${analytics.eliminationProb}%` }} className="bg-rose-500 transition-all duration-300" />
        </div>
      </div>

      {/* 2. TARGET 3-TIER */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-1 px-1.5">
          <span className="text-[7.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block leading-tight">
            Target Aman
          </span>
          <span className="text-[11px] sm:text-xs font-black text-foreground block leading-tight">
            {analytics.targets.safeRecord}
          </span>
          <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
            {analytics.targets.safeProb}% Lolos
          </span>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 py-1 px-1.5">
          <span className="text-[7.5px] font-bold text-sky-700 dark:text-sky-400 uppercase block leading-tight">
            Kompetitif
          </span>
          <span className="text-[11px] sm:text-xs font-black text-foreground block leading-tight">
            {analytics.targets.competitiveRecord}
          </span>
          <span className="text-[8px] font-bold text-sky-700 dark:text-sky-400 leading-tight">
            {analytics.targets.competitiveProb}% Lolos
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 py-1 px-1.5">
          <span className="text-[7.5px] font-bold text-rose-700 dark:text-rose-400 uppercase block leading-tight">
            Survival
          </span>
          <span className="text-[11px] sm:text-xs font-black text-foreground block leading-tight">
            {analytics.targets.survivalRecord}
          </span>
          <span className="text-[8px] font-bold text-rose-700 dark:text-rose-400 leading-tight">
            {analytics.targets.survivalProb}% Lolos
          </span>
        </div>
      </div>

      {/* 3. CONDITIONAL DAMPAK MATCH TERDEKAT */}
      {analytics.conditional && (
        <div className="rounded-xl border border-border/80 bg-card/60 p-2 text-[9.5px]">
          <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase mb-1">
            <span className="flex items-center gap-1">
              <GitFork className="h-2.5 w-2.5 text-purple-500" /> Skenario Terdekat: vs {analytics.conditional.nextOpponentName}
            </span>
            <span className="font-mono">SoS {analytics.sosRating}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-emerald-500/10 rounded-lg p-1.5 text-center">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold block">Jika Menang</span>
              <span className="text-foreground font-black text-[10.5px]">{analytics.conditional.winImpactProb}% Lolos</span>
            </div>
            <div className="bg-rose-500/10 rounded-lg p-1.5 text-center">
              <span className="text-rose-700 dark:text-rose-400 font-bold block">Jika Kalah</span>
              <span className="text-foreground font-black text-[10.5px]">{analytics.conditional.loseImpactProb}% Lolos</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. REKOMENDASI TAKTIS SINGKAT */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 space-y-0.5">
        <span className="text-[8.5px] font-bold text-primary flex items-center gap-1 uppercase">
          <Target className="h-2.5 w-2.5" /> Rekomendasi Kunci:
        </span>
        <ul className="text-[9.5px] text-muted-foreground space-y-0.5 list-disc list-inside">
          {analytics.strategicTakeaways.map((adv, idx) => (
            <li key={idx} className="leading-tight">
              {adv}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}