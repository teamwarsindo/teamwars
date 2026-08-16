"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchScheduleItem, formatMatchWIB } from "@/app/tournament/_library";
import { ChevronRight, Flame, Tv, ExternalLink, Radio } from "lucide-react";

interface MatchCenterProps {
  currentWeek: number;
  loading: boolean;
  liveMatches: MatchScheduleItem[];
  todayMatches: MatchScheduleItem[];
  upcomingMatches: MatchScheduleItem[];
  recentResults: MatchScheduleItem[];
  formatDate?: (d: string) => string;
}

export function MatchCenter({
  currentWeek,
  loading,
  liveMatches,
  todayMatches,
  upcomingMatches,
  recentResults,
}: MatchCenterProps) {
  const [tab, setTab] = useState<"SCHEDULE" | "RESULTS">("SCHEDULE");

  const renderCard = (m: MatchScheduleItem) => {
    const isLive = Boolean(m.streamLink) && !m.isFinished;
    const hasStreamer = Boolean(m.streamer) && !m.isFinished;

    const displayStreamerName =
      m.streamer?.replace(/<@!?\d+>/g, "").trim() || "Streamer Resmi";

    const scoreA = m.scoreA ?? 0;
    const scoreB = m.scoreB ?? 0;
    const isFinished = Boolean(m.isFinished);
    const teamAWins = isFinished && scoreA > scoreB;
    const teamBWins = isFinished && scoreB > scoreA;

    return (
      <div
        key={m.id}
        className={`flex flex-col gap-2 rounded-xl border p-2.5 text-xs transition ${
          isLive
            ? "border-rose-500/50 bg-rose-500/10 shadow-xs"
            : hasStreamer
            ? "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
            : "border-border/60 bg-muted/20 hover:border-primary/40"
        }`}
      >
        <div className="flex items-center justify-between min-w-0">
          {/* TIM A */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={m.teamALogo || "/logo.webp"}
              alt=""
              className={`h-5 w-5 shrink-0 object-contain ${
                teamBWins ? "opacity-40 grayscale" : "opacity-100"
              }`}
            />
            <span
              className={`truncate text-[11px] ${
                teamAWins
                  ? "font-black text-emerald-600 dark:text-emerald-400"
                  : teamBWins
                  ? "font-medium text-muted-foreground/50 dark:text-neutral-500"
                  : "font-bold text-foreground"
              }`}
            >
              {m.teamAName}
            </span>
          </div>

          {/* SKOR / STATUS */}
          <div className="px-2 text-center shrink-0 min-w-[75px]">
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2 py-0.5 text-[9.5px] font-black text-white animate-pulse">
                <Flame className="h-3 w-3" /> LIVE
              </span>
            ) : isFinished || scoreA + scoreB > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 border border-border/80 px-2 py-0.5 text-[10px] font-black">
                <span
                  className={
                    teamAWins
                      ? "font-black text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/50 dark:text-neutral-500 font-semibold"
                  }
                >
                  {scoreA}
                </span>
                <span className="text-muted-foreground/60">-</span>
                <span
                  className={
                    teamBWins
                      ? "font-black text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/50 dark:text-neutral-500 font-semibold"
                  }
                >
                  {scoreB}
                </span>
              </span>
            ) : (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                VS
              </span>
            )}
            <span className="block text-[9px] text-muted-foreground mt-0.5">
              {formatMatchWIB(m.matchDate)}
            </span>
          </div>

          {/* TIM B */}
          <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
            <span
              className={`truncate text-[11px] text-right ${
                teamBWins
                  ? "font-black text-emerald-600 dark:text-emerald-400"
                  : teamAWins
                  ? "font-medium text-muted-foreground/50 dark:text-neutral-500"
                  : "font-bold text-foreground"
              }`}
            >
              {m.teamBName}
            </span>
            <img
              src={m.teamBLogo || "/logo.webp"}
              alt=""
              className={`h-5 w-5 shrink-0 object-contain ${
                teamAWins ? "opacity-40 grayscale" : "opacity-100"
              }`}
            />
          </div>
        </div>

        {/* STATUS STREAMING */}
        {!m.isFinished && (
          <>
            {isLive && m.streamLink ? (
              <div className="flex items-center justify-between border-t border-rose-500/20 pt-1.5 mt-0.5">
                <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <Tv className="h-3 w-3" /> Streamer: {displayStreamerName}
                </span>
                <a
                  href={m.streamLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-500 transition shadow-xs"
                >
                  Watch <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            ) : hasStreamer ? (
              <div className="flex items-center justify-between border-t border-orange-500/20 pt-1.5 mt-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3" /> Akan Live by {displayStreamerName}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground italic">
                  Link rilis 30 mnt sblm match
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-0.5">
                <span className="text-[9.5px] font-medium text-muted-foreground flex items-center gap-1">
                  <Tv className="h-2.5 w-2.5 text-muted-foreground/70" /> Siaran Langsung:
                </span>
                <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[9.5px] font-bold text-muted-foreground border border-border/60">
                  🎙️ Butuh Streamer
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("SCHEDULE")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition ${
              tab === "SCHEDULE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Jadwal
          </button>
          <button
            onClick={() => setTab("RESULTS")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition ${
              tab === "RESULTS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hasil Terbaru
          </button>
        </div>

        <Link
          href="/tournament?tab=schedule"
          className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
        >
          Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
          Memuat pertandingan...
        </div>
      ) : tab === "SCHEDULE" ? (
        <div className="space-y-3.5">
          {liveMatches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Sedang Berlangsung (Live)
              </span>
              <div className="space-y-2">{liveMatches.map(renderCard)}</div>
            </div>
          )}

          {todayMatches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Main Hari Ini
              </span>
              <div className="space-y-2">{todayMatches.map(renderCard)}</div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Pertandingan Berikutnya
            </span>

            {upcomingMatches.length > 0 ? (
              <div className="space-y-2">{upcomingMatches.map(renderCard)}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3 text-center">
                <p className="text-[11px] font-bold text-foreground">
                  📅 Tidak ada jadwal lanjutan di Week {currentWeek}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Jadwal pertandingan Week berikutnya akan dirilis resmi pada hari{" "}
                  <strong className="text-primary">Senin pukul 08.00 WIB</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Match Terakhir yang Selesai
          </span>
          {recentResults.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Belum ada match yang selesai.
            </div>
          ) : (
            <div className="space-y-2">{recentResults.map(renderCard)}</div>
          )}
        </div>
      )}
    </div>
  );
}