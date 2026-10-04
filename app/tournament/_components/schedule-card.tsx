"use client";

import { useState } from "react";
import Image from "next/image";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { Radio, Tv, ExternalLink, Shield } from "lucide-react";

export interface ScheduleCardProps {
  match: MatchScheduleItem;
  groupAName?: string;
  groupBName?: string;
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

export function ScheduleCard({
  match,
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
  onSelect,
}: ScheduleCardProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const gName = (match.groupName || "").toLowerCase().trim();
  const cleanA = groupAName.toLowerCase().trim();
  const cleanB = groupBName.toLowerCase().trim();

  // 1. Deteksi apakah laga ini Playoff
  const isPlayoff =
    match.id.startsWith("match-po-") ||
    (Boolean(match.stage) && match.stage !== "GROUP_STAGE") ||
    gName.includes("play-in") ||
    gName.includes("quarter") ||
    gName.includes("semi") ||
    gName.includes("grand") ||
    gName.includes("final");

  // 2. Deteksi grup babak reguler
  const isGroupA =
    !isPlayoff &&
    (gName === "group a" || gName === "divisi a" || gName === cleanA || gName.includes(cleanA));

  const isGroupB =
    !isPlayoff &&
    (gName === "group b" || gName === "divisi b" || gName === cleanB || gName.includes(cleanB));

  // 3. Tentukan nama label badge
  let groupDisplayName = match.groupName || "PLAYOFF";
  if (isGroupA) {
    groupDisplayName = groupAName.replace(/^Div(isi|\.)\s*/i, "").toUpperCase();
  } else if (isGroupB) {
    groupDisplayName = groupBName.replace(/^Div(isi|\.)\s*/i, "").toUpperCase();
  } else {
    groupDisplayName = (match.groupName || "PLAYOFF ROUND").toUpperCase();
  }

  const isLive = Boolean(match.streamLink) && !match.isFinished;
  const isPlayed = Boolean(match.isFinished) || (Number(match.scoreA) || 0) + (Number(match.scoreB) || 0) > 0;

  const scoreA = Number(match.scoreA) || 0;
  const scoreB = Number(match.scoreB) || 0;
  const isWinA = match.isFinished && scoreA > scoreB;
  const isWinB = match.isFinished && scoreB > scoreA;

  const reportUrl = match.maskedImageUrl || match.reportImageUrl;

  const handleCardClick = () => {
    if (reportUrl) {
      window.open(reportUrl, "_blank", "noopener,noreferrer");
    } else {
      onSelect(match);
    }
  };

  // Skema warna kartu dan badge
  const cardBorderClass = isPlayoff
    ? "border-emerald-500/30 hover:border-emerald-500/60"
    : isGroupA
    ? "border-sky-500/30 hover:border-sky-500/60"
    : "border-amber-500/30 hover:border-amber-500/60";

  const badgeThemeClass = isPlayoff
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : isGroupA
    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20"
    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl border bg-card p-3 sm:p-4 shadow-xs transition duration-200 hover:shadow-md cursor-pointer space-y-3 relative active:scale-[0.99] ${cardBorderClass}`}
    >
      {/* 1. HEADER (BADGE KATEGORI & JADWAL) */}
      <div className="flex items-center justify-between text-[10px] md:text-xs">
        <span
          className={`font-black uppercase tracking-wider text-[9px] md:text-[10px] px-2 py-0.5 rounded-md truncate max-w-[170px] sm:max-w-[220px] border ${badgeThemeClass}`}
        >
          {groupDisplayName}
        </span>
        <span className="text-muted-foreground font-semibold text-[9.5px] md:text-xs shrink-0">
          {formatMatchDate(match.matchDate)}
        </span>
      </div>

      {/* 2. MATCH & SCOREBOARD (GRID 3 KOLOM RESMI TWI) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 py-1">
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

        {/* CENTER COLUMN (SKOR / VS) */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0 min-w-[70px] sm:min-w-[84px] text-center">
          {isLive ? (
            <div className="flex flex-col items-center gap-1">
              <span className="flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black text-white uppercase tracking-wider animate-pulse shadow-xs">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
              <div className="flex items-center justify-center gap-1 font-mono text-xl sm:text-2xl font-black leading-none">
                <span>{scoreA}</span>
                <span className="text-muted-foreground/30 font-sans text-base sm:text-lg">—</span>
                <span>{scoreB}</span>
              </div>
            </div>
          ) : isPlayed ? (
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-2xl sm:text-3xl font-black leading-none">
              <span className={isWinA ? "text-primary" : "text-foreground/90"}>
                {scoreA}
              </span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl font-normal">
                —
              </span>
              <span className={isWinB ? "text-primary" : "text-foreground/90"}>
                {scoreB}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="rounded bg-muted px-2.5 py-0.5 text-[10px] font-black text-muted-foreground tracking-wider">
                VS
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground mt-1">
                {formatMatchTimeOnly(match.matchDate)}
              </span>
            </div>
          )}
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

      {/* 3. FOOTER */}
      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
        <span className="truncate flex items-center gap-1 font-medium">
          {match.streamer ? (
            <>
              <Tv className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary shrink-0" />
              <span className="truncate">Streamer: {match.streamer}</span>
            </>
          ) : (
            <span>🎙️️ Official Match</span>
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
            Live <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
