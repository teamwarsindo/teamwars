"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem, formatDateTimeWIB } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamStatsFromStandings,
  calculateMatchPrediction,
  getTeamHistoryMap,
  MatchHistoryCardItem,
  QualificationStatus,
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

  const renderPill = (valA: number, valB: number, isA: boolean, text: string | number) => {
    const isWin = isA ? valA > valB : valB > valA;
    const isDraw = valA === valB;

    if (isWin && !isDraw) {
      return (
        <span style={{ backgroundColor: isA ? colorA : colorB }} className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 md:px-3.5 md:py-1 text-[9.5px] sm:text-[10px] md:text-xs font-bold text-white shadow-sm">
          {text}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-muted border border-border/50 px-2.5 py-0.5 md:px-3.5 md:py-1 text-[9.5px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">
        {text}
      </span>
    );
  };

  const renderQualification2Lines = (qual: QualificationStatus, isA = true) => {
    return (
      <div className={`flex flex-col gap-0.5 ${isA ? "items-start text-left" : "items-end text-right"}`}>
        <span className="font-bold text-[10px] sm:text-[11px] md:text-xs text-foreground">
          {qual.rankLabel}
        </span>
        <span
          className={`inline-flex items-center justify-center rounded-full px-2 py-0.2 md:px-2.5 md:py-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-bold border shadow-xs ${
            qual.isQualified
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"
          }`}
        >
          {qual.stageLabel}
        </span>
      </div>
    );
  };

  const renderForm8Slots = (formList: ("W" | "L")[], isA = true) => {
    const slots = Array.from({ length: 8 }, (_, i) => formList[i] || null);

    return (
      <div className={`grid grid-cols-4 gap-1 md:gap-1.5 max-w-fit ${isA ? "justify-items-start" : "justify-items-end"}`}>
        {slots.map((res, i) => {
          if (!res) {
            return (
              <span key={i} className="inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 items-center justify-center rounded bg-muted/40 border border-border/30 text-[7.5px] md:text-[8.5px] text-muted-foreground/40 font-bold">
                -
              </span>
            );
          }
          return (
            <span
              key={i}
              className={`inline-flex h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 items-center justify-center rounded font-black text-[7.5px] sm:text-[8px] md:text-[9.5px] shadow-2xs ${
                res === "W"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              }`}
            >
              {res}
            </span>
          );
        })}
      </div>
    );
  };

  const renderReportItem = (item?: MatchHistoryCardItem, isA = true) => {
    if (!item) return <span className="inline-flex items-center justify-center rounded-full bg-muted/60 border border-border/40 px-2.5 py-0.5 text-[9px] md:text-[10px] text-muted-foreground">-</span>;
    return (
      <a
        href={item.reportLink || "#"}
        target={item.reportLink ? "_blank" : "_self"}
        rel="noopener noreferrer"
        className={`flex items-center gap-2 md:gap-2.5 hover:opacity-80 transition max-w-full ${isA ? "flex-row" : "flex-row-reverse"} ${item.reportLink ? "cursor-pointer group" : "cursor-default"}`}
      >
        <img src={item.oppLogo} alt="" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 object-contain shrink-0 rounded-lg bg-background/50 border border-border/50 p-0.5" />
        <div className={`flex flex-col gap-0.5 min-w-0 ${isA ? "items-start text-left" : "items-end text-right"}`}>
          <span className={`rounded px-1.5 py-0.2 md:px-2 md:py-0.5 font-black text-[7.5px] sm:text-[8px] md:text-[9px] shrink-0 ${item.isWin ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>
            {item.isWin ? "Win" : "Lose"} {item.myScore}-{item.oppScore}
          </span>
          <div className={`flex items-center gap-1 min-w-0 ${!isA && "flex-row-reverse"}`}>
            <span className="font-semibold text-foreground text-[8.5px] sm:text-[9.5px] md:text-[11px] truncate max-w-[85px] sm:max-w-[130px] md:max-w-[180px] group-hover:underline">
              {item.oppName}
            </span>
            {item.reportLink && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary transition shrink-0" />}
          </div>
        </div>
      </a>
    );
  };

  const metrics = [
    { label: "Win Rate", valA: statsA.winRate, valB: statsB.winRate, txtA: `${statsA.winRate}%`, txtB: `${statsB.winRate}%` },
    { label: "Pts Diff", valA: statsA.rawDiff, valB: statsB.rawDiff, txtA: statsA.roundDifference, txtB: statsB.roundDifference },
    { label: "Pts Diff Rate", valA: statsA.ptsDiffRate, valB: statsB.ptsDiffRate, txtA: statsA.ptsDiffRateLabel, txtB: statsB.ptsDiffRateLabel },
    { label: "Total Scored", valA: statsA.setWins, valB: statsB.setWins, txtA: statsA.setWins, txtB: statsB.setWins },
  ];

  return createPortal(
    <div
      onClick={(e) => { if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) onClose(); }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-in fade-in"
    >
      <div ref={modalContentRef} className="relative flex max-h-[92vh] w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/30 px-4 py-3 sm:px-6 md:py-4 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 md:px-3 md:py-1 text-[9.5px] md:text-xs font-bold text-primary">
              <Swords className="h-3 w-3 md:h-3.5 md:w-3.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[11px] md:text-xs text-muted-foreground font-medium">{formatDateTimeWIB(match.matchDate, { includeDay: true })}</p>
          </div>
          <button type="button" onClick={onClose} className="absolute right-3.5 top-3.5 md:right-4 md:top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer">
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 text-xs md:text-sm">
          
          {/* TEAMS DISPLAY */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3.5 sm:p-4 md:p-5 border border-border">
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain" />
              <span className="text-[11px] sm:text-xs md:text-sm font-bold truncate w-full" style={{ color: colorA }}>{match.teamAName}</span>
            </div>
            <span className="px-3 md:px-5 text-xs sm:text-sm md:text-base font-black text-muted-foreground">VS</span>
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain" />
              <span className="text-[11px] sm:text-xs md:text-sm font-bold truncate w-full" style={{ color: colorB }}>{match.teamBName}</span>
            </div>
          </div>

          {/* PREDICTION BAR */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between text-[9.5px] md:text-xs font-bold">
              <span className="text-primary flex items-center gap-1"><Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" /> Prediksi Match</span>
              <span className="text-muted-foreground">Peluang Menang</span>
            </div>
            <div className="h-2 md:h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div style={{ width: `${pred.probA}%`, backgroundColor: colorA }} className="h-full transition-all duration-300" />
              <div style={{ width: `${pred.probB}%`, backgroundColor: colorB }} className="h-full transition-all duration-300" />
            </div>
            <div className="flex items-center justify-between text-[11px] md:text-xs font-medium">
              <span className="font-bold" style={{ color: colorA }}>{pred.probA}%</span>
              
              <span
                style={{ backgroundColor: pred.probA >= pred.probB ? colorA : colorB }}
                className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 md:px-3.5 md:py-1 text-[9.5px] sm:text-[10px] md:text-xs font-bold text-white shadow-sm"
              >
                Prediksi Skor: {pred.predScoreA} - {pred.predScoreB}
              </span>

              <span className="font-bold" style={{ color: colorB }}>{pred.probB}%</span>
            </div>
          </div>

          {/* STATS MATRIX */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              
              {/* STATUS KLASEMEN 2 BARIS */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3">
                <div className="flex justify-start">{renderQualification2Lines(statsA.qualification, true)}</div>
                <span className="text-muted-foreground text-[9px] md:text-[11px] font-semibold text-center px-2">Status Klasemen</span>
                <div className="flex justify-end">{renderQualification2Lines(statsB.qualification, false)}</div>
              </div>

              {/* FORM LAGA */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5">
                <div className="flex justify-start">{renderForm8Slots(statsA.form, true)}</div>
                <span className="text-muted-foreground text-[9px] md:text-[11px] font-semibold text-center px-2">Form Laga</span>
                <div className="flex justify-end">{renderForm8Slots(statsB.form, false)}</div>
              </div>

              {/* METRICS LOOP */}
              {metrics.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5">
                  <div className="flex justify-start">{renderPill(m.valA, m.valB, true, m.txtA)}</div>
                  <span className="text-muted-foreground text-[9px] md:text-[11px] font-semibold text-center px-2">{m.label}</span>
                  <div className="flex justify-end">{renderPill(m.valA, m.valB, false, m.txtB)}</div>
                </div>
              ))}

              {/* REPORT WEEK */}
              {pastWeeks.map((week) => (
                <div key={week} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3">
                  <div className="flex justify-start min-w-0 pr-1">{renderReportItem(historyA.get(week), true)}</div>
                  <span className="text-muted-foreground text-[8.5px] md:text-[10.5px] font-semibold text-center px-2 whitespace-nowrap">Report Week {week}</span>
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