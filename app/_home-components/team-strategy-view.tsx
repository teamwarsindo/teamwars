"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generateDecisionAnalytics } from "@/app/tournament/_library/simulator";
import { Target, Zap, ShieldAlert, Swords } from "lucide-react";

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
      {/* 1. STATUS KELOLOSAN */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-sky-700 dark:text-sky-400">Quarterfinal: {data.quarterFinalsProb}%</span>
          <span className="text-emerald-700 dark:text-emerald-400">Play-Ins: {data.playInsProb}%</span>
          <span className="text-rose-700 dark:text-rose-400">Gugur: {data.eliminationProb}%</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <div style={{ width: `${data.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-300" />
          <div style={{ width: `${data.playInsProb}%` }} className="bg-emerald-500 transition-all duration-300" />
          <div style={{ width: `${data.eliminationProb}%` }} className="bg-rose-500 transition-all duration-300" />
        </div>
      </div>

      {/* 2. DUA KARTU TARGET MUDAH DIPAHAMI */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* TARGET MENANG */}
        <div className="rounded-xl border border-border bg-card/80 p-2 space-y-1">
          <span className="text-[8.5px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Target className="h-3 w-3 text-primary" /> Target 4 Laga Sisa
          </span>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Pasti Lolos:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">Menang 3x</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Batas Kritis:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">Menang 2x (50:50)</span>
          </div>
        </div>

        {/* TIPS SKOR SET */}
        <div className="rounded-xl border border-border bg-card/80 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-rose-500" /> Tips Skor Set
            </span>
            <span className={`text-[7.5px] font-black px-1.5 py-0.2 rounded ${
              data.tiebreakRisk === "HIGH" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}>
              {data.tiebreakRisk === "HIGH" ? "Defisit Poin" : "Poin Aman"}
            </span>
          </div>
          <p className="text-[9px] leading-tight text-muted-foreground">
            {data.currentPtsDiff < 0
              ? `Defisit set (${data.currentPtsDiff}). Saat menang wajib kejar skor telak (10-3 atau 10-4).`
              : `Modal set (+${data.currentPtsDiff}) sangat menguntungkan di klasemen.`}
          </p>
        </div>
      </div>

      {/* 3. DAFTAR LAWAN SISA DENGAN LABEL JELAS */}
      {data.tacticalMatches.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase px-0.5">
            <span className="flex items-center gap-1">
              <Swords className="h-3 w-3 text-primary" /> 4 Calon Lawan Sisa (Tingkat Kepentingan)
            </span>
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
                  <span className="text-[9px] text-muted-foreground font-mono">Rank #{m.opponentRank}</span>
                </div>

                {/* STATUS IMPORTANCE JELAS */}
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className={`rounded px-1.5 py-0.5 text-[8.5px] font-bold ${
                    m.isHighLeverage
                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {m.isHighLeverage ? "🔥 Match Penentu" : "Match Biasa"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. REKOMENDASI TUNGGAL UNTUK TIM */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="leading-snug text-foreground font-medium">
          {data.tacticalMatches[0]
            ? `Wajib amankan kemenangan di laga vs ${data.tacticalMatches[0].opponentName} untuk membuka peluang lolos ke atas 40%.`
            : "Fokus maksimalkan sisa laga."}
        </span>
      </div>
    </div>
  );
}
