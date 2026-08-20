"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem, formatDateTimeWIB, TOURNAMENT_RULES } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
  getTeamHistoryMap,
  MatchHistoryCardItem,
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
    if (match) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [match]);

  const statsA = useMemo(() => match ? getTeamStatsFromStandings(match.teamAName, standings, match.teamAColor) : null, [match, standings]);
  const statsB = useMemo(() => match ? getTeamStatsFromStandings(match.teamBName, standings, match.teamBColor) : null, [match, standings]);
  const pred = useMemo(() => (statsA && statsB) ? calculateMatchPrediction(statsA, statsB) : { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 }, [statsA, statsB]);

  const historyA = useMemo(() => match ? getTeamHistoryMap(match.teamAName, allSchedules) : new Map(), [match, allSchedules]);
  const historyB = useMemo(() => match ? getTeamHistoryMap(match.teamBName, allSchedules) : new Map(), [match, allSchedules]);

  const pastWeeks = useMemo(() => {
    const target = match?.weekNumber || currentWeek;
    return Array.from({ length: Math.max(0, target - 1) }, (_, i) => i + 1);
  }, [match, currentWeek]);

  if (!mounted || !match || !statsA || !statsB) return null;

  const colorA = statsA.teamColor || "#EF4444";
  const colorB = statsB.teamColor || "#3B82F6";

  const numRankA = typeof statsA.rank === "number" ? statsA.rank : 99;
  const numRankB = typeof statsB.rank === "number" ? statsB.rank : 99;
  const parseWildcard = (l: string) => { const m = l.match(/\d+/); return m ? parseInt(m[0], 10) : 99; };
  const wNumA = parseWildcard(statsA.wildcardRankLabel);
  const wNumB = parseWildcard(statsB.wildcardRankLabel);

  // Render Pill Highlight otomatis bagi pemenang metrik
  const renderPill = (valA: number, valB: number, isA: boolean, text: string | number, isLowerBetter = false) => {
    const isWin = isLowerBetter ? (isA ? valA < valB : valB < valA) : (isA ? valA > valB : valB > valA);
    if (isWin) {
      return (
        <span style={{ backgroundColor: isA ? colorA : colorB }} className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {text}
        </span>
      );
    }
    return <span className="text-[10px] text-muted-foreground px-1">{text}</span>;
  };

  // Render Item Riwayat Pertandingan 2 Baris
  const renderReportItem = (item?: MatchHistoryCardItem, isA = true) => {
    if (!item) return <span className="text-muted-foreground text-[8.5px]">-</span>;
    return (
      <a
        href={item.reportLink || "#"}
        target={item.reportLink ? "_blank" : "_self"}
        rel="noopener noreferrer"
        className={`flex flex-col gap-0.5 hover:opacity-80 transition max-w-full ${isA ? "items-start" : "items-end"} ${item.reportLink ? "cursor-pointer group" : "cursor-default"}`}
      >
        <span className={`rounded px-1.5 py-0.2 font-bold text-[7.5px] ${item.isWin ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>
          {item.isWin ? "Win" : "Lose"} {item.myScore}-{item.oppScore}
        </span>
        <div className={`flex items-center gap-1 min-w-0 ${!isA && "flex-row-reverse"}`}>
          <img src={item.oppLogo} alt="" className="h-3 w-3 object-contain shrink-0" />
          <span className="font-medium text-foreground text-[8.5px] sm:text-[9.5px] truncate max-w-[85px] sm:max-w-[130px] group-hover:underline">
            {item.oppName}
          </span>
          {item.reportLink && <ExternalLink className="h-2 w-2 text-muted-foreground group-hover:text-primary transition shrink-0" />}
        </div>
      </a>
    );
  };

  // Metrik perbandingan matrix
  const metrics = [
    { label: "Win Rate", valA: statsA.winRate, valB: statsB.winRate, txtA: `${statsA.winRate}%`, txtB: `${statsB.winRate}%` },
    { label: "Pts Diff", valA: statsA.rawDiff, valB: statsB.rawDiff, txtA: statsA.roundDifference, txtB: statsB.roundDifference },
    { label: "Pts Diff Rate", valA: statsA.ptsDiffRate, valB: statsB.ptsDiffRate, txtA: statsA.ptsDiffRateLabel, txtB: statsB.ptsDiffRateLabel },
    { label: "Total Scored", valA: statsA.setWins, valB: statsB.setWins, txtA: statsA.setWins, txtB: statsB.setWins },
  ];

  return createPortal(
    <div
      onClick={(e) => { if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in"
    >
      <div ref={modalContentRef} className="relative flex max-h-[92vh] w-full max-w-lg sm:max-w-xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/30 px-4 py-3 sm:px-6 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[9.5px] font-bold text-primary">
              <Swords className="h-3 w-3" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[11px] text-muted-foreground font-medium">{formatDateTimeWIB(match.matchDate, { includeDay: true })}</p>
          </div>
          <button type="button" onClick={onClose} className="absolute right-3.5 top-3.5 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          
          {/* TEAMS */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 border border-border">
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full" style={{ color: colorA }}>{match.teamAName}</span>
            </div>
            <span className="px-3 text-xs sm:text-sm font-black text-muted-foreground">VS</span>
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
              <span className="text-[11px] sm:text-xs font-semibold truncate w-full" style={{ color: colorB }}>{match.teamBName}</span>
            </div>
          </div>

          {/* PREDICTION BAR */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[9.5px] font-bold">
              <span className="text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> Prediksi Match</span>
              <span className="text-muted-foreground">Peluang Menang</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div style={{ width: `${pred.probA}%`, backgroundColor: colorA }} className="h-full transition-all duration-300" />
              <div style={{ width: `${pred.probB}%`, backgroundColor: colorB }} className="h-full transition-all duration-300" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="font-bold" style={{ color: colorA }}>{pred.probA}%</span>
              <span className="rounded-full bg-background/80 border border-border/50 px-2.5 py-0.5 text-[9.5px] text-muted-foreground font-medium">
                Prediksi Skor: <span className="font-bold" style={{ color: colorA }}>{pred.predScoreA}</span> - <span className="font-bold" style={{ color: colorB }}>{pred.predScoreB}</span>
              </span>
              <span className="font-bold" style={{ color: colorB }}>{pred.probB}%</span>
            </div>
          </div>

          {/* STATS MATRIX */}
          <div className="space-y-1.5 text-[10px] sm:text-[11px]">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              
              {/* GROUP RANK */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5 justify-start">
                  {renderPill(numRankA, numRankB, true, statsA.groupRankLabel, true)}
                  {statsA.isTopGroup && <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Quarter</span>}
                </div>
                <span className="text-muted-foreground text-[9px] text-center px-2">Peringkat Group</span>
                <div className="flex items-center gap-1.5 justify-end">
                  {statsB.isTopGroup && <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Quarter</span>}
                  {renderPill(numRankA, numRankB, false, statsB.groupRankLabel, true)}
                </div>
              </div>

              {/* WILDCARD RANK */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5 justify-start">
                  {statsA.isTopGroup ? <span className="text-muted-foreground px-1">-</span> : (
                    <>
                      {renderPill(wNumA, wNumB, true, statsA.wildcardRankLabel, true)}
                      {wNumA <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA && <span className="rounded-md border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.2 text-[8px] font-bold text-sky-600 dark:text-sky-400 shrink-0">Play-Ins</span>}
                    </>
                  )}
                </div>
                <span className="text-muted-foreground text-[9px] text-center px-2">Peringkat Wildcard</span>
                <div className="flex items-center gap-1.5 justify-end">
                  {statsB.isTopGroup ? <span className="text-muted-foreground px-1">-</span> : (
                    <>
                      {wNumB <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA && <span className="rounded-md border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.2 text-[8px] font-bold text-sky-600 dark:text-sky-400 shrink-0">Play-Ins</span>}
                      {renderPill(wNumA, wNumB, false, statsB.wildcardRankLabel, true)}
                    </>
                  )}
                </div>
              </div>

              {/* FORM LAGA */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:py-2">
                <div className="flex items-center gap-0.5 justify-start">
                  {statsA.form.map((res, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.2 text-[7.5px] font-bold ${res === "W" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>{res}</span>
                  ))}
                </div>
                <span className="text-muted-foreground text-[9px] text-center px-2">Form Laga</span>
                <div className="flex items-center gap-0.5 justify-end">
                  {statsB.form.map((res, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.2 text-[7.5px] font-bold ${res === "W" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>{res}</span>
                  ))}
                </div>
              </div>

              {/* METRICS LOOP */}
              {metrics.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:py-2">
                  <div className="flex justify-start">{renderPill(m.valA, m.valB, true, m.txtA)}</div>
                  <span className="text-muted-foreground text-[9px] text-center px-2">{m.label}</span>
                  <div className="flex justify-end">{renderPill(m.valA, m.valB, false, m.txtB)}</div>
                </div>
              ))}

              {/* REPORT WEEK LOOP */}
              {pastWeeks.map((week) => (
                <div key={week} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
                  <div className="flex justify-start min-w-0 pr-1">{renderReportItem(historyA.get(week), true)}</div>
                  <span className="text-muted-foreground text-[8.5px] text-center px-2 whitespace-nowrap">Report Week {week}</span>
                  <div className="flex justify-end min-w-0 pl-1">{renderReportItem(historyB.get(week), false)}</div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}