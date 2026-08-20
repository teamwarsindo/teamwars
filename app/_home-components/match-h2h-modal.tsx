"use client";

import { useEffect, useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
} from "@/app/tournament/_library/calculator";
import { X, Swords, Flame, Trophy, Sparkles } from "lucide-react";

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
  // 🟢 Lock Body Scroll saat modal aktif
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

  // Helper untuk styling keunggulan metrik (lebih tinggi = hijau, lebih rendah = muted)
  const getMetricClass = (valA: number, valB: number, isSideA: boolean) => {
    if (valA === valB) return "text-foreground font-bold";
    if (isSideA) {
      return valA > valB
        ? "text-emerald-500 font-black"
        : "text-muted-foreground font-semibold";
    } else {
      return valB > valA
        ? "text-emerald-500 font-black"
        : "text-muted-foreground font-semibold";
    }
  };

  // Rank lebih kecil nomornya = lebih baik (Rank 1 > Rank 2)
  const getRankClass = (rankA: number | string, rankB: number | string, isSideA: boolean) => {
    const numA = typeof rankA === "number" ? rankA : 99;
    const numB = typeof rankB === "number" ? rankB : 99;
    if (numA === numB) return "text-foreground font-bold";
    if (isSideA) {
      return numA < numB
        ? "text-emerald-500 font-black"
        : "text-muted-foreground font-semibold";
    } else {
      return numB < numA
        ? "text-emerald-500 font-black"
        : "text-muted-foreground font-semibold";
    }
  };

  return (
    /* BACKDROP CONTAINER - KLIK DI SINI MENUTUP MODAL */
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      {/* MODAL CARD BODY - STOP PROPAGATION AGAR KLIK DI DALAM TIDAK MENUTUP MODAL */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
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

        {/* TEAM VS DISPLAY */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 p-2.5 border border-border/50">
          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamAName}</span>
          </div>

          <div className="px-2 shrink-0 text-center">
            <span className="text-xs font-black text-primary">VS</span>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 object-contain" />
            <span className="text-[10.5px] font-bold text-foreground truncate w-full">{match.teamBName}</span>
          </div>
        </div>

        {/* 🔮 MATCH PREDICTION BAR */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Prediksi Match
            </span>
            <span className="text-muted-foreground">Peluang Menang</span>
          </div>

          {/* RATIO BAR */}
          <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
            <div
              style={{ width: `${prediction.probA}%` }}
              className="h-full bg-primary transition-all duration-300"
            />
            <div
              style={{ width: `${prediction.probB}%` }}
              className="h-full bg-rose-500 transition-all duration-300"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-black">
            <span className="text-primary">{prediction.probA}%</span>
            <span className="text-rose-500">{prediction.probB}%</span>
          </div>
        </div>

        {/* STATS MATRIX */}
        <div className="space-y-1.5 text-[10px]">
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5 text-primary" /> Perbandingan Statistik Season 7
          </span>

          <div className="rounded-xl border border-border/60 bg-muted/10 divide-y divide-border/40 overflow-hidden">
            {/* 1. RANK */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getRankClass(statsA.rank, statsB.rank, true)}>#{statsA.rank}</span>
              <span className="text-muted-foreground font-medium text-[9px]">Peringkat Klasemen</span>
              <span className={getRankClass(statsA.rank, statsB.rank, false)}>#{statsB.rank}</span>
            </div>

            {/* 2. REKOR MATCH */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getMetricClass(statsA.matchWins, statsB.matchWins, true)}>
                {statsA.matchWins} Win - {statsA.matchLosses} Lose
              </span>
              <span className="text-muted-foreground font-medium text-[9px]">Rekor Match</span>
              <span className={getMetricClass(statsA.matchWins, statsB.matchWins, false)}>
                {statsB.matchWins} Win - {statsB.matchLosses} Lose
              </span>
            </div>

            {/* 3. WIN RATE */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getMetricClass(statsA.winRate, statsB.winRate, true)}>{statsA.winRate}%</span>
              <span className="text-muted-foreground font-medium text-[9px]">Win Rate</span>
              <span className={getMetricClass(statsA.winRate, statsB.winRate, false)}>{statsB.winRate}%</span>
            </div>

            {/* 4. SELISIH POIN (PTS DIFF) */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getMetricClass(statsA.rawDiff, statsB.rawDiff, true)}>
                {statsA.roundDifference}
              </span>
              <span className="text-muted-foreground font-medium text-[9px]">Pts Diff</span>
              <span className={getMetricClass(statsA.rawDiff, statsB.rawDiff, false)}>
                {statsB.roundDifference}
              </span>
            </div>

            {/* 5. PTS DIFF RATE */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getMetricClass(statsA.ptsDiffRate, statsB.ptsDiffRate, true)}>
                {statsA.ptsDiffRateLabel}
              </span>
              <span className="text-muted-foreground font-medium text-[9px]">Pts Diff Rate</span>
              <span className={getMetricClass(statsA.ptsDiffRate, statsB.ptsDiffRate, false)}>
                {statsB.ptsDiffRateLabel}
              </span>
            </div>

            {/* 6. TOTAL SCORED */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className={getMetricClass(statsA.setWins, statsB.setWins, true)}>{statsA.setWins}</span>
              <span className="text-muted-foreground font-medium text-[9px]">Total Scored</span>
              <span className={getMetricClass(statsA.setWins, statsB.setWins, false)}>{statsB.setWins}</span>
            </div>

            {/* 7. RECENT FORM */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                {statsA.form.length ? (
                  statsA.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-black ${
                        res === "W" ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8px]">-</span>
                )}
              </div>

              <span className="text-muted-foreground font-medium text-[9px] flex items-center gap-0.5">
                <Flame className="h-2.5 w-2.5 text-amber-500" /> Form Laga
              </span>

              <div className="flex items-center gap-0.5">
                {statsB.form.length ? (
                  statsB.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-black ${
                        res === "W" ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8px]">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] text-muted-foreground">
          <span>{match.streamer ? `🎙️ ${match.streamer}` : "📺 Butuh Streamer"}</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-2.5 py-1 font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}