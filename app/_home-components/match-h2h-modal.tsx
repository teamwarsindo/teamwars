"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MatchScheduleItem,
  formatDateTimeWIB,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
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

  const colorA = statsA.teamColor || "#EF4444";
  const colorB = statsB.teamColor || "#3B82F6";

  const parseWildcardRank = (label: string) => {
    const matchRes = label.match(/\d+/);
    return matchRes ? parseInt(matchRes[0], 10) : null;
  };

  const wildcardNumA = parseWildcardRank(statsA.wildcardRankLabel);
  const wildcardNumB = parseWildcardRank(statsB.wildcardRankLabel);

  // Helper render angka metrik: Bungkus Pill Highlight warna tim bagi yang unggul
  const renderStatValue = (valA: number, valB: number, isSideA: boolean, labelText: string | number) => {
    const isWinner = isSideA ? valA > valB : valB > valA;
    const teamColor = isSideA ? colorA : colorB;

    if (isWinner) {
      return (
        <span
          style={{ backgroundColor: teamColor }}
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-sm"
        >
          {labelText}
        </span>
      );
    }

    return (
      <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground px-1">
        {labelText}
      </span>
    );
  };

  // Helper render rank: Bungkus Pill Highlight warna tim bagi rank yang lebih baik
  const renderRankValue = (rankA: number | string, rankB: number | string, isSideA: boolean, labelText: string | number) => {
    const numA = typeof rankA === "number" ? rankA : 99;
    const numB = typeof rankB === "number" ? rankB : 99;
    const isWinner = isSideA ? numA < numB : numB < numA;
    const teamColor = isSideA ? colorA : colorB;

    if (isWinner) {
      return (
        <span
          style={{ backgroundColor: teamColor }}
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-sm"
        >
          {labelText}
        </span>
      );
    }

    return (
      <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground px-1">
        {labelText}
      </span>
    );
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[92vh] w-full max-w-lg sm:max-w-xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER MODAL (CENTER ALIGNED) */}
        <div className="relative border-b border-border bg-muted/30 px-4 py-3 sm:px-6 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-primary">
              <Swords className="h-3 w-3" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              {formatDateTimeWIB(match.matchDate, { includeDay: true })}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3.5 top-3.5 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {/* TEAM DISPLAY HEAD-TO-HEAD */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 border border-border">
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1 sm:gap-1.5">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full" style={{ color: colorA }}>
                {match.teamAName}
              </span>
            </div>

            <div className="px-3 shrink-0 text-center">
              <span className="text-xs sm:text-sm font-black text-muted-foreground">VS</span>
            </div>

            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1 sm:gap-1.5">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full" style={{ color: colorB }}>
                {match.teamBName}
              </span>
            </div>
          </div>

          {/* PREDIKSI MATCH */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-bold">
              <span className="text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Prediksi Match
              </span>
              <span className="text-muted-foreground">Peluang Menang</span>
            </div>

            <div className="h-2 sm:h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                style={{ width: `${prediction.probA}%`, backgroundColor: colorA }}
                className="h-full transition-all duration-300"
              />
              <div
                style={{ width: `${prediction.probB}%`, backgroundColor: colorB }}
                className="h-full transition-all duration-300"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium">
              <span className="font-bold" style={{ color: colorA }}>{prediction.probA}%</span>
              <span className="rounded-full bg-background/80 border border-border/50 px-2.5 py-0.5 text-[9.5px] sm:text-[10px] text-muted-foreground font-medium">
                Prediksi Skor: <span className="font-bold" style={{ color: colorA }}>{prediction.predScoreA}</span> - <span className="font-bold" style={{ color: colorB }}>{prediction.predScoreB}</span>
              </span>
              <span className="font-bold" style={{ color: colorB }}>{prediction.probB}%</span>
            </div>
          </div>

          {/* PERBANDINGAN STATISTIK SEASON 7 */}
          <div className="space-y-1.5 text-[10px] sm:text-[11px]">
            <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              {/* 1. PERINGKAT GROUP */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5">
                  {renderRankValue(statsA.rank, statsB.rank, true, statsA.groupRankLabel)}
                  {statsA.isTopGroup && (
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 text-[8px] sm:text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400">
                      Quarter
                    </span>
                  )}
                </div>

                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Peringkat Group</span>

                <div className="flex items-center gap-1.5">
                  {statsB.isTopGroup && (
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 text-[8px] sm:text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400">
                      Quarter
                    </span>
                  )}
                  {renderRankValue(statsA.rank, statsB.rank, false, statsB.groupRankLabel)}
                </div>
              </div>

              {/* 2. PERINGKAT WILDCARD */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5">
                  {statsA.isTopGroup ? (
                    <span className="text-muted-foreground px-1">-</span>
                  ) : (
                    <>
                      {renderRankValue(wildcardNumA ?? 99, wildcardNumB ?? 99, true, statsA.wildcardRankLabel)}
                      {wildcardNumA !== null && (
                        <span
                          className={`rounded-md border px-1.5 py-0.2 text-[8px] sm:text-[8.5px] font-bold ${
                            wildcardNumA <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
                              ? "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {wildcardNumA <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA ? "Play-Ins" : "Eliminasi"}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Peringkat Wildcard</span>

                <div className="flex items-center gap-1.5">
                  {statsB.isTopGroup ? (
                    <span className="text-muted-foreground px-1">-</span>
                  ) : (
                    <>
                      {wildcardNumB !== null && (
                        <span
                          className={`rounded-md border px-1.5 py-0.2 text-[8px] sm:text-[8.5px] font-bold ${
                            wildcardNumB <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
                              ? "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {wildcardNumB <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA ? "Play-Ins" : "Eliminasi"}
                        </span>
                      )}
                      {renderRankValue(wildcardNumA ?? 99, wildcardNumB ?? 99, false, statsB.wildcardRankLabel)}
                    </>
                  )}
                </div>
              </div>

              {/* 3. FORM LAGA */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-0.5">
                  {statsA.form.length ? (
                    statsA.form.map((res, i) => (
                      <span
                        key={i}
                        className={`rounded px-1.5 py-0.2 text-[7.5px] sm:text-[8px] font-bold ${
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

                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Form Laga</span>

                <div className="flex items-center gap-0.5">
                  {statsB.form.length ? (
                    statsB.form.map((res, i) => (
                      <span
                        key={i}
                        className={`rounded px-1.5 py-0.2 text-[7.5px] sm:text-[8px] font-bold ${
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

              {/* 4. WIN RATE */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                {renderStatValue(statsA.winRate, statsB.winRate, true, `${statsA.winRate}%`)}
                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Win Rate</span>
                {renderStatValue(statsA.winRate, statsB.winRate, false, `${statsB.winRate}%`)}
              </div>

              {/* 5. PTS DIFF */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                {renderStatValue(statsA.rawDiff, statsB.rawDiff, true, statsA.roundDifference)}
                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Pts Diff</span>
                {renderStatValue(statsA.rawDiff, statsB.rawDiff, false, statsB.roundDifference)}
              </div>

              {/* 6. PTS DIFF RATE */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                {renderStatValue(statsA.ptsDiffRate, statsB.ptsDiffRate, true, statsA.ptsDiffRateLabel)}
                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Pts Diff Rate</span>
                {renderStatValue(statsA.ptsDiffRate, statsB.ptsDiffRate, false, statsB.ptsDiffRateLabel)}
              </div>

              {/* 7. TOTAL SCORED */}
              <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                {renderStatValue(statsA.setWins, statsB.setWins, true, statsA.setWins)}
                <span className="text-muted-foreground font-normal text-[9px] sm:text-[9.5px]">Total Scored</span>
                {renderStatValue(statsA.setWins, statsB.setWins, false, statsB.setWins)}
              </div>

              {/* 8. REPORT WEEK (MOBILE: 2 BARIS, DESKTOP: 1 BARIS) */}
              {pastWeeks.map((week) => {
                const itemA = historyMapA.get(week);
                const itemB = historyMapB.get(week);

                return (
                  <div key={week} className="flex items-center justify-between px-3 py-1.5 sm:py-2">
                    {/* SISI TIM A */}
                    <div className="flex-1 min-w-0 pr-1.5">
                      {itemA ? (
                        <a
                          href={itemA.reportLink || "#"}
                          target={itemA.reportLink ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={`flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 hover:opacity-80 transition max-w-full ${
                            itemA.reportLink ? "cursor-pointer group" : "cursor-default"
                          }`}
                        >
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`rounded px-1.5 py-0.2 font-bold text-[7px] sm:text-[7.5px] ${
                                itemA.isWin
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {itemA.isWin ? "W" : "L"}
                            </span>
                            <span className="text-[8px] sm:text-[8.5px] text-muted-foreground font-medium">vs</span>
                            <img src={itemA.oppLogo} alt="" className="h-3 w-3 sm:h-3.5 sm:w-3.5 object-contain shrink-0" />
                          </div>

                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-medium text-foreground text-[8.5px] sm:text-[9.5px] truncate group-hover:underline">
                              {itemA.oppName}
                            </span>
                            {itemA.reportLink && (
                              <ExternalLink className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                            )}
                          </div>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[8.5px] sm:text-[9px]">-</span>
                      )}
                    </div>

                    {/* LABEL TENGAH */}
                    <span className="text-muted-foreground font-normal text-[8.5px] sm:text-[9.5px] shrink-0 px-1 text-center">
                      Report Week {week}
                    </span>

                    {/* SISI TIM B */}
                    <div className="flex-1 min-w-0 pl-1.5 text-right">
                      {itemB ? (
                        <a
                          href={itemB.reportLink || "#"}
                          target={itemB.reportLink ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={`flex flex-col sm:flex-row-reverse sm:items-center gap-0.5 sm:gap-1.5 hover:opacity-80 transition max-w-full items-end ${
                            itemB.reportLink ? "cursor-pointer group" : "cursor-default"
                          }`}
                        >
                          <div className="flex items-center gap-1 shrink-0">
                            <img src={itemB.oppLogo} alt="" className="h-3 w-3 sm:h-3.5 sm:w-3.5 object-contain shrink-0" />
                            <span className="text-[8px] sm:text-[8.5px] text-muted-foreground font-medium">vs</span>
                            <span
                              className={`rounded px-1.5 py-0.2 font-bold text-[7px] sm:text-[7.5px] ${
                                itemB.isWin
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {itemB.isWin ? "W" : "L"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 min-w-0 justify-end">
                            {itemB.reportLink && (
                              <ExternalLink className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                            )}
                            <span className="font-medium text-foreground text-[8.5px] sm:text-[9.5px] truncate group-hover:underline">
                              {itemB.oppName}
                            </span>
                          </div>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[8.5px] sm:text-[9px]">-</span>
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