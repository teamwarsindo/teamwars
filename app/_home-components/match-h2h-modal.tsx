"use client";

import { useEffect, useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
} from "@/app/tournament/_library/calculator";
import { X, Swords, Trophy, Sparkles } from "lucide-react";

interface MatchH2HModalProps {
  match: MatchScheduleItem | null;
  currentWeek: number;
  standings?: ExtendedStandingItem[];
  onClose: () => void;
}

function formatFullSchedule(dateStr?: string) {
  if (!dateStr) return "Waktu Belum Ditentukan";
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timePart = d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":");
    return `${datePart} • ${timePart} WIB`;
  } catch {
    return dateStr;
  }
}

export function MatchH2HModal({
  match,
  currentWeek,
  standings = [],
  onClose,
}: MatchH2HModalProps) {
  // Lock Body Scroll saat modal aktif
  useEffect(() => {
    if (match) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [match]);

  const statsA = useMemo(
    () => (match ? getTeamStatsFromStandings(match.teamAName, standings) : null),
    [match, standings]
  );
  const statsB = useMemo(
    () => (match ? getTeamStatsFromStandings(match.teamBName, standings) : null),
    [match, standings]
  );

  const prediction = useMemo(() => {
    if (!statsA || !statsB) return { probA: 50, probB: 50 };
    return calculateMatchPrediction(statsA, statsB);
  }, [statsA, statsB]);

  if (!match || !statsA || !statsB) return null;

  // Warna Tim: Tim A = Biru (text-blue-600), Tim B = Merah (text-rose-500)
  const getMetricClass = (valA: number, valB: number, isSideA: boolean) => {
    if (valA === valB) return "text-foreground font-bold";
    if (isSideA) {
      return valA > valB
        ? "text-blue-600 dark:text-blue-400 font-black"
        : "text-muted-foreground font-medium";
    } else {
      return valB > valA
        ? "text-rose-500 dark:text-rose-400 font-black"
        : "text-muted-foreground font-medium";
    }
  };

  const getRankClass = (rankA: number | string, rankB: number | string, isSideA: boolean) => {
    const numA = typeof rankA === "number" ? rankA : 99;
    const numB = typeof rankB === "number" ? rankB : 99;
    if (numA === numB) return "text-foreground font-bold";
    if (isSideA) {
      return numA < numB
        ? "text-blue-600 dark:text-blue-400 font-black"
        : "text-muted-foreground font-medium";
    } else {
      return numB < numA
        ? "text-rose-500 dark:text-rose-400 font-black"
        : "text-muted-foreground font-medium";
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-3.5 my-auto cursor-default"
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* HEADER MATCH INFO */}
        <div className="text-center space-y-0.5 pr-6">
          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
            <Swords className="h-2.5 w-2.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
          </span>
          <p className="text-[10px] text-muted-foreground font-medium">
            {formatFullSchedule(match.matchDate)}
          </p>
        </div>

        {/* TEAM DISPLAY */}
        <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 border border-border/50">
          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamAName}</span>
          </div>

          <div className="px-2 shrink-0 text-center">
            <span className="text-xs font-black text-primary">VS</span>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-9 w-9 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamBName}</span>
          </div>
        </div>

        {/* PREDIKSI MATCH */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[9.5px] font-bold">
            <span className="text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Prediksi Match
            </span>
            <span className="text-muted-foreground">Peluang Menang</span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${prediction.probA}%` }}
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            />
            <div
              style={{ width: `${prediction.probB}%` }}
              className="h-full bg-rose-500 transition-all duration-300"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-black">
            <span className="text-blue-600 dark:text-blue-400">{prediction.probA}%</span>
            <span className="text-rose-500 dark:text-rose-400">{prediction.probB}%</span>
          </div>
        </div>

        {/* STATS MATRIX */}
        <div className="space-y-1.5 text-[10.5px]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
            <Trophy className="h-2.5 w-2.5 text-primary" /> Perbandingan Statistik Season 7
          </span>

          <div className="rounded-2xl border border-border/60 bg-muted/10 divide-y divide-border/40 overflow-hidden">
            {/* 1. RANK */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className={getRankClass(statsA.rank, statsB.rank, true)}>#{statsA.rank}</span>
              <span className="text-muted-foreground font-medium text-[9.5px]">Peringkat Klasemen</span>
              <span className={getRankClass(statsA.rank, statsB.rank, false)}>#{statsB.rank}</span>
            </div>

            {/* 2. FORM LAGA (MENGGANTIKAN REKOR MATCH) */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <div className="flex items-center gap-1">
                {statsA.form.length ? (
                  statsA.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1.5 py-0.5 text-[8px] font-black ${
                        res === "W"
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8.5px]">-</span>
                )}
              </div>

              <span className="text-muted-foreground font-medium text-[9.5px]">Form Laga</span>

              <div className="flex items-center gap-1">
                {statsB.form.length ? (
                  statsB.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1.5 py-0.5 text-[8px] font-black ${
                        res === "W"
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8.5px]">-</span>
                )}
              </div>
            </div>

            {/* 3. WIN RATE */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className={getMetricClass(statsA.winRate, statsB.winRate, true)}>{statsA.winRate}%</span>
              <span className="text-muted-foreground font-medium text-[9.5px]">Win Rate</span>
              <span className={getMetricClass(statsA.winRate, statsB.winRate, false)}>{statsB.winRate}%</span>
            </div>

            {/* 4. PTS DIFF */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className={getMetricClass(statsA.rawDiff, statsB.rawDiff, true)}>
                {statsA.roundDifference}
              </span>
              <span className="text-muted-foreground font-medium text-[9.5px]">Pts Diff</span>
              <span className={getMetricClass(statsA.rawDiff, statsB.rawDiff, false)}>
                {statsB.roundDifference}
              </span>
            </div>

            {/* 5. PTS DIFF RATE */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className={getMetricClass(statsA.ptsDiffRate, statsB.ptsDiffRate, true)}>
                {statsA.ptsDiffRateLabel}
              </span>
              <span className="text-muted-foreground font-medium text-[9.5px]">Pts Diff Rate</span>
              <span className={getMetricClass(statsA.ptsDiffRate, statsB.ptsDiffRate, false)}>
                {statsB.ptsDiffRateLabel}
              </span>
            </div>

            {/* 6. TOTAL SCORED */}
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className={getMetricClass(statsA.setWins, statsB.setWins, true)}>{statsA.setWins}</span>
              <span className="text-muted-foreground font-medium text-[9.5px]">Total Scored</span>
              <span className={getMetricClass(statsA.setWins, statsB.setWins, false)}>{statsB.setWins}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
