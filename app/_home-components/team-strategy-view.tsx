"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { generateAdvancedPlayoffAnalytics } from "@/app/tournament/_library/simulator";
import { Sparkles, Target, ShieldCheck, Zap, AlertTriangle, GitFork, Swords } from "lucide-react";

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
    return generateAdvancedPlayoffAnalytics(teamName, allSchedules, allTeams, 3000);
  }, [teamName, allTeams, allSchedules]);

  return (
    <div className="space-y-3">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Decision Dashboard Playoff
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] md:text-[10px] font-bold border ${
            analytics.eliminationProb < 35
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : analytics.eliminationProb < 65
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
          }`}
        >
          {analytics.eliminationProb < 35 ? (
            <ShieldCheck className="h-3 w-3" />
          ) : analytics.eliminationProb < 65 ? (
            <Zap className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {analytics.eliminationProb < 35 ? "Peluang Kuat" : analytics.eliminationProb < 65 ? "Zona Perebutan" : "Zona Kritis"}
        </span>
      </div>

      {/* CONTAINER UTAMA */}
      <div className="space-y-3.5 rounded-2xl border border-border bg-muted/20 p-3.5 sm:p-4 text-card-foreground">
        
        {/* PROBABILITY BAR OUTLOOK */}
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

        {/* 🟢 3-TIER STRATEGIC TARGETS */}
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Target className="h-3 w-3 text-primary" /> Target Strategis (Sisa {analytics.remainingMatchesCount} Match)
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2">
              <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">
                Safe Target
              </span>
              <span className="text-xs sm:text-sm font-black text-foreground block">
                {analytics.targets.safeRecord}
              </span>
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                {analytics.targets.safeProb}% Lolos
              </span>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2">
              <span className="text-[8px] font-bold text-sky-700 dark:text-sky-400 uppercase block">
                Target Kompetitif
              </span>
              <span className="text-xs sm:text-sm font-black text-foreground block">
                {analytics.targets.competitiveRecord}
              </span>
              <span className="text-[9px] font-bold text-sky-700 dark:text-sky-400">
                {analytics.targets.competitiveProb}% Lolos
              </span>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2">
              <span className="text-[8px] font-bold text-rose-700 dark:text-rose-400 uppercase block">
                Survival Threshold
              </span>
              <span className="text-xs sm:text-sm font-black text-foreground block">
                {analytics.targets.survivalRecord}
              </span>
              <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400">
                {analytics.targets.survivalProb}% Lolos
              </span>
            </div>
          </div>
        </div>

        {/* 🟢 CONDITIONAL SCENARIOS / WHAT-IF */}
        {analytics.conditional && (
          <div className="rounded-xl border border-border bg-card/60 p-2.5 space-y-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <GitFork className="h-3 w-3 text-purple-600 dark:text-purple-400" /> Skenario Laga Terdekat (vs {analytics.conditional.nextOpponentName})
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Jika Menang:</span>
                <span className="text-muted-foreground">Peluang Play-Ins naik ke <strong className="text-emerald-700 dark:text-emerald-400 font-black">{analytics.conditional.winImpactProb}%</strong></span>
              </div>
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2">
                <span className="font-bold text-rose-700 dark:text-rose-400 block">Jika Kalah:</span>
                <span className="text-muted-foreground">Peluang turun ke <strong className="text-rose-700 dark:text-rose-400 font-black">{analytics.conditional.loseImpactProb}%</strong> (Wajib sisa {analytics.conditional.loseRequiredRecord})</span>
              </div>
            </div>
          </div>
        )}

        {/* 🟢 TACTICAL MATCH PRIORITY */}
        {analytics.tacticalMatches.length > 0 && (
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Swords className="h-3 w-3 text-primary" /> Prioritas Taktis Sisa Laga (SoS: {analytics.sosRating}/100)
            </span>
            <div className="space-y-1.5">
              {analytics.tacticalMatches.map((m) => (
                <div key={m.matchId} className="flex items-center justify-between rounded-xl border border-border bg-card p-2 text-[10.5px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={m.opponentLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold truncate text-foreground">{m.opponentName}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">Rank #{m.opponentRank}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block truncate">{m.description}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded block ${
                      m.strategyTag === "MUST_WIN"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : m.strategyTag === "UPSET_OPPORTUNITY"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                    }`}>
                      {m.tagLabel}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">Win Prob: {m.winProbability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REKOMENDASI TAKTIS */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1">
          <span className="text-[9.5px] font-bold text-primary flex items-center gap-1">
            <Target className="h-3 w-3" /> Rekomendasi Keputusan Tim:
          </span>
          <ul className="space-y-1 text-[10.5px] md:text-xs text-muted-foreground list-disc list-inside">
            {analytics.strategicTakeaways.map((adv, idx) => (
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