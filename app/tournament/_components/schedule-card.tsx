"use client";

import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { Radio, Tv, ExternalLink } from "lucide-react";

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
  const gName = (match.groupName || "").toLowerCase().trim();
  const cleanA = groupAName.toLowerCase().trim();

  // Pencocokan eksklusif grup A vs grup B
  const isGroupA =
    gName === "group a" ||
    gName === "divisi a" ||
    gName === cleanA ||
    gName.includes(cleanA);

  // Bersihkan teks awalan "Div." atau "Divisi" agar tampilan badge ringkas
  const rawGroupName = isGroupA ? groupAName : groupBName;
  const groupDisplayName = rawGroupName.replace(/^Div(isi|\.)\s*/i, "").toUpperCase();

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

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl border bg-card p-3 sm:p-4 shadow-xs transition duration-200 hover:shadow-md cursor-pointer space-y-2 relative active:scale-[0.99] ${
        isGroupA
          ? "border-sky-500/30 hover:border-sky-500/60"
          : "border-amber-500/30 hover:border-amber-500/60"
      }`}
    >
      {/* 1. HEADER (BADGE DIVISI BERSIH TANPA 'DIV.' & TANGGAL JADWAL) */}
      <div className="flex items-center justify-between text-[10px] md:text-xs">
        <span
          className={`font-black uppercase tracking-wider text-[9px] md:text-[10px] px-2 py-0.5 rounded-md truncate max-w-[170px] sm:max-w-[220px] ${
            isGroupA
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          {groupDisplayName}
        </span>
        <span className="text-muted-foreground font-semibold text-[9.5px] md:text-xs shrink-0">
          {formatMatchDate(match.matchDate)}
        </span>
      </div>

      {/* 2. MATCH & SCORE */}
      <div className="flex items-center justify-between py-1 md:py-2">
        {/* TEAM A */}
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 object-contain"
          />
          <span
            className={`truncate text-xs sm:text-sm md:text-base ${
              isPlayed
                ? isWinA
                  ? "font-black text-foreground"
                  : "font-normal text-muted-foreground"
                : "font-bold text-foreground"
            }`}
          >
            {match.teamAName}
          </span>
        </div>

        {/* SCORE CENTER */}
        <div className="flex flex-col items-center px-3 md:px-4 shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 md:px-2.5 md:py-1 text-[8.5px] md:text-[10px] font-black text-white uppercase tracking-wider animate-pulse shadow-xs">
              <Radio className="h-2.5 w-2.5 md:h-3 md:w-3" /> LIVE
            </span>
          ) : isPlayed ? (
            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm md:text-base">
              <span className={isWinA ? "text-emerald-500 font-black" : "text-muted-foreground"}>
                {scoreA}
              </span>
              <span className="text-muted-foreground/40">-</span>
              <span className={isWinB ? "text-emerald-500 font-black" : "text-muted-foreground"}>
                {scoreB}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="rounded bg-muted px-2 py-0.5 text-[9px] md:text-xs font-black text-muted-foreground">
                VS
              </span>
              <span className="text-[8.5px] md:text-[10.5px] font-semibold text-muted-foreground mt-0.5">
                {formatMatchTimeOnly(match.matchDate)}
              </span>
            </div>
          )}
        </div>

        {/* TEAM B */}
        <div className="flex items-center justify-end gap-2 md:gap-2.5 min-w-0 flex-1 text-right">
          <span
            className={`truncate text-xs sm:text-sm md:text-base ${
              isPlayed
                ? isWinB
                  ? "font-black text-foreground"
                  : "font-normal text-muted-foreground"
                : "font-bold text-foreground"
            }`}
          >
            {match.teamBName}
          </span>
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 shrink-0 object-contain"
          />
        </div>
      </div>

      {/* 3. FOOTER */}
      <div className="flex items-center justify-between border-t border-border/40 pt-1.5 md:pt-2 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
        <span className="truncate flex items-center gap-1 font-medium">
          {match.streamer ? (
            <>
              <Tv className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary shrink-0" />
              <span className="truncate">Streamer: {match.streamer}</span>
            </>
          ) : (
            <span>🎙️ Official Match</span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {reportUrl && (
            <span className="inline-flex items-center gap-0.5 font-bold text-primary hover:underline text-[9.5px] md:text-[10.5px]">
              Bukti <ExternalLink className="h-3 w-3" />
            </span>
          )}

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
    </div>
  );
      }    
