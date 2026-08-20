"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem, formatDateTimeWIB } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
  getTeamHistoryMap,
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
  const [mounted, setMounted] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    if (match) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [match]);

  const statsA = useMemo(
    () =>
      match
        ? getTeamStatsFromStandings(match.teamAName, standings, match.teamAColor)
        : null,
    [match, standings]
  );

  const statsB = useMemo(
    () =>
      match
        ? getTeamStatsFromStandings(match.teamBName, standings, match.teamBColor)
        : null,
    [match, standings]
  );

  const prediction = useMemo(() => {
    if (!statsA || !statsB) return { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 };
    return calculateMatchPrediction(statsA, statsB);
  }, [statsA, statsB]);

  const historyMapA = useMemo(
    () => (match ? getTeamHistoryMap(match.teamAName, allSchedules) : new Map()),
    [match, allSchedules]
  );

  const historyMapB = useMemo(
    () => (match ? getTeamHistoryMap(match.teamBName, allSchedules) : new Map()),
    [match, allSchedules]
  );

  const pastWeeks = useMemo(() => {
    const targetWeek = match?.weekNumber || currentWeek;
    const weeks: number[] = [];
    for (let w = 1; w < targetWeek; w++) {
      weeks.push(w);
    }
    return weeks;
  }, [match, currentWeek]);

  if (!mounted || !match || !statsA || !statsB) return null;

  const colorA = statsA.teamColor;
  const colorB = statsB.teamColor;

  const getMetricStyle = (valA: number, valB: number, isSideA: boolean) => {
    if (valA === valB) {
      return isSideA ? { color: colorA } : { color: colorB };
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
      return isSideA ? { color: colorA } : { color: colorB };
    }
    if (isSideA) {
      return numA < numB ? { color: colorA } : undefined;
    } else {
      return numB < numA ? { color: colorB } : undefined;
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <div className="min-w-0 pr-2">
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
              <Swords className="h-2.5 w-2.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[10.5px] text-muted-foreground font-medium mt-0.5">
              {formatDateTimeWIB(match.matchDate, { includeDay: true })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {/* TEAM DISPLAY */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-2.5 sm:p-3 border border-border">
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
              <span className="text-[11px] font-medium truncate w-full" style={{ color: colorA }}>
                {match.teamAName}
              </span>
            </div>

            <div className="px-2 shrink-0 text-center">
              <span className="text-xs font-black text-muted-foreground">VS</span>
            </div>

            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
              <span className="text-[11px] font-medium truncate w-full" style={{ color: colorB }}>
                {match.teamBName}
              </span>
            </div>
          </div>

          {/* PREDIKSI MATCH & SKOR AKHIR */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-2.5 sm:p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-bold">
              <span className="text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Prediksi Match
              </span>
              <span className="text-muted-foreground">Peluang Menang</span>
            </div>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                style={{ width: `${prediction.probA}%`, backgroundColor: colorA || "var(--primary)" }}
                className="h-full transition-all duration-300"
              />
              <div
                style={{ width: `${prediction.probB}%`, backgroundColor: colorB || "#F43F5E" }}
                className="h-full transition-all duration-300"
              />
            </div>

            <div className="flex items-center justify-between text-[10.5px] font-medium">
              <span style={{ color: colorA }}>{prediction.probA}%</span>
              <span className="text-[9.5px] text-muted-foreground font-normal">
                Prediksi Skor: <span style={{ color: colorA }}>{prediction.predScoreA}</span> - <span style={{ color: colorB }}>{prediction.predScoreB}</span>
              </span>
              <span style={{ color: colorB }}>{prediction.probB}%</span>
            </div>
          </div>

          {/* PERBANDINGAN STATISTIK SEASON 7 */}
          <div className="space-y-1.5 text-[10px]">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              {/* 1. PERINGKAT GROUP */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-medium text-muted-foreground" style={getRankStyle(statsA.rank, statsB.rank, true)}>
                  {statsA.groupRankLabel}
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Peringkat Group</span>
                <span className="font-medium text-muted-foreground" style={getRankStyle(statsA.rank, statsB.rank, false)}>
                  {statsB.groupRankLabel}
                </span>
              </div>

              {/* 2. PERINGKAT WILDCARD */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span
                  className="font-medium text-muted-foreground"
                  style={
                    statsA.isTopGroup
                      ? { color: colorA }
                      : !statsB.isTopGroup
                      ? getRankStyle(statsA.wildcardRankLabel, statsB.wildcardRankLabel, true)
                      : undefined
                  }
                >
                  {statsA.wildcardRankLabel}
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Peringkat Wildcard</span>
                <span
                  className="font-medium text-muted-foreground"
                  style={
                    statsB.isTopGroup
                      ? { color: colorB }
                      : !statsA.isTopGroup
                      ? getRankStyle(statsA.wildcardRankLabel, statsB.wildcardRankLabel, false)
                      : undefined
                  }
                >
                  {statsB.wildcardRankLabel}
                </span>
              </div>

              {/* 3. FORM LAGA */}
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
                        {res === "W" ? "WIN" : "LOSE"}
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
                        {res === "W" ? "WIN" : "LOSE"}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[8px]">-</span>
                  )}
                </div>
              </div>

              {/* 4. WIN RATE */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.winRate, statsB.winRate, true)}>
                  {statsA.winRate}%
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Win Rate</span>
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.winRate, statsB.winRate, false)}>
                  {statsB.winRate}%
                </span>
              </div>

              {/* 5. PTS DIFF */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.rawDiff, statsB.rawDiff, true)}>
                  {statsA.roundDifference}
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Pts Diff</span>
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.rawDiff, statsB.rawDiff, false)}>
                  {statsB.roundDifference}
                </span>
              </div>

              {/* 6. PTS DIFF RATE */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.ptsDiffRate, statsB.ptsDiffRate, true)}>
                  {statsA.ptsDiffRateLabel}
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Pts Diff Rate</span>
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.ptsDiffRate, statsB.ptsDiffRate, false)}>
                  {statsB.ptsDiffRateLabel}
                </span>
              </div>

              {/* 7. TOTAL SCORED */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.setWins, statsB.setWins, true)}>
                  {statsA.setWins}
                </span>
                <span className="text-muted-foreground font-normal text-[9px]">Total Scored</span>
                <span className="font-medium text-muted-foreground" style={getMetricStyle(statsA.setWins, statsB.setWins, false)}>
                  {statsB.setWins}
                </span>
              </div>

              {/* 8. REPORT WEEK (TANPA KOTAK / BORDER, TETAP KLIK LINK) */}
              {pastWeeks.map((week) => {
                const itemA = historyMapA.get(week);
                const itemB = historyMapB.get(week);

                return (
                  <div key={week} className="flex items-center justify-between px-3 py-1.5">
                    {/* SISI TIM A */}
                    <div className="flex-1 min-w-0 pr-1">
                      {itemA ? (
                        <a
                          href={itemA.reportLink || "#"}
                          target={itemA.reportLink ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 hover:opacity-80 transition text-[8.5px] max-w-full ${
                            itemA.reportLink ? "cursor-pointer group" : "cursor-default"
                          }`}
                        >
                          <span
                            className={`rounded px-1 py-0.2 font-bold shrink-0 text-[7px] ${
                              itemA.isWin
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {itemA.isWin ? "WIN" : "LOSE"}
                          </span>
                          <img src={itemA.oppLogo} alt="" className="h-3 w-3 object-contain shrink-0" />
                          <span className="font-medium text-foreground truncate shrink-0 group-hover:underline">
                            {itemA.myScore}-{itemA.oppScore}
                          </span>
                          {itemA.reportLink && (
                            <ExternalLink className="h-2 w-2 text-muted-foreground group-hover:text-primary transition shrink-0" />
                          )}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[8.5px]">-</span>
                      )}
                    </div>

                    {/* LABEL TENGAH */}
                    <span className="text-muted-foreground font-normal text-[9px] shrink-0 px-1">
                      Report Week {week}
                    </span>

                    {/* SISI TIM B */}
                    <div className="flex-1 min-w-0 pl-1 text-right">
                      {itemB ? (
                        <a
                          href={itemB.reportLink || "#"}
                          target={itemB.reportLink ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={`inline-flex items-center justify-end gap-1 hover:opacity-80 transition text-[8.5px] max-w-full ${
                            itemB.reportLink ? "cursor-pointer group" : "cursor-default"
                          }`}
                        >
                          <span
                            className={`rounded px-1 py-0.2 font-bold shrink-0 text-[7px] ${
                              itemB.isWin
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {itemB.isWin ? "WIN" : "LOSE"}
                          </span>
                          <img src={itemB.oppLogo} alt="" className="h-3 w-3 object-contain shrink-0" />
                          <span className="font-medium text-foreground truncate shrink-0 group-hover:underline">
                            {itemB.myScore}-{itemB.oppScore}
                          </span>
                          {itemB.reportLink && (
                            <ExternalLink className="h-2 w-2 text-muted-foreground group-hover:text-primary transition shrink-0" />
                          )}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[8.5px]">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
              }
