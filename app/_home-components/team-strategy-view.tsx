"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generateFullPlayoffAnalytics } from "@/app/tournament/_library/simulator";
import { Sparkles, Target, ShieldCheck, Zap, AlertTriangle, Flame, Layers } from "lucide-react";

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
    return generateFullPlayoffAnalytics(teamName, allSchedules, allTeams, 3000);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-3">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Model Peluang & Skenario Playoff
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] md:text-[10px] font-bold border ${
            analytics.eliminationProb < 30
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : analytics.eliminationProb < 60
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          }`}
        >
          {analytics.eliminationProb < 30 ? (
            <ShieldCheck className="h-3 w-3" />
          ) : analytics.eliminationProb < 60 ? (
            <Zap className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {analytics.eliminationProb < 30
            ? "Peluang Kuat"
            : analytics.eliminationProb < 60
            ? "Papan Tengah / Rebutan"
            : "Zona Kritis"}
        </span>
      </div>

      {/* CONTAINER UTAMA */}
      <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4 text-card-foreground">
        
        {/* PROBABILITY BAR */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] md:text-xs font-bold">
            <span className="text-sky-700 dark:text-sky-400">Quarter: {analytics.quarterFinalsProb}%</span>
            <span className="text-emerald-700 dark:text-emerald-400">Play-Ins: {analytics.playInsProb}%</span>
            <span className="text-rose-700 dark:text-rose-400">Gugur: {analytics.eliminationProb}%</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div style={{ width: `${analytics.quarterFinalsProb}%` }} className="bg-sky-500 transition-all duration-500" />
            <div style={{ width: `${analytics.playInsProb}%` }} className="bg-emerald-500 transition-all duration-500" />
            <div style={{ width: `${analytics.eliminationProb}%` }} className="bg-rose-500 transition-all duration-500" />
          </div>
        </div>

        {/* 3 METRIC TILES */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="rounded-xl border border-border bg-card p-2">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground block">
              Sisa Laga
            </span>
            <span className="text-xs sm:text-sm font-black text-foreground">
              {analytics.remainingMatchesCount} Match
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-2">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground block">
              Target Aman
            </span>
            <span className="text-xs sm:text-sm font-black text-primary">
              Min {analytics.safeWinsThreshold} Win
            </span>
          </div>
          <div className="rounded-xl border border-border bg-card p-2">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground block">
              Tingkat SoS
            </span>
            <span className={`text-[10px] sm:text-xs font-black truncate block ${
              analytics.sosLabel === "Berat" ? "text-rose-600 dark:text-rose-400" : analytics.sosLabel === "Ringan" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
            }`}>
              {analytics.sosRating}/100 ({analytics.sosLabel})
            </span>
          </div>
        </div>

        {/* TABEL WHAT-IF SKENARIO HASIL SISA */}
        {analytics.scenarios.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
              <Layers className="h-3 w-3 text-primary" /> Matriks Skenario Sisa Laga (What-If)
            </span>
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card/60">
              <table className="w-full text-left text-[10px] sm:text-xs">
                <thead className="bg-muted/50 border-b border-border text-[9px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5">Hasil Sisa</th>
                    <th className="px-2 py-1.5 text-center text-sky-700 dark:text-sky-400">Quarter</th>
                    <th className="px-2 py-1.5 text-center text-emerald-700 dark:text-emerald-400">Play-Ins</th>
                    <th className="px-2.5 py-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analytics.scenarios.map((sc, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-2.5 py-1.5 font-black">{sc.recordLabel}</td>
                      <td className="px-2 py-1.5 text-center font-bold">{sc.quarterProb}%</td>
                      <td className="px-2 py-1.5 text-center font-bold">{sc.playInsProb}%</td>
                      <td className="px-2.5 py-1.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          sc.statusBadge === "SAFE"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : sc.statusBadge === "COMPETITIVE"
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : sc.statusBadge === "CRITICAL"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}>
                          {sc.statusBadge === "SAFE" ? "Sangat Aman" : sc.statusBadge === "COMPETITIVE" ? "Kompetitif" : sc.statusBadge === "CRITICAL" ? "Batas Tipis" : "Gugur"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LAGA KUNCI (🔥 CRITICAL MATCHES) */}
        {analytics.criticalMatches.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
              <Flame className="h-3 w-3 text-rose-500" /> Laga Kunci (Critical Fixtures)
            </span>
            <div className="space-y-1">
              {analytics.criticalMatches.map((m) => (
                <div key={m.matchId} className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-[10.5px]">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <img src={m.opponentLogo} alt="" className="h-4 w-4 object-contain shrink-0" />
                    <span className="font-bold truncate text-foreground">vs {m.opponentName}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">Rank #{m.opponentRank}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    m.importance === "CRITICAL_SWING"
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {m.importance === "CRITICAL_SWING" ? "🔥 6-Point Swing" : "Pesaing Kuota"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REKOMENDASI TAKTIS */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1">
          <span className="text-[9.5px] font-bold text-primary flex items-center gap-1">
            <Target className="h-3 w-3" /> Ringkasan Taktis & Eksekusi:
          </span>
          <ul className="space-y-1 text-[10.5px] md:text-xs text-muted-foreground list-disc list-inside">
            {analytics.tacticalSummary.map((adv, idx) => (
              <li key={idx} className="leading-snug">
                {adv}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}