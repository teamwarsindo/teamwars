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
import { X, Swords, Trophy, Sparkles, ExternalLink, CheckCircle2, Image as ImageIcon } from "lucide-react";

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

  const isMatchFinished = Boolean(match?.isFinished) || ((Number(match?.scoreA) || 0) + (Number(match?.scoreB) || 0) > 0 && match?.isFinished !== false);
  const actualScoreA = Number(match?.scoreA) || 0;
  const actualScoreB = Number(match?.scoreB) || 0;
  const isWinnerA = isMatchFinished && actualScoreA > actualScoreB;
  const isWinnerB = isMatchFinished && actualScoreB > actualScoreA;

  // Tampilkan report sampai pekan pertandingan jika sudah selesai, atau pekan sebelumnya jika belum
  const pastWeeks = useMemo(() => {
    const target = match?.weekNumber || currentWeek;
    const maxWeek = isMatchFinished ? target : Math.max(0, target - 1);
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  }, [match, currentWeek, isMatchFinished]);

  if (!mounted || !match || !statsA || !statsB) return null;

  const colorA = statsA.teamColor || "#EF4444";
  const colorB = statsB.teamColor || "#3B82F6";
  const reportUrl = match.maskedImageUrl || match.reportImageUrl;

  const renderPill = (valA: number, valB: number, isA: boolean, text: string | number) => {
    const isWin = isA ? valA > valB : valB > valA;
    const isDraw = valA === valB;
    const teamColor = isA ? colorA : colorB;

    if (isWin && !isDraw) {
      return (
        <span style={{ backgroundColor: teamColor }} className="inline-flex items-center justify-center rounded-full px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-black text-white shadow-xs min-w-[62px]">
          {text}
        </span>
      );
    }

    if (isDraw) {
      return (
        <span
          style={{
            backgroundColor: `${teamColor}18`,
            borderColor: `${teamColor}60`,
            color: teamColor,
            boxShadow: `0 0 8px ${teamColor}20`,
          }}
          className="inline-flex items-center justify-center rounded-full border px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-extrabold min-w-[62px] transition-all"
        >
          {text}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center justify-center rounded-full bg-muted/60 border border-border/40 px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-xs font-medium text-muted-foreground min-w-[62px]">
        {text}
      </span>
    );
  };

  const renderQualification2Lines = (qual: QualificationStatus) => (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      <span className="font-bold text-[10.5px] md:text-xs text-foreground">{qual.rankLabel}</span>
      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.2 md:py-0.5 text-[8.5px] md:text-[9.5px] font-bold border shadow-2xs ${qual.isQualified ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
        {qual.stageLabel}
      </span>
    </div>
  );

  const renderForm8Slots = (formList: ("W" | "L")[]) => {
    const slots = Array.from({ length: 8 }, (_, i) => formList[i] || null);

    return (
      <div className="grid grid-cols-4 gap-1 md:gap-1.5 w-fit mx-auto justify-items-center">
        {slots.map((res, i) => res ? (
          <span key={i} className={`inline-flex h-4 w-4 md:h-4.5 md:w-4.5 items-center justify-center rounded font-black text-[7.5px] md:text-[8.5px] shadow-2xs ${res === "W" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"}`}>
            {res}
          </span>
        ) : (
          <span key={i} className="inline-flex h-4 w-4 md:h-4.5 md:w-4.5 items-center justify-center rounded bg-muted/40 border border-border/30 text-[7.5px] md:text-[8px] text-muted-foreground/40 font-bold">-</span>
        ))}
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
        className={`flex items-center justify-center gap-2 hover:opacity-80 transition max-w-full ${isA ? "flex-row" : "flex-row-reverse"} ${item.reportLink ? "cursor-pointer group" : "cursor-default"}`}
      >
        <img src={item.oppLogo} alt="" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 object-contain shrink-0 rounded-lg bg-background/50 border border-border/50 p-0.5" />
        <div className={`flex flex-col gap-0.5 min-w-0 ${isA ? "items-start text-left" : "items-end text-right"}`}>
          <span className={`rounded px-1.5 py-0.2 font-black text-[7.5px] md:text-[8.5px] shrink-0 ${item.isWin ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>
            {item.isWin ? "Win" : "Lose"} {item.myScore}-{item.oppScore}
          </span>
          <div className={`flex items-center gap-1 min-w-0 ${!isA && "flex-row-reverse"}`}>
            <span className="font-semibold text-foreground text-[8.5px] sm:text-[9.5px] md:text-[10.5px] truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px] group-hover:underline">
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div ref={modalContentRef} className="relative flex max-h-[95vh] w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="relative border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5 md:py-3 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-0.5 text-[9.5px] md:text-xs font-bold text-primary">
              <Swords className="h-3 w-3 md:h-3.5 md:w-3.5" /> Week {match.weekNumber || currentWeek} • {match.groupName || "Group Stage"}
            </span>
            <p className="text-[10.5px] md:text-[11.5px] text-muted-foreground font-medium">{formatDateTimeWIB(match.matchDate, { includeDay: true })}</p>
          </div>
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer">
            <X className="h-4 w-4 md:h-4.5 md:w-4.5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-4 md:p-5 space-y-3 text-xs md:text-sm">
          
          {/* TEAMS DISPLAY (DINAMIS VS ATAU SKOR AKHIR) */}
          <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 sm:p-3.5 border border-border">
            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-9 w-9 sm:h-11 sm:w-11 object-contain" />
              <span className={`text-[11px] sm:text-xs md:text-sm font-bold truncate w-full ${isWinnerA ? "font-black" : ""}`} style={{ color: colorA }}>
                {match.teamAName}
              </span>
            </div>

            {/* CENTER: JIKA SUDAH SELESAI TAMPILKAN SKOR NYATA, JIKA BELUM TAMPILKAN 'VS' */}
            {isMatchFinished ? (
              <div className="flex flex-col items-center px-3 sm:px-4">
                <div className="flex items-center gap-2 text-base sm:text-lg md:text-xl font-black">
                  <span style={{ color: isWinnerA ? colorA : undefined }} className={!isWinnerA ? "text-muted-foreground" : ""}>
                    {actualScoreA}
                  </span>
                  <span className="text-muted-foreground/50 text-sm md:text-base">-</span>
                  <span style={{ color: isWinnerB ? colorB : undefined }} className={!isWinnerB ? "text-muted-foreground" : ""}>
                    {actualScoreB}
                  </span>
                </div>
                <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[8px] md:text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider mt-0.5">
                  Final Score
                </span>
              </div>
            ) : (
              <span className="px-3 text-xs sm:text-sm font-black text-muted-foreground">VS</span>
            )}

            <div className="flex flex-col items-center flex-1 min-w-0 text-center gap-1">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-9 w-9 sm:h-11 sm:w-11 object-contain" />
              <span className={`text-[11px] sm:text-xs md:text-sm font-bold truncate w-full ${isWinnerB ? "font-black" : ""}`} style={{ color: colorB }}>
                {match.teamBName}
              </span>
            </div>
          </div>

          {/* BANNER HASIL / PREDIKSI */}
          {isMatchFinished ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-[10.5px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                <span>Pertandingan Selesai • Pemenang: <strong>{isWinnerA ? match.teamAName : isWinnerB ? match.teamBName : "Draw"}</strong></span>
              </div>

              {reportUrl && (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 dark:bg-emerald-500 px-2 py-1 text-[9px] md:text-[10.5px] font-bold text-white shadow-xs hover:opacity-90 transition shrink-0"
                >
                  <ImageIcon className="h-3 w-3" /> Bukti Report ↗
                </a>
              )}
            </div>
          ) : (
            /* PREDICTION BAR HANYA MUNCUL JIKA MATCH BELUM SELESAI */
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 sm:p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] md:text-xs font-bold">
                <span className="text-primary flex items-center gap-1"><Sparkles className="h-3 w-3" /> Prediksi Match</span>
                <span className="text-muted-foreground">Peluang Menang</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                <div style={{ width: `${pred.probA}%`, backgroundColor: colorA }} className="h-full transition-all duration-300" />
                <div style={{ width: `${pred.probB}%`, backgroundColor: colorB }} className="h-full transition-all duration-300" />
              </div>
              <div className="flex items-center justify-between text-[10.5px] md:text-xs font-medium">
                <span className="font-bold" style={{ color: colorA }}>{pred.probA}%</span>
                <span style={{ backgroundColor: pred.probA >= pred.probB ? colorA : colorB }} className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-xs">
                  Prediksi Skor: {pred.predScoreA} - {pred.predScoreB}
                </span>
                <span className="font-bold" style={{ color: colorB }}>{pred.probB}%</span>
              </div>
            </div>
          )}

          {/* STATS MATRIX */}
          <div className="space-y-1">
            <span className="text-[9.5px] md:text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Trophy className="h-3 w-3 text-primary" /> Perbandingan Statistik Season 7
            </span>

            <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
              
              {/* STATUS KLASEMEN 2 BARIS (CENTER ALIGNED) */}
              <div className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-2">
                <div className="flex justify-center">{renderQualification2Lines(statsA.qualification)}</div>
                <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">Status Klasemen</span>
                <div className="flex justify-center">{renderQualification2Lines(statsB.qualification)}</div>
              </div>

              {/* FORM LAGA (CENTER ALIGNED) */}
              <div className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                <div className="flex justify-center">{renderForm8Slots(statsA.form)}</div>
                <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">Form Laga</span>
                <div className="flex justify-center">{renderForm8Slots(statsB.form)}</div>
              </div>

              {/* METRICS LOOP (CENTER ALIGNED) */}
              {metrics.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                  <div className="flex justify-center">{renderPill(m.valA, m.valB, true, m.txtA)}</div>
                  <span className="text-muted-foreground text-[9px] md:text-[10.5px] font-semibold text-center px-1">{m.label}</span>
                  <div className="flex justify-center">{renderPill(m.valA, m.valB, false, m.txtB)}</div>
                </div>
              ))}

              {/* REPORT WEEK (CENTER ALIGNED) */}
              {pastWeeks.map((week) => (
                <div key={week} className="grid grid-cols-[1fr_130px_1fr] md:grid-cols-[1fr_150px_1fr] items-center px-3 py-1.5">
                  <div className="flex justify-center min-w-0">{renderReportItem(historyA.get(week), true)}</div>
                  <span className="text-muted-foreground text-[8.5px] md:text-[10px] font-semibold text-center px-1 whitespace-nowrap">Report Week {week}</span>
                  <div className="flex justify-center min-w-0">{renderReportItem(historyB.get(week), false)}</div>
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