"use client";

import { MatchScheduleItem } from "@/app/tournament/_library";
import { Radio, Tv, ExternalLink } from "lucide-react";

interface ScheduleCardProps {
  match: MatchScheduleItem;
  groupAName: string;
  groupBName: string;
  onSelect: (match: MatchScheduleItem) => void;
}

function formatMatchDate(dateStr?: string) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });
    const dayDate = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(".", ":");
    return `${dayName}, ${dayDate} • ${time} WIB`;
  } catch {
    return dateStr;
  }
}

function formatMatchTimeOnly(dateStr?: string) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(".", ":") + " WIB";
  } catch {
    return dateStr;
  }
}

export function ScheduleCard({ match, groupAName, groupBName, onSelect }: ScheduleCardProps) {
  const isGroupA = match.groupName === "Group A" || match.groupName === groupAName;
  const groupDisplayName = isGroupA ? `Div. ${groupAName}` : `Div. ${groupBName}`;
  const isLive = Boolean(match.streamLink) && !match.isFinished;
  const isPlayed = match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0;

  const isWinA = match.isFinished && (match.scoreA || 0) > (match.scoreB || 0);
  const isWinB = match.isFinished && (match.scoreB || 0) > (match.scoreA || 0);

  return (
    <div
      onClick={() => onSelect(match)}
      className={`rounded-2xl border bg-card p-3 sm:p-3.5 shadow-xs transition hover:shadow-sm cursor-pointer space-y-2 relative ${
        isGroupA
          ? "border-sky-500/30 hover:border-sky-500/60"
          : "border-amber-500/30 hover:border-amber-500/60"
      }`}
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between text-[10px]">
        <span
          className={`font-bold uppercase tracking-wider text-[9.5px] px-1.5 py-0.5 rounded-md ${
            isGroupA
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {groupDisplayName}
        </span>
        <span className="text-muted-foreground font-medium text-[9.5px]">
          {formatMatchDate(match.matchDate)}
        </span>
      </div>

      {/* 2. MATCH & SCORE */}
      <div className="flex items-center justify-between py-1">
        {/* TEAM A */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 shrink-0 object-contain"
          />
          <span
            className={`truncate text-[11px] ${
              isPlayed
                ? isWinA
                  ? "font-bold text-foreground"
                  : "font-normal text-muted-foreground"
                : "font-semibold text-foreground"
            }`}
          >
            {match.teamAName}
          </span>
        </div>

        {/* SCORE CENTER */}
        <div className="flex flex-col items-center px-3 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[8.5px] font-black text-white uppercase tracking-wider animate-pulse shadow-xs">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </span>
          ) : isPlayed ? (
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className={isWinA ? "text-emerald-500 font-black" : "text-muted-foreground"}>
                {match.scoreA || 0}
              </span>
              <span className="text-muted-foreground/40">-</span>
              <span className={isWinB ? "text-emerald-500 font-black" : "text-muted-foreground"}>
                {match.scoreB || 0}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[8.5px] font-bold text-muted-foreground">
                VS
              </span>
              <span className="text-[8px] font-medium text-muted-foreground mt-0.5">
                {formatMatchTimeOnly(match.matchDate)}
              </span>
            </div>
          )}
        </div>

        {/* TEAM B */}
        <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
          <span
            className={`truncate text-[11px] ${
              isPlayed
                ? isWinB
                  ? "font-bold text-foreground"
                  : "font-normal text-muted-foreground"
                : "font-semibold text-foreground"
            }`}
          >
            {match.teamBName}
          </span>
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 shrink-0 object-contain"
          />
        </div>
      </div>

      {/* 3. FOOTER */}
      <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[9px] text-muted-foreground">
        <span className="truncate flex items-center gap-1">
          {match.streamer ? (
            <>
              <Tv className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">Streamer: {match.streamer}</span>
            </>
          ) : (
            <span>🎙️ Official Match</span>
          )}
        </span>

        {match.streamLink && (
          <a
            href={match.streamLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 font-bold text-rose-500 hover:text-rose-600 transition"
          >
            Live <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
                                                }
        
