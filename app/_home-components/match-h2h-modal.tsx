"use client";

import { useEffect, useMemo } from "react";
import { MatchScheduleItem, formatDateTimeWIB } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
  getTeamMatchHistory,
} from "@/app/tournament/_library/calculator";
import { X, Swords, Trophy, Sparkles, ExternalLink } from "lucide-react";

interface MatchH2HModalProps {
  match: MatchScheduleItem | null;
  currentWeek: number;
  standings?: ExtendedStandingItem[];
  allSchedules?: MatchScheduleItem[];
  onClose: () => void;
}

export function MatchH2HModal({
  match,
  currentWeek,
  standings = [],
  allSchedules = [],
  onClose,
}: MatchH2HModalProps) {
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
    () =>
      match
        ? getTeamStatsFromStandings(match.teamAName, standings, "#2563EB")
        : null,
    [match, standings]
  );

  const statsB = useMemo(
    () =>
      match
        ? getTeamStatsFromStandings(match.teamBName, standings, "#F43F5E")
        : null,
    [match, standings]
  );

  const prediction = useMemo(() => {
    if (!statsA || !statsB) return { probA: 50, probB: 50 };
    return calculateMatchPrediction(statsA, statsB);
  }, [statsA, statsB]);

  const historyA = useMemo(
    () => (match ? getTeamMatchHistory(match.teamAName, allSchedules) : new Map()),
    [match, allSchedules]
  );

  const historyB = useMemo(
    () => (match ? getTeamMatchHistory(match.teamBName, allSchedules) : new Map()),
    [match, allSchedules]
  );

  const completedWeeks = useMemo(() => {
    const weekSet = new Set<number>();
    historyA.forEach((_, w) => weekSet.add(w));
    historyB.forEach((_, w) => weekSet.add(w));
    return Array.from(weekSet).sort((a, b) => a - b);
  }, [historyA, historyB]);

  if (!match || !statsA || !statsB) return null;

  const colorA = statsA.teamColor;
  const colorB = statsB.teamColor;

  const getMetricStyle = (valA: number, valB: number, isSideA: boolean) => {
    if (valA === valB) {
      return { color: isSideA ? colorA : colorB };
    }
    if (isSideA) {
      return valA > valB ? { color: colorA } : undefined;
    } else {
      return valB > valA ? { color: colorB } : undefined;
    }
  };

  const getRankStyle = (rankA: number | string, rankB: number | string, isSideA: boolean) => {
    const numA = typeof rankA === "number" ? rankA : 99;
    const numB = typeof rankB === "number" ? rankB : 99;
    if (numA === numB) {
      return { color: isSideA ? colorA : colorB };
    }
    if (isSideA) {
      return numA < numB ? { color: colorA } : undefined;
    } else {
      return numB < numA ? { color: colorB } : undefined;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto cursor-default"
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
            {formatDateTimeWIB(match.matchDate, { includeDay: true })}
          </p>
        </div>

        {/* TEAM DISPLAY */}
        <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-2.5 sm:p-3 border border-border/50">
          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
            <span className="text-[10.5px] font-medium text-foreground truncate w-full" style={{ color: colorA }}>
              {match.teamAName}
            </span>
          </div>

          <div className="px-2 shrink-0 text-center">
            <span className="text-xs font-black text-muted-foreground">VS</span>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
            <span className="text-[10.5px] font-medium text-foreground truncate w-full" style={{ color: colorB }}>
              {match.teamBName}
            </span>
          </div>
        </div>

        {/* PREDIKSI MATCH */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-2.5 sm:p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Prediksi Match
            </span>
            <span className="text-muted-foreground">Peluang Menang</span>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${prediction.probA}%`, backgroundColor: colorA }}
              className="h-full transition-all duration-300"
            />
            <div
              style={{ width: `${prediction.probB}%`, backgroundColor: colorB }}
              className="h-full transition-all duration-300"
            />
          </div>

          <div className="flex items-center justify-between text-[10.5px] font-medium">
            <span style={{ color: colorA }}>{prediction.probA}%</span>
            <span style={{ color: colorB }}>{prediction.probB}%</span>
          </div>
        </div>

        {/* STATS MATRIX */}
        <div className="space-y-1.5 text-[10px]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
            <Trophy className="h-2.5 w-2.5 text-primary" /> Perbandingan Statistik Season 7
          </span>

          <div className="rounded-2xl border border-border/60 bg-muted/10 divide-y divide-border/40 overflow-hidden">
            {/* 1. RANK */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-medium text-muted-foreground" style={getRankStyle(statsA.rank, statsB.rank, true)}>
                #{statsA.rank}
              </span>
              <span className="text-muted-foreground font-normal text-[9px]">Peringkat Klasemen</span>
              <span className="font-medium text-muted-foreground" style={getRankStyle(statsA.rank, statsB.rank, false)}>
                #{statsB.rank}
              </span>
            </div>

            {/* 2. FORM LAGA */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                {statsA.form.length ? (
                  statsA.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-bold ${
                        res === "W"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {res}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground text-[8px]">-</span>
                )}
              </div>

              <span className="text-muted-foreground font-normal text-[9px]">Form Laga</span>

              <div className="flex items-center gap-0.5">
                {statsB.form.length ? (
                  statsB.form.map((res, i) => (
                    <span
                      key={i}
                      className={`rounded px-1 py-0.2 text-[7.5px] font-bold ${
                        res === "W"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
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

            {/* 3. WIN RATE */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.winRate, statsB.winRate, true)}>
                {statsA.winRate}%
              </span>
              <span className="text-muted-foreground font-normal text-[9px]">Win Rate</span>
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.winRate, statsB.winRate, false)}>
                {statsB.winRate}%
              </span>
            </div>

            {/* 4. PTS DIFF */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.rawDiff, statsB.rawDiff, true)}>
                {statsA.roundDifference}
              </span>
              <span className="text-muted-foreground font-normal text-[9px]">Pts Diff</span>
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.rawDiff, statsB.rawDiff, false)}>
                {statsB.roundDifference}
              </span>
            </div>

            {/* 5. PTS DIFF RATE */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.ptsDiffRate, statsB.ptsDiffRate, true)}>
                {statsA.ptsDiffRateLabel}
              </span>
              <span className="text-muted-foreground font-normal text-[9px]">Pts Diff Rate</span>
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.ptsDiffRate, statsB.ptsDiffRate, false)}>
                {statsB.ptsDiffRateLabel}
              </span>
            </div>

            {/* 6. TOTAL SCORED */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.setWins, statsB.setWins, true)}>
                {statsA.setWins}
              </span>
              <span className="text-muted-foreground font-normal text-[9px]">Total Scored</span>
              <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.setWins, statsB.setWins, false)}>
                {statsB.setWins}
              </span>
            </div>
          </div>
        </div>

        {/* RIWAYAT MATCH */}
        {completedWeeks.length > 0 && (
          <div className="space-y-1.5 text-[9.5px]">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Riwayat Pertandingan
            </span>

            <div className="space-y-1">
              {completedWeeks.map((week) => {
                const itemA = historyA.get(week);
                const itemB = historyB.get(week);

                return (
                  <div
                    key={week}
                    className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl border border-border/50 bg-muted/20 items-center"
                  >
                    {itemA ? (
                      <a
                        href={itemA.reportLink || "#"}
                        target={itemA.reportLink ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className={`flex items-center justify-between p-1 rounded-lg border border-border/40 bg-background/50 hover:border-primary/40 transition truncate ${
                          itemA.reportLink ? "cursor-pointer group" : "cursor-default"
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`rounded px-1 py-0.2 text-[7.5px] font-bold shrink-0 ${
                              itemA.result === "WIN"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : "bg-rose-500/20 text-rose-600"
                            }`}
                          >
                            {itemA.result === "WIN" ? "W" : "L"}
                          </span>
                          <img src={itemA.opponentLogo} alt="" className="h-3 w-3 object-contain shrink-0" />
                          <span className="truncate text-[8.5px] text-muted-foreground">
                            {itemA.opponentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 pl-1">
                          <span className="font-medium text-[8.5px] text-foreground">
                            {itemA.teamScore}-{itemA.opponentScore}
                          </span>
                          {itemA.reportLink && (
                            <ExternalLink className="h-2 w-2 text-muted-foreground group-hover:text-primary transition" />
                          )}
                        </div>
                      </a>
                    ) : (
                      <div className="p-1 rounded-lg border border-dashed border-border/40 text-center text-[8px] text-muted-foreground/60">
                        W{week} -
                      </div>
                    )}

                    {itemB ? (
                      <a
                        href={itemB.reportLink || "#"}
                        target={itemB.reportLink ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className={`flex items-center justify-between p-1 rounded-lg border border-border/40 bg-background/50 hover:border-primary/40 transition truncate ${
                          itemB.reportLink ? "cursor-pointer group" : "cursor-default"
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={`rounded px-1 py-0.2 text-[7.5px] font-bold shrink-0 ${
                              itemB.result === "WIN"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : "bg-rose-500/20 text-rose-600"
                            }`}
                          >
                            {itemB.result === "WIN" ? "W" : "L"}
                          </span>
                          <img src={itemB.opponentLogo} alt="" className="h-3 w-3 object-contain shrink-0" />
                          <span className="truncate text-[8.5px] text-muted-foreground">
                            {itemB.opponentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 pl-1">
                          <span className="font-medium text-[8.5px] text-foreground">
                            {itemB.teamScore}-{itemB.opponentScore}
                          </span>
                          {itemB.reportLink && (
                            <ExternalLink className="h-2 w-2 text-muted-foreground group-hover:text-primary transition" />
                          )}
                        </div>
                      </a>
                    ) : (
                      <div className="p-1 rounded-lg border border-dashed border-border/40 text-center text-[8px] text-muted-foreground/60">
                        W{week} -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}