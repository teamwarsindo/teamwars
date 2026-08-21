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
import { X, Swords, Trophy, Sparkles, Image as ImageIcon, History } from "lucide-react";
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

  const displayWeeks = useMemo(() => {
    const target = match?.weekNumber || currentWeek;
    const count = Math.max(target > 1 ? target - 1 : 1, isMatchFinished ? target : 2);
    return Array.from({ length: Math.min(count, 7) }, (_, i) => i + 1);
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-3 sm:p-5 md:p-6 backdrop-blur-md animate-in fade-in"
    >
      {/* CONTAINER MODAL BESAR & LEBAR PENUH DI DESKTOP */}
      <div
        ref={modalContentRef}
        className="relative flex max-h-[94vh] w-[95vw] max-w-[1200px] flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/40 px-6 py-3.5 sm:py-4 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-bold text-primary">
              <Swords className="h-4 w-4" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {formatDateTimeWIB(match.matchDate, { includeDay: true })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY: 2-KOLOM LAPANG (KIRI STATISTIK, KANAN RIWAYAT LEGA) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            
            {/* SISI KIRI (5 KOLOM DI DESKTOP): MATCH + PREDIKSI + STATISTIK */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* TEAMS DISPLAY */}
              <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-4 sm:p-5 border border-border shadow-2xs">
                {/* TIM A */}
                <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-2">
                  <img
                    src={match.teamALogo || "/logo.webp"}
                    alt=""
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md"
                  />
                  <span className={`text-xs sm:text-sm md:text-base truncate w-full ${isWinnerA ? "font-black text-emerald-700 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                    {match.teamAName}
                  </span>
                </div>

                {/* TENGAH: SKOR / VS */}
                {isMatchFinished ? (
                  <div className="flex flex-col items-center px-3 sm:px-4 shrink-0">
                    <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight">
                      <span className={isWinnerA ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {actualScoreA}
                      </span>
                      <span className="text-muted-foreground/30 text-lg">-</span>
                      <span className={isWinnerB ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {actualScoreB}
                      </span>
                    </div>
                    <span className="rounded-full bg-muted/80 border border-border/60 px-2.5 py-0.5 text-[9px] font-black uppercase text-muted-foreground tracking-wider mt-1">
                      FT • Selesai
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-3 sm:px-4 shrink-0">
                    <span className="rounded-xl bg-muted px-3.5 py-1.5 text-xs sm:text-sm font-black text-muted-foreground">
                      VS
                    </span>
                  </div>
                )}

                {/* TIM B */}
                <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-2">
                  <img
                    src={match.teamBLogo || "/logo.webp"}
                    alt=""
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md"
                  />
                  <span className={`text-xs sm:text-sm md:text-base truncate w-full ${isWinnerB ? "font-black text-emerald-700 dark:text-emerald-400" : "font-bold text-foreground"}`}>
                    {match.teamBName}
                  </span>
                </div>
              </div>

              {/* BANNER PREDIKSI / BUKTI REPORT */}
              {isMatchFinished ? (
                reportUrl && (
                  <div className="flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <a
                      href={reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition shrink-0"
                    >
                      <ImageIcon className="h-4 w-4" /> Bukti Report Match ↗
                    </a>
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Prediksi Match
                    </span>
                    <span className="text-muted-foreground">Peluang Menang</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                    <div style={{ width: `${pred.probA}%` }} className="h-full bg-sky-500 transition-all duration-300" />
                    <div style={{ width: `${pred.probB}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span className="font-bold text-sky-600 dark:text-sky-400">{pred.probA}%</span>
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-0.5 text-[11px] sm:text-xs font-bold text-primary-foreground shadow-xs">
                      Skor: {pred.predScoreA} - {pred.predScoreB}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{pred.probB}%</span>
                  </div>
                </div>
              )}

              {/* STATISTIK INTI SEASON 7 */}
              <div className="rounded-2xl border border-border bg-muted/20 divide-y divide-border overflow-hidden shadow-2xs flex-1 flex flex-col justify-around">
                {/* 1. STATUS KLASEMEN */}
                <div className="grid grid-cols-[1fr_110px_1fr] items-center px-4 py-2.5">
                  <div className="flex justify-center"><QualificationBadge qual={statsA.qualification} /></div>
                  <span className="text-muted-foreground text-xs font-bold text-center">Klasemen</span>
                  <div className="flex justify-center"><QualificationBadge qual={statsB.qualification} /></div>
                </div>

                {/* 2. METRICS */}
                {metrics.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_110px_1fr] items-center px-4 py-2">
                    <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={true} text={m.txtA} /></div>
                    <span className="text-muted-foreground text-xs font-bold text-center">{m.label}</span>
                    <div className="flex justify-center"><StatsPill valA={m.valA} valB={m.valB} isA={false} text={m.txtB} /></div>
                  </div>
                ))}

                {/* 3. FORM LAGA */}
                <div className="grid grid-cols-[1fr_110px_1fr] items-center px-4 py-2">
                  <div className="flex justify-center"><FormSlots formList={statsA.form} /></div>
                  <span className="text-muted-foreground text-xs font-bold text-center">Form Laga</span>
                  <div className="flex justify-center"><FormSlots formList={statsB.form} /></div>
                </div>
              </div>
            </div>

            {/* SISI KANAN (7 KOLOM DI DESKTOP): RIWAYAT MATCH LAPANG PENUH */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 sm:p-6 shadow-2xs h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <History className="h-4.5 w-4.5 text-primary" /> Riwayat Pertandingan Pekan Lalu
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Reguler Season
                  </span>
                </div>

                {/* SUB-HEADER: IDENTITAS KEPEMILIKAN KOLOM */}
                <div className="grid grid-cols-[1fr_80px_1fr] items-center px-4 py-2 bg-muted/40 rounded-xl border border-border/40 text-center">
                  <span className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 truncate px-1">
                    {match.teamAName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                    PEKAN
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate px-1">
                    {match.teamBName}
                  </span>
                </div>

                {/* LIST KARTU REPORT PER PEKAN (LELUASA & NAMA TIM UTUH) */}
                <div className="space-y-3 pt-1">
                  {displayWeeks.map((week) => (
                    <div
                      key={week}
                      className="grid grid-cols-[1fr_80px_1fr] items-center py-2.5 px-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/60 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-end">
                        <MatchReportCompactItem item={historyA.get(week)} isA={true} />
                      </div>
                      <div className="flex justify-center">
                        <span className="rounded-md bg-muted border border-border/60 px-2.5 py-1 text-muted-foreground text-[10px] sm:text-[11px] font-extrabold text-center whitespace-nowrap shadow-2xs">
                          Week {week}
                        </span>
                      </div>
                      <div className="flex items-center justify-start">
                        <MatchReportCompactItem item={historyB.get(week)} isA={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FOOTNOTE */}
              <div className="pt-3.5 border-t border-border/50 text-center mt-4">
                <span className="text-xs font-medium text-muted-foreground italic">
                  💡 Klik baris pertandingan untuk membuka screenshot bukti report.
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