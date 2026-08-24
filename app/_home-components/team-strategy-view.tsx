"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generatePlayoffRoadmap } from "@/app/tournament/_library/simulator";
import { Award, AlertTriangle, Calendar } from "lucide-react";

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
    return generatePlayoffRoadmap(teamName, allSchedules, allTeams, 3000);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-2.5 sm:p-3 text-card-foreground">
      {/* 1. STATUS PELUANG LOLOS (MONTE CARLO PROJECTION) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9.5px] sm:text-[10px] font-bold">
          <span className="text-sky-700 dark:text-sky-400">Quarter (Top 2): {data.quarterFinalsProb}%</span>
          <span className="text-emerald-700 dark:text-emerald-400">Play-Ins (Top 8): {data.playInsProb}%</span>
          <span className="text-rose-700 dark:text-rose-400">Gugur: {data.eliminationProb}%</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div style={{ width: `${data.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-300" />
          <div style={{ width: `${data.playInsProb}%` }} className="bg-emerald-500 transition-all duration-300" />
          <div style={{ width: `${data.eliminationProb}%` }} className="bg-rose-500 transition-all duration-300" />
        </div>
      </div>

      {/* 2. DUA KARTU KELOLOSAN & TITIK ELIMINASI */}
      <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2 space-y-0.5">
          <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
            <Award className="h-2.5 w-2.5" /> Jalur Realistis (Top 8)
          </span>
          <p className="text-[9px] font-medium leading-tight text-foreground">
            {data.wildcardCondition}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2 space-y-0.5">
          <span className="text-[8px] font-bold text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Titik Gugur 100%
          </span>
          <p className="text-[9px] font-medium leading-tight text-foreground">
            {data.eliminationCondition}
          </p>
        </div>
      </div>

      {/* 3. ROADMAP JADWAL KRONOLOGIS PEKAN KE PEKAN */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[8.5px] font-bold text-muted-foreground uppercase px-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5 text-primary" /> Roadmap & Instruksi Skor Pekan ke Pekan
          </span>
          <span>Sisa {data.remainingCount} Match</span>
        </div>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
          {data.weeklyRoadmap.map((m) => (
            <div
              key={m.matchId}
              className={`rounded-xl border p-2 text-[9.5px] space-y-1 ${
                m.urgencyLevel === "DO_OR_DIE"
                  ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10"
                  : m.urgencyLevel === "CRITICAL_RIVAL"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-card/70"
              }`}
            >
              {/* Header Match */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.2 text-[8px] font-black text-primary font-mono shrink-0">
                    Week {m.week}
                  </span>
                  <img src={m.opponentLogo} alt="" className="h-3.5 w-3.5 object-contain shrink-0" />
                  <span className="font-bold truncate text-foreground">{m.opponentName}</span>
                  <span className="text-[8px] text-muted-foreground font-mono">#{m.opponentRank}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[7.5px] font-bold px-1.5 py-0.2 rounded ${
                    m.urgencyLevel === "DO_OR_DIE"
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black"
                      : m.urgencyLevel === "CRITICAL_RIVAL"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {m.urgencyLabel}
                  </span>
                </div>
              </div>

              {/* Skenario Skor */}
              <div className="grid grid-cols-2 gap-1.5 text-[8.5px] pt-0.5 border-t border-border/40">
                <div className="text-emerald-700 dark:text-emerald-400 leading-tight">
                  <span className="font-bold">Menang:</span> {m.winScenario}
                </div>
                <div className="text-rose-700 dark:text-rose-400 leading-tight">
                  <span className="font-bold">Kalah:</span> {m.lossScenario}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}