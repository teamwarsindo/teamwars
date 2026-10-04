"use client";

import { useState } from "react";
import Image from "next/image";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { Radio, Tv, ExternalLink, Shield } from "lucide-react";

export interface MatchCardItemProps {
  match: MatchScheduleItem;
  variant?: "LIVE" | "TODAY" | "UPCOMING" | "RESULT";
  groupAName?: string;
  groupBName?: string;
  onClick?: () => void;
  onSelect?: (match: MatchScheduleItem) => void;
}

function formatMatchDayDate(dateStr?: string) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });
    const dayDate = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    return `${dayName}, ${dayDate}`;
  } catch {
    return dateStr;
  }
}

function formatMatchTimeOnly(dateStr?: string) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return (
      d
        .toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        })
        .replace(":", ".") + " WIB"
    );
  } catch {
    return dateStr;
  }
}

export function MatchCardItem({
  match,
  variant,
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
  onClick,
  onSelect,
}: MatchCardItemProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const gName = (match.groupName || "").toLowerCase().trim();
  const cleanA = groupAName.toLowerCase().trim();
  const cleanB = groupBName.toLowerCase().trim();

  const isPlayoff =
    match.id.startsWith("match-po-") ||
    (Boolean(match.stage) && match.stage !== "GROUP_STAGE") ||
    gName.includes("play-in") ||
    gName.includes("quarter") ||
    gName.includes("semi") ||
    gName.includes("grand") ||
    gName.includes("final");

  const isGroupA =
    !isPlayoff &&
    (gName === "group a" || gName === "divisi a" || gName === cleanA || gName.includes(cleanA));

  const isGroupB =
    !isPlayoff &&
    (gName === "group b" || gName === "divisi b" || gName === cleanB || gName.includes(cleanB));

  let stageLabel = match.groupName || "PLAYOFF";
  if (isGroupA) {
    stageLabel = groupAName.replace(/^Div(isi|\.)\s*/i, "").trim();
  } else if (isGroupB) {
    stageLabel = groupBName.replace(/^Div(isi|\.)\s*/i, "").trim();
  } else {
    stageLabel = match.groupName || "Playoff Stage";
  }

  const scoreA = Number(match.scoreA) || 0;
  const scoreB = Number(match.scoreB) || 0;

  const isFinishedMatch = Boolean(match.isFinished) || scoreA >= 10 || scoreB >= 10;
  const isLive =
    variant === "LIVE" || (!isFinishedMatch && (scoreA > 0 || scoreB > 0 || Boolean(match.streamLink)));
  const isPlayed = variant === "RESULT" || isFinishedMatch || scoreA + scoreB > 0;

  const isWinA = isFinishedMatch && scoreA > scoreB;
  const isWinB = isFinishedMatch && scoreB > scoreA;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onSelect) {
      onSelect(match);
    }
  };

  const cardContainerClass = isLive
    ? "bg-rose-500/5 dark:bg-rose-950/25 border-rose-300 dark:border-rose-900/60 shadow-xs"
    : isPlayoff
    ? "bg-card border-emerald-500/30 hover:border-emerald-500/60"
    : isGroupA
    ? "bg-card border-sky-500/30 hover:border-sky-500/60"
    : "bg-card border-amber-500/30 hover:border-amber-500/60";

  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer rounded-2xl border p-3 sm:p-3.5 space-y-2.5 transition text-xs md:text-sm hover:shadow-md active:scale-[0.99] ${cardContainerClass}`}
    >
      {/* GRID SIMETRIS 3 KOLOM */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 pt-1">
        {/* TEAM A */}
        <div className="flex flex-col items-center justify-center text-center min-w-0">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center mb-1.5 shrink-0 shadow-xs">
            {match.teamALogo && !logoErrA ? (
              <Image
                src={match.teamALogo}
                alt={match.teamAName || "Team A"}
                fill
                sizes="48px"
                className="object-cover rounded-full"
                onError={() => setLogoErrA(true)}
                unoptimized
              />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>
          <span
            className={`line-clamp-2 leading-tight break-words text-[10.5px] sm:text-xs font-black text-center w-full px-1 ${
              isPlayed
                ? isWinA
                  ? "text-primary"
                  : "text-foreground/80 font-semibold"
                : "text-foreground"
            }`}
            title={match.teamAName}
          >
            {match.teamAName}
          </span>
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0 min-w-[84px] sm:min-w-[104px] text-center">
          {isLive ? (
            <div className="flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider animate-pulse">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-2xl sm:text-3xl font-black leading-none mt-0.5">
                <span className={scoreA > scoreB ? "text-primary" : "text-foreground"}>{scoreA}</span>
                <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl font-normal">—</span>
                <span className={scoreB > scoreA ? "text-primary" : "text-foreground"}>{scoreB}</span>
              </div>
            </div>
          ) : isPlayed ? (
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-2xl sm:text-3xl font-black leading-none">
              <span className={isWinA ? "text-primary" : "text-foreground/90"}>{scoreA}</span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl font-normal">—</span>
              <span className={isWinB ? "text-primary" : "text-foreground/90"}>{scoreB}</span>
            </div>
          ) : (
            <span className="rounded bg-muted px-2.5 py-0.5 text-[10px] font-black text-muted-foreground tracking-wider">
              VS
            </span>
          )}

          <div className="mt-1.5 flex flex-col items-center text-center space-y-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground leading-tight whitespace-nowrap">
              {formatMatchDayDate(match.matchDate)}
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] font-semibold text-muted-foreground/80 leading-tight whitespace-nowrap">
              {formatMatchTimeOnly(match.matchDate)}
            </span>
          </div>
        </div>

        {/* TEAM B */}
        <div className="flex flex-col items-center justify-center text-center min-w-0">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center mb-1.5 shrink-0 shadow-xs">
            {match.teamBLogo && !logoErrB ? (
              <Image
                src={match.teamBLogo}
                alt={match.teamBName || "Team B"}
                fill
                sizes="48px"
                className="object-cover rounded-full"
                onError={() => setLogoErrB(true)}
                unoptimized
              />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>
          <span
            className={`line-clamp-2 leading-tight break-words text-[10.5px] sm:text-xs font-black text-center w-full px-1 ${
              isPlayed
                ? isWinB
                  ? "text-primary"
                  : "text-foreground/80 font-semibold"
                : "text-foreground"
            }`}
            title={match.teamBName}
          >
            {match.teamBName}
          </span>
        </div>
      </div>

      {/* FOOTER */}
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center border-t pt-2 text-[9px] sm:text-[10px] md:text-xs gap-2 ${
        isLive ? "border-rose-300/40 dark:border-rose-900/40" : "border-border/40 text-muted-foreground"
      }`}>
        <span className={`truncate flex items-center gap-1 font-medium text-left ${
          isLive ? "text-rose-500/90 font-semibold" : "text-muted-foreground"
        }`}>
          {match.streamer ? (
            <>
              <Tv className={`h-3 w-3 md:h-3.5 md:w-3.5 shrink-0 ${isLive ? "text-rose-500" : "text-primary"}`} />
              <span className="truncate">Streamer: {match.streamer}</span>
            </>
          ) : (
            <span className="truncate">🎙 Official Match</span>
          )}
        </span>

        {/* TOMBOL MERAH PILL LIVE vs TOMBOL BIRU RECORD */}
        <div className="flex items-center justify-center shrink-0">
          {match.streamLink ? (
            <a
              href={match.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1 font-black transition px-3 py-1 text-[9px] sm:text-[10px] uppercase tracking-wider ${
                isLive
                  ? "rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-xs border border-rose-500 animate-pulse"
                  : "rounded-lg text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30"
              }`}
            >
              {isLive ? (
                <>
                  <span>Live</span>
                  <ExternalLink className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>Record</span>
                  <ExternalLink className="h-3 w-3" />
                </>
              )}
            </a>
          ) : null}
        </div>

        <span className={`font-bold text-right truncate ${
          isLive ? "text-rose-500/90" : "text-foreground/80"
        }`}>
          {stageLabel}
        </span>
      </div>
    </div>
  );
}

export default MatchCardItem;
