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

  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const isWinA = isResult && scoreA > scoreB;
  const isWinB = isResult && scoreB > scoreA;

  const containerStyle = isLive
    ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
    : isToday
    ? "border-primary/25 bg-primary/5 hover:border-primary/50"
    : isResult
    ? "border-border bg-muted/20 hover:border-primary/30"
    : "border-border bg-muted/20 hover:bg-muted/30 hover:border-primary/30";

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-2 space-y-1 transition text-[10.5px] ${containerStyle}`}
    >
      <div className="flex items-center justify-between">
        {/* TEAM A */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-3.5 w-3.5 shrink-0 object-contain"
          />
          <span
            className={`truncate font-semibold ${
              isResult ? (isWinA ? "text-foreground font-bold" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamAName}
          </span>
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex flex-col items-center px-1.5 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[8.5px] font-black text-white uppercase tracking-wider shadow-xs animate-pulse">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </span>
          ) : isResult ? (
            <div className="flex items-center gap-1.5 font-bold">
              <span className={isWinA ? "text-emerald-500" : "text-muted-foreground"}>{scoreA}</span>
              <span className="text-muted-foreground/50">-</span>
              <span className={isWinB ? "text-emerald-500" : "text-muted-foreground"}>{scoreB}</span>
            </div>
          ) : (
            <>
              <span className="text-[9px] font-bold text-muted-foreground">VS</span>
              <span className={`text-[8.5px] font-medium ${isToday ? "text-primary" : "text-muted-foreground mt-0.5"}`}>
                {formatMatchWIB(match.matchDate)}
              </span>
            </>
          )}
        </div>

        {/* TEAM B */}
        <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
          <span
            className={`truncate font-semibold ${
              isResult ? (isWinB ? "text-foreground font-bold" : "text-muted-foreground") : "text-foreground"
            }`}
          >
            {match.teamBName}
          </span>
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-3.5 w-3.5 shrink-0 object-contain"
          />
        </div>
      </div>

      {/* FOOTER */}
      {!isResult && (
        <div
          className={`flex items-center justify-between border-t pt-0.5 text-[8.5px] ${
            isLive ? "border-rose-500/20 text-rose-500/90" : "border-border/30 text-muted-foreground"
          }`}
        >
          <span className="truncate flex items-center gap-1">
            {isLive ? (
              <>
                <Tv className="h-3 w-3" /> {match.streamer ? `Streamer: ${match.streamer}` : "Official Live"}
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
              className="rounded-md bg-rose-500 px-2 py-0.5 font-bold text-white text-[8.5px] hover:bg-rose-600 transition"
            >
              Live ↗
            </a>
          ) : (
            <span>{isToday ? "Hari Ini" : `Week ${match.weekNumber || currentWeek}`}</span>
          )}
        </div>
      )}
    </div>
  );
}