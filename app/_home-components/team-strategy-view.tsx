"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generatePlayoffRoadmap } from "@/app/tournament/_library/simulator";
import { Award, AlertTriangle, Calendar, Zap } from "lucide-react";

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
    return generatePlayoffRoadmap(teamName, allSchedules, allTeams);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-2.5 sm:p-3 text-card-foreground">
      {/* 1. STATUS PELUANG (DINAMIS & TOTAL SELALU 100%) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          {data.quarterFinalsProb > 0 && (
            <span className="text-sky-700 dark:text-sky-400">Quarter: {data.quarterFinalsProb}%</span>
          )}
          {data.playInsProb > 0 && (
            <span className="text-emerald-700 dark:text-emerald-400">Play-Ins (Top 8): {data.playInsProb}%</span>
          )}
          <span className="text-rose-700 dark:text-rose-400">Gugur: {data.eliminationProb}%</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
          {data.quarterFinalsProb > 0 && (
            <div style={{ width: `${data.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-300" />
          )}
          {data.playInsProb > 0 && (
            <div style={{ width: `${data.playInsProb}%` }} className="bg-emerald-500 transition-all duration-300" />
          )}
          {data.eliminationProb > 0 && (
            <div style={{ width: `${data.eliminationProb}%` }} className="bg-rose-500 transition-all duration-300" />
          )}
        </div>
      </div>

      {/* 2. DUA KARTU SYARAT KELOLOSAN (DINAMIS) */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2 space-y-0.5">
          <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
            <Award className="h-3 w-3" /> {data.targetTitle}
          </span>
          <span className="font-black text-foreground block text-[11px] leading-tight">
            {data.targetPrimary}
          </span>
          <span className="text-[8.5px] text-muted-foreground block font-medium">
            {data.targetSecondary}
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2 space-y-0.5">
          <span className="text-[8.5px] font-bold text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {data.eliminationTitle}
          </span>
          <span className="font-black text-foreground block text-[11px] leading-tight">
            {data.eliminationPrimary}
          </span>
          <span className="text-[8.5px] text-rose-600 dark:text-rose-400 block font-bold">
            {data.eliminationSecondary}
          </span>
        </div>
      </div>

      {/* 3. ROADMAP PEKAN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[8.5px] font-bold text-muted-foreground uppercase px-0.5">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" /> Roadmap Sisa Match
          </span>
          <span>Target Skor & Pts Diff</span>
        </div>

        <div className="space-y-1.5">
          {data.weeklyRoadmap.map((m) => (
            <div
              key={m.matchId}
              className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-[10px] ${
                m.urgencyLevel === "DO_OR_DIE"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : m.urgencyLevel === "DAMAGE_CONTROL"
                  ? "border-sky-500/30 bg-sky-500/5"
                  : m.urgencyLevel === "CRITICAL_RIVAL"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-card/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[8.5px] font-black text-primary font-mono shrink-0">
                  W{m.week}
                </span>
                <img src={m.opponentLogo} alt="" className="h-4 w-4 object-contain shrink-0" />
                <span className="font-bold truncate text-foreground text-[10px]">{m.opponentName}</span>
                <span className="text-[8.5px] text-muted-foreground font-mono">#{m.opponentRank}</span>
              </div>

              <div className="text-right shrink-0 pl-1.5">
                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${
                  m.urgencyLevel === "DO_OR_DIE"
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black"
                    : m.urgencyLevel === "DAMAGE_CONTROL"
                    ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold"
                    : m.urgencyLevel === "CRITICAL_RIVAL"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {m.targetInstruction}
                </span>
              </div>
            </div>
          ))}

          {data.weeklyRoadmap.length === 0 && (
            <p className="rounded-xl border border-border bg-muted/10 p-2 text-center text-[9.5px] text-muted-foreground">
              Semua pertandingan babak reguler telah selesai.
            </p>
          )}
        </div>
      </div>

      {/* 4. INSTRUKSI OPERASIONAL */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-[9.5px] text-muted-foreground flex items-start gap-1.5">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <p className="leading-snug text-foreground font-medium">
          <strong className="text-primary font-bold">Instruksi:</strong> {data.operationalInstruction}
        </p>
      </div>
    </div>
  );
}
