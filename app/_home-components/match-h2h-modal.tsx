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
import { X, Swords, Trophy, Sparkles, Image as ImageIcon } from "lucide-react";
import {
  StatsPill,
  QualificationBadge,
  FormSlots,
  MatchReportRowItem,
} from "./match-h2h-parts";

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
    return () => {
      document.body.style.overflow = prev;
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
  const pred = useMemo(
    () =>
      statsA && statsB
        ? calculateMatchPrediction(statsA, statsB)
        : { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 },
    [statsA, statsB]
  );

  const historyA = useMemo(
    () => (match ? getTeamHistoryMap(match.teamAName, allSchedules) : new Map()),
    [match, allSchedules]
  );
  const historyB = useMemo(
    () => (match ? getTeamHistoryMap(match.teamBName, allSchedules) : new Map()),
    [match, allSchedules]
  );

  const isMatchFinished =
    Boolean(match?.isFinished) ||
    ((Number(match?.scoreA) || 0) + (Number(match?.scoreB) || 0) > 0 &&
      match?.isFinished !== false);
  const actualScoreA = Number(match?.scoreA) || 0;
  const actualScoreB = Number(match?.scoreB) || 0;
  const isWinnerA = isMatchFinished && actualScoreA > actualScoreB;
  const isWinnerB = isMatchFinished && actualScoreB > actualScoreA;

  const pastWeeks = useMemo(() => {
    const target = match?.weekNumber || currentWeek;
    const maxWeek = isMatchFinished ? target : Math.max(0, target - 1);
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  }, [match, currentWeek, isMatchFinished]);

  if (!mounted || !match || !statsA || !statsB) return null;

  const reportUrl = match.maskedImageUrl || match.reportImageUrl;

  const metrics = [
    { label: "Win Rate", valA: statsA.winRate, valB: statsB.winRate, txtA: `${statsA.winRate}%`, txtB: `${statsB.winRate}%` },
    { label: "Pts Diff", valA: statsA.rawDiff, valB: statsB.rawDiff, txtA: statsA.roundDifference, txtB: statsB.roundDifference },
    { label: "Total Scored", valA: statsA.setWins, valB: statsB.setWins, txtA: statsA.setWins, txtB: statsB.setWins },
  ];

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[95vh] w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5 md:py-3 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[9.5px] md:text-xs font-bold text-primary">
              <Swords className="h-3 w-3 md:h-3.5 md:w-3.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[10.5px] md:text-[11.5px] text-muted-foreground font-medium">
              {formatDateTimeWIB(match.matchDate, { includeDay: true })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4 md:h-4.5 md:w-4.5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-4 md:p-5 space-y-3 text-xs md:text-sm">
          
          {/* TEAMS DISPLAY */}
          <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 border border-border">
            {/* TIM A */}
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
              <span className={`text-xs sm:text-sm truncate w-full ${isWinnerA ? "font-black text-emerald-600 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                {match.teamAName}
              </span>
            </div>

            {/* SCORE CENTER */}
            {isMatchFinished ? (
              <div className="flex flex-col items-center px-4 shrink-0">
                <div className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                  <span className={isWinnerA ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                    {actualScoreA}
                  </span>
                  <span className="text-muted-foreground/30 text-lg sm:text-xl">-</span>
                  <span className={isWinnerB ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                    {actualScoreB}
                  </span>
                </div>
                <span className="rounded-full bg-muted/80 border border-border/50 px-2 py-0.5 text-[8.5px] font-black uppercase text-muted-foreground tracking-wider mt-1">
                  FT • Selesai
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center px-3">
                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">VS</span>
              </div>
            )}

            {/* TIM B */}
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
              <span className={`text-xs sm:text-sm truncate w-full ${isWinnerB ? "font-black text-emerald-600 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                {match.teamBName}
              </span>
            </div>
          </div>

          {/* BANNER STATUS / BUKTI REPORT */}
          {isMatchFinished ? (
            reportUrl && (
              <div className="flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition shrink-0"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Bukti Report Pertandingan ↗
                </a>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 sm:p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] md:text-xs font-bold">
                <span className="text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> Prediksi Match</span>
                <span className="text-muted-foreground">Peluang Menang</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                <div style={{ width: `${pred.probA}%` }} className="h-full bg-sky-500 transition-all duration-300" />
                <div style={{ width: `${pred.probB}%` }} className="h-full bg-amber-500 transition-all duration-300" />
              </div>
              <div className="flex items-center justify-between text-[10.5px] md:text-xs font-medium">
                <span className="font-bold text-sky-500">{pred.probA}%</span>
                <span className="inline-flex items-center justify-center rounded-full bg-primary px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-primary-foreground shadow-xs">
                  Prediksi Skor: {pred.predScoreA} - {pred.predScoreB}
                </span>
                <span className="font-bold text-amber-500">{pred.probB}%</span>
              </div>
            </div>
          )}

          {/* STATS MATRIX */}
          <div className="space-y-1">
            <span className="text-[9.5px] md:text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              {/* 1. STATUS KLASEMEN */}
              <div className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-2">
                <div className="flex justify-center"><QualificationBadge qual={statsA.qualification} /></div>
                <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">Status Klasemen</span>
                <div className="flex justify-center"><QualificationBadge qual={statsB.qualification} /></div>
              </div>

              {/* 2. METRICS: WIN RATE, PTS DIFF, TOTAL SCORED */}
              {metrics.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                  <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={true} text={m.txtA} /></div>
                  <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">{m.label}</span>
                  <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={false} text={m.txtB} /></div>
                </div>
              ))}

              {/* 3. FORM LAGA */}
              <div className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                <div className="flex justify-center"><FormSlots formList={statsA.form} /></div>
                <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">Form Laga</span>
                <div className="flex justify-center"><FormSlots formList={statsB.form} /></div>
              </div>

              {/* 4. REPORT WEEK */}
              {pastWeeks.map((week) => (
                <div key={week} className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                  <div className="flex justify-center min-w-0">
                    <MatchReportRowItem item={historyA.get(week)} isA={true} />
                  </div>
                  <span className="text-muted-foreground text-[8.5px] md:text-[10px] font-semibold text-center px-1 whitespace-nowrap">
                    Report Week {week}
                  </span>
                  <div className="flex justify-center min-w-0">
                    <MatchReportRowItem item={historyB.get(week)} isA={false} />
                  </div>
                </div>
              ))}
            </div>

            {/* FOOTNOTE / CATATAN KAKI */}
            <div className="px-2 pt-1 text-center">
              <span className="text-[8.5px] md:text-[9.5px] font-medium text-muted-foreground/80 italic">
                💡 Klik baris <strong>Report Week</strong> untuk melihat screenshot bukti pertandingan.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
    }              
