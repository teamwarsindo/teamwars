"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { simulateTeamPlayoffStrategy } from "@/app/tournament/_library/simulator";
import { Sparkles, Target, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

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
  const strategy = useMemo(() => {
    return simulateTeamPlayoffStrategy(teamName, allSchedules, allTeams, 1500);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4 text-card-foreground">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Analisis & Peluang Playoff
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] md:text-[10px] font-bold ${
            strategy.statusRisk === "SAFE"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : strategy.statusRisk === "MEDIUM"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
          }`}
        >
          {strategy.statusRisk === "SAFE" && <ShieldCheck className="h-3 w-3" />}
          {strategy.statusRisk === "MEDIUM" && <Zap className="h-3 w-3" />}
          {strategy.statusRisk === "HIGH" && <AlertTriangle className="h-3 w-3" />}
          {strategy.statusRisk === "SAFE" ? "Peluang Tinggi" : strategy.statusRisk === "MEDIUM" ? "Zona Perebutan" : "Zona Kritis"}
        </span>
      </div>

      {/* PROBABILITY BAR PROJECTION */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[10.5px] md:text-xs font-bold">
          <span className="text-sky-700 dark:text-sky-400">Quarter: {strategy.quarterFinalsProb}%</span>
          <span className="text-emerald-700 dark:text-emerald-400">Play-Ins: {strategy.playInsProb}%</span>
          <span className="text-rose-700 dark:text-rose-400">Gugur: {strategy.eliminationProb}%</span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            style={{ width: `${strategy.quarterFinalsProb}%` }}
            className="bg-sky-500 transition-all duration-500"
            title="Quarterfinals (Top 2 Group)"
          />
          <div
            style={{ width: `${strategy.playInsProb}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title="Play-Ins (Top 8 Wildcard)"
          />
          <div
            style={{ width: `${strategy.eliminationProb}%` }}
            className="bg-rose-500 transition-all duration-500"
            title="Eliminasi"
          />
        </div>
      </div>

      {/* TARGET SUMMARY */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-center">
        <div className="rounded-xl border border-border bg-card p-2">
          <span className="text-[8.5px] md:text-[9.5px] uppercase font-bold text-muted-foreground block">
            Sisa Pertandingan
          </span>
          <span className="text-xs sm:text-sm font-black text-foreground">
            {strategy.remainingMatchesCount} Match
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <span className="text-[8.5px] md:text-[9.5px] uppercase font-bold text-muted-foreground block">
            Target Kemenangan
          </span>
          <span className="text-xs sm:text-sm font-black text-primary">
            Minimal {strategy.magicWinsNeeded} Win
          </span>
        </div>
      </div>

      {/* TACTICAL ADVICE */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1">
        <span className="text-[9.5px] font-bold text-primary flex items-center gap-1">
          <Target className="h-3 w-3" /> Rekomendasi Taktis:
        </span>
        <ul className="space-y-1 text-[10.5px] md:text-xs text-muted-foreground list-disc list-inside">
          {strategy.tacticalAdvice.map((adv, idx) => (
            <li key={idx} className="leading-snug">
              {adv}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
                    }
