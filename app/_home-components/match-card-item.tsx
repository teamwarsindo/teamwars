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

  const containerStyle = isLive
    ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/70"
    : isToday
    ? "border-primary/30 bg-primary/5 hover:border-primary/60"
    : isResult
    ? "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
    : "border-border/80 bg-muted/20 hover:bg-muted/30 hover:border-primary/40";

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-2.5 sm:p-3 md:p-3.5 space-y-1.5 md:space-y-2 transition text-xs md:text-sm ${containerStyle}`}
    >
      <div className="flex items-center justify-between">
        {/* TEAM A */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 shrink-0 object-contain"
          />
          <span
            className={`truncate font-bold text-[11px] sm:text-xs md:text-sm ${
              isResult ? (isWinA ? "text-foreground font-black" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamAName}
          </span>
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex flex-col items-center px-2 md:px-3 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 md:px-2.5 md:py-1 text-[8.5px] md:text-[10px] font-black text-white uppercase tracking-wider shadow-xs animate-pulse">
              <Radio className="h-2.5 w-2.5 md:h-3 md:w-3" /> LIVE
            </span>
          ) : isResult ? (
            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm md:text-base">
              <span className={isWinA ? "text-emerald-500" : "text-muted-foreground"}>{scoreA}</span>
              <span className="text-muted-foreground/50">-</span>
              <span className={isWinB ? "text-emerald-500" : "text-muted-foreground"}>{scoreB}</span>
            </div>
          ) : (
            <>
              <span className="text-[9px] md:text-xs font-black text-muted-foreground">VS</span>
              <span className={`text-[8.5px] md:text-[10.5px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground mt-0.5"}`}>
                {formatMatchWIB(match.matchDate)}
              </span>
            </>
          )}
        </div>

        {/* TEAM B */}
        <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
          <span
            className={`truncate font-bold text-[11px] sm:text-xs md:text-sm ${
              isResult ? (isWinB ? "text-foreground font-black" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamBName}
          </span>
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 shrink-0 object-contain"
          />
        </div>
      </div>

      {/* FOOTER */}
      {!isResult && (
        <div
          className={`flex items-center justify-between border-t pt-1 md:pt-1.5 text-[9px] sm:text-[10px] md:text-xs ${
            isLive ? "border-rose-500/20 text-rose-500/90" : "border-border/40 text-muted-foreground"
          }`}
        >
          <span className="truncate flex items-center gap-1 font-medium">
            {isLive ? (
              <>
                <Tv className="h-3 w-3 md:h-3.5 md:w-3.5" /> {match.streamer ? `Streamer: ${match.streamer}` : "Official Live"}
              </>
            ) : (
              match.streamer ? `🎙️ ${match.streamer}` : "📺 Butuh Streamer"
            )}
          </span>

          {isLive && match.streamLink ? (
            <a
              href={match.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-md bg-rose-500 px-2 py-0.5 md:px-2.5 md:py-1 font-black text-white text-[8.5px] md:text-[10px] hover:bg-rose-600 transition"
            >
              Live ↗
            </a>
          ) : (
            <span className="font-semibold">{isToday ? "Hari Ini" : `Week ${match.weekNumber || currentWeek}`}</span>
          )}
        </div>
      )}
    </div>
  );
}