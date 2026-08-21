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
  MatchReportCompactItem,
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
        ? calculateMatchPrediction(statsA, statsB, allSchedules, standings)
        : { probA: 50, probB: 50, predScoreA: 10, predScoreB: 9 },
    [statsA, statsB, allSchedules, standings]
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[94vh] w-full max-w-lg lg:max-w-4xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/40 px-4 py-2.5 sm:px-5 sm:py-3 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              <Swords className="h-3.5 w-3.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
              {formatDateTimeWIB(match.matchDate, { includeDay: true })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* BODY: DESKTOP 2-KOLOM (MENYAMPING) / MOBILE 1-KOLOM LAPANG */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-start">
            
            {/* SISI KIRI (5 KOLOM DI DESKTOP): MATCH CARD & PREDIKSI */}
            <div className="lg:col-span-5 space-y-3">
              {/* TEAMS DISPLAY */}
              <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3 sm:p-4 border border-border">
                {/* TIM A */}
                <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
                  <img
                    src={match.teamALogo || "/logo.webp"}
                    alt=""
                    className="h-11 w-11 sm:h-14 sm:w-14 object-contain drop-shadow-sm"
                  />
                  <span className={`text-xs sm:text-sm truncate w-full ${isWinnerA ? "font-black text-emerald-700 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                    {match.teamAName}
                  </span>
                </div>

                {/* TENGAH: SKOR / VS */}
                {isMatchFinished ? (
                  <div className="flex flex-col items-center px-2 sm:px-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xl sm:text-2xl font-black tracking-tight">
                      <span className={isWinnerA ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {actualScoreA}
                      </span>
                      <span className="text-muted-foreground/30 text-base">-</span>
                      <span className={isWinnerB ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {actualScoreB}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted/80 border border-border/60 px-2 py-0.5 text-[8px] font-black uppercase text-muted-foreground tracking-wider mt-1">
                      FT • Selesai
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-2 shrink-0">
                    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
                      VS
                    </span>
                  </div>
                )}

                {/* TIM B */}
                <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1.5">
                  <img
                    src={match.teamBLogo || "/logo.webp"}
                    alt=""
                    className="h-11 w-11 sm:h-14 sm:w-14 object-contain drop-shadow-sm"
                  />
                  <span className={`text-xs sm:text-sm truncate w-full ${isWinnerB ? "font-black text-emerald-700 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                    {match.teamBName}
                  </span>
                </div>
              </div>

              {/* BANNER STATUS / PREDIKSI */}
              {isMatchFinished ? (
                reportUrl && (
                  <div className="flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                    <a
                      href={reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition shrink-0"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Bukti Report Match ↗
                    </a>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold">
                    <span className="text-primary flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Prediksi Match
                    </span>
                    <span className="text-muted-foreground">Peluang</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                    <div style={{ width: `${pred.probA}%` }} className="h-full bg-sky-500 transition-all duration-300" />
                    <div style={{ width: `${pred.probB}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium">
                    <span className="font-bold text-sky-600 dark:text-sky-400">{pred.probA}%</span>
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                      Skor: {pred.predScoreA} - {pred.predScoreB}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{pred.probB}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* SISI KANAN (7 KOLOM DI DESKTOP): MATRIKS STATISTIK & REPORT */}
            <div className="lg:col-span-7 space-y-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-1">
                <Trophy className="h-3.5 w-3.5 text-primary" /> Perbandingan Statistik Season 7
              </span>

              <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden shadow-2xs">
                {/* 1. STATUS KLASEMEN */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
                  <div className="flex justify-center"><QualificationBadge qual={statsA.qualification} /></div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs font-bold text-center px-3 min-w-[90px]">Klasemen</span>
                  <div className="flex justify-center"><QualificationBadge qual={statsB.qualification} /></div>
                </div>

                {/* 2. METRICS: WIN RATE, PTS DIFF, TOTAL SCORED */}
                {metrics.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5">
                    <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={true} text={m.txtA} /></div>
                    <span className="text-muted-foreground text-[10px] sm:text-xs font-bold text-center px-3 min-w-[90px]">{m.label}</span>
                    <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={false} text={m.txtB} /></div>
                  </div>
                ))}

                {/* 3. FORM LAGA */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5">
                  <div className="flex justify-center"><FormSlots formList={statsA.form} /></div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs font-bold text-center px-3 min-w-[90px]">Form Laga</span>
                  <div className="flex justify-center"><FormSlots formList={statsB.form} /></div>
                </div>

                {/* 4. DAFTAR REPORT WEEK (HINGGA 8 WEEK BEBAS NABRAK) */}
                {pastWeeks.map((week) => (
                  <div key={week} className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-1.5 hover:bg-muted/40 transition">
                    <div className="flex justify-end pr-1 min-w-0">
                      <MatchReportCompactItem item={historyA.get(week)} isA={true} />
                    </div>
                    <span className="rounded-md bg-muted/80 px-2 py-0.5 text-muted-foreground text-[9px] sm:text-[10px] font-extrabold text-center mx-1 whitespace-nowrap min-w-[65px]">
                      Week {week}
                    </span>
                    <div className="flex justify-start pl-1 min-w-0">
                      <MatchReportCompactItem item={historyB.get(week)} isA={false} />
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTNOTE */}
              <div className="px-1 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground italic">
                  💡 Klik baris <strong>Week</strong> untuk membuka gambar bukti match.
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}