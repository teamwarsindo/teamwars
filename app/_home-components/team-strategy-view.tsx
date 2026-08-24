"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generateDecisionAnalytics } from "@/app/tournament/_library/simulator";
import { Zap, Target, ShieldAlert, Flame, Layers } from "lucide-react";

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
  const data = useMemo(() => {
    return generateDecisionAnalytics(teamName, allSchedules, allTeams, 2500);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-3 text-card-foreground">
      {/* 1. PLAYOFF PROJECTION BAR */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9.5px] sm:text-[10.5px] font-bold">
          <span className="text-sky-700 dark:text-sky-400">Quarter: {data.quarterFinalsProb}%</span>
          <span className="text-emerald-700 dark:text-emerald-400">Play-Ins: {data.playInsProb}%</span>
          <span className="text-rose-700 dark:text-rose-400">Gugur: {data.eliminationProb}%</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div style={{ width: `${data.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-300" />
          <div style={{ width: `${data.playInsProb}%` }} className="bg-emerald-500 transition-all duration-300" />
          <div style={{ width: `${data.eliminationProb}%` }} className="bg-rose-500 transition-all duration-300" />
        </div>
      </div>

      {/* 2. DUA KARTU TARGET REKOR & RISIKO TIE-BREAK */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl border border-border bg-card/80 p-2 space-y-1">
          <span className="text-[8.5px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Target className="h-3 w-3 text-primary" /> Target Rekor Sisa
          </span>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Garansi Top 8:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{data.guaranteedTarget}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground">Batas Survival:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{data.survivalTarget}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-rose-500" /> Risiko Tie-Break
            </span>
            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${
              data.tiebreakRisk === "HIGH" ? "bg-rose-500/15 text-rose-600" : data.tiebreakRisk === "MODERATE" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"
            }`}>
              {data.tiebreakRisk} RISK
            </span>
          </div>
          <p className="text-[9px] leading-tight text-muted-foreground">
            {data.tiebreakAdvice}
          </p>
        </div>
      </div>

      {/* 3. DAFTAR SEMUA MATCH SISA DENGAN LEVERAGE IMPACT */}
      {data.tacticalMatches.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase px-0.5">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-rose-500" /> Sisa Match (Urutan Dampak Kelolosan)
            </span>
            <span>SoS: {data.sosRating}/100</span>
          </div>

          <div className="space-y-1">
            {data.tacticalMatches.map((m) => (
              <div
                key={m.matchId}
                className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-[10.5px] ${
                  m.isHighLeverage
                    ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10"
                    : "border-border bg-card/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img src={m.opponentLogo} alt="" className="h-4 w-4 object-contain shrink-0" />
                  <span className="font-bold truncate text-foreground">{m.opponentName}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">#{m.opponentRank}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div className="text-[9px] text-muted-foreground leading-none">
                    <span>W: <strong className="text-emerald-700 dark:text-emerald-400">{m.playoffIfWin}%</strong></span>
                    <span className="mx-1">/</span>
                    <span>L: <strong className="text-rose-700 dark:text-rose-400">{m.playoffIfLose}%</strong></span>
                  </div>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[8.5px] font-black text-primary">
                    Δ+{m.leverageImpact}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. REKOMENDASI TAKTIS */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[10px] text-muted-foreground flex items-start gap-2">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span className="leading-snug text-foreground font-medium">
          {data.primaryDecisionTakeaway}
        </span>
      </div>
    </div>
  );
            }
          
