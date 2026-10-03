"use client";

import { MatchScheduleItem, formatMatchWIB } from "@/app/tournament/_library";
import { Radio, Tv } from "lucide-react";

interface MatchCardItemProps {
  match: MatchScheduleItem;
  variant: "LIVE" | "TODAY" | "UPCOMING" | "RESULT";
  currentWeek: number;
  onClick: () => void;
}

export function MatchCardItem({ match, variant, currentWeek, onClick }: MatchCardItemProps) {
  const isLive = variant === "LIVE";
  const isResult = variant === "RESULT";
  const isToday = variant === "TODAY";

  const scoreA = Number(match.scoreA) || 0;
  const scoreB = Number(match.scoreB) || 0;
  const isWinA = isResult && scoreA > scoreB;
  const isWinB = isResult && scoreB > scoreA;

  const stageLabel = match.groupName || (match as any).stage || (match as any).matchTitle || "";
  const weekLabel = `Week ${match.weekNumber || currentWeek}`;

  const handleCardClick = () => {
    if (isLive && match.streamLink) {
      window.open(match.streamLink, "_blank", "noopener,noreferrer");
    } else {
      onClick();
    }
  };

  const containerStyle = isLive
    ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/70"
    : isToday
    ? "border-primary/30 bg-primary/5 hover:border-primary/60"
    : isResult
    ? "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
    : "border-border/80 bg-muted/20 hover:bg-muted/30 hover:border-primary/40";

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer rounded-2xl border p-3 sm:p-3.5 space-y-2.5 transition text-xs md:text-sm ${containerStyle}`}
    >
      {/* GRID SIMETRIS 3 KOLOM */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* TEAM A (KIRI) */}
        <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border/70 overflow-hidden bg-muted/40 p-0.5 shadow-2xs shrink-0 flex items-center justify-center">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-full w-full object-contain rounded-full"
            />
          </div>
          <span
            className={`font-bold text-[11px] sm:text-xs leading-tight line-clamp-2 break-words w-full ${
              isResult ? (isWinA ? "text-foreground font-black" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamAName}
          </span>
        </div>

        {/* MIDDLE SECTION (TENGAH) */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 md:px-2.5 md:py-1 text-[8.5px] md:text-[10px] font-black text-white uppercase tracking-wider shadow-xs animate-pulse">
              <Radio className="h-2.5 w-2.5 md:h-3 md:w-3" /> LIVE
            </span>
          ) : isResult ? (
            <div className="flex items-center gap-1.5 font-black text-sm sm:text-base md:text-lg">
              <span className={isWinA ? "text-emerald-500" : "text-muted-foreground"}>{scoreA}</span>
              <span className="text-muted-foreground/40 font-normal">-</span>
              <span className={isWinB ? "text-emerald-500" : "text-muted-foreground"}>{scoreB}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-black text-muted-foreground tracking-wider">VS</span>
              <span className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {formatMatchWIB(match.matchDate)}
              </span>
            </div>
          )}
        </div>

        {/* TEAM B (KANAN) */}
        <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border/70 overflow-hidden bg-muted/40 p-0.5 shadow-2xs shrink-0 flex items-center justify-center">
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-full w-full object-contain rounded-full"
            />
          </div>
          <span
            className={`font-bold text-[11px] sm:text-xs leading-tight line-clamp-2 break-words w-full ${
              isResult ? (isWinB ? "text-foreground font-black" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamBName}
          </span>
        </div>
      </div>

      {/* FOOTER: INFO STREAMER, FASE, DAN PEKAN */}
      {!isResult && (
        <div
          className={`grid grid-cols-[1fr_auto_1fr] items-center border-t pt-1.5 text-[9px] sm:text-[10px] md:text-xs gap-1 ${
            isLive ? "border-rose-500/20 text-rose-600 dark:text-rose-400" : "border-border/40 text-muted-foreground"
          }`}
        >
          {/* KIRI: STREAMER */}
          <span className="truncate flex items-center gap-1 font-medium min-w-0">
            <Tv className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
            <span className="truncate">
              {match.streamer ? `Streamer : ${match.streamer}` : "Butuh Streamer"}
            </span>
          </span>

          {/* TENGAH: FASE */}
          <span className="font-bold text-center px-1 truncate max-w-[130px] sm:max-w-[160px] text-foreground/90">
            {stageLabel}
          </span>

          {/* KANAN: PEKAN */}
          <span className="font-semibold text-right truncate">
            {weekLabel}
          </span>
        </div>
      )}
    </div>
  );
}
