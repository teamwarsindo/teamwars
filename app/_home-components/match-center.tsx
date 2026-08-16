"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ChevronRight, Radio, Tv, Calendar, CheckCircle2 } from "lucide-react";

interface MatchCenterProps {
  currentWeek: number;
  loading: boolean;
  liveMatches: MatchScheduleItem[];
  todayMatches: MatchScheduleItem[];
  upcomingMatches: MatchScheduleItem[];
  recentResults: MatchScheduleItem[];
}

function formatMatchDate(dateStr?: string) {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export function MatchCenter({
  currentWeek,
  loading,
  liveMatches = [],
  todayMatches = [],
  upcomingMatches = [],
  recentResults = [],
}: MatchCenterProps) {
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "RESULTS">("SCHEDULE");

  const hasLive = liveMatches.length > 0;
  const hasToday = todayMatches.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-sm">
      {/* HEADER SECTION & TAB SWITCHER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("SCHEDULE")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
              activeTab === "SCHEDULE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3 w-3" />
            Jadwal Week {currentWeek}
          </button>
          <button
            onClick={() => setActiveTab("RESULTS")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              activeTab === "RESULTS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hasil Terbaru
          </button>
        </div>

        <Link
          href={`/tournament?tab=schedules&week=${currentWeek}`}
          className="flex items-center gap-0.5 text-[10.5px] font-medium text-primary hover:underline"
        >
          Semua <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
          Memuat pertandingan...
        </div>
      ) : activeTab === "SCHEDULE" ? (
        <div className="space-y-3">
          {/* 1. MATCH LIVE (TANPA SKOR 0-0) */}
          {hasLive && (
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-rose-500 px-1 flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Sedang Berlangsung
              </span>
              <div className="space-y-1.5">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5 space-y-1.5 transition"
                  >
                    <div className="flex items-center justify-between">
                      {/* TEAM A */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        <span className="truncate font-semibold text-[10.5px] text-foreground">
                          {m.teamAName}
                        </span>
                      </div>

                      {/* LIVE BADGE ONLY */}
                      <div className="flex flex-col items-center px-2 shrink-0">
                        <span className="flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[8.5px] font-black text-white uppercase tracking-wider shadow-xs animate-pulse">
                          <Radio className="h-2.5 w-2.5" /> LIVE
                        </span>
                      </div>

                      {/* TEAM B */}
                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="truncate font-semibold text-[10.5px] text-foreground">
                          {m.teamBName}
                        </span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                      </div>
                    </div>

                    {/* STREAMER & ACTION */}
                    <div className="flex items-center justify-between border-t border-rose-500/20 pt-1 text-[9px]">
                      <span className="text-rose-500/90 font-medium truncate flex items-center gap-1">
                        <Tv className="h-3 w-3" /> {m.streamer ? `Streamer: ${m.streamer}` : "Official Live"}
                      </span>
                      {m.streamLink && (
                        <a
                          href={m.streamLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-rose-500 px-2 py-0.5 font-bold text-white text-[8.5px] hover:bg-rose-600 transition"
                        >
                          Live ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MAIN HARI INI */}
          {hasToday && (
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-primary px-1">
                Main Hari Ini
              </span>
              <div className="space-y-1.5">
                {todayMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-primary/25 bg-primary/5 p-2 space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        <span className="truncate font-semibold text-[10.5px] text-foreground">
                          {m.teamAName}
                        </span>
                      </div>

                      <div className="flex flex-col items-center px-1.5 shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground">VS</span>
                        <span className="text-[8.5px] font-medium text-primary">
                          {formatMatchDate(m.matchDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="truncate font-semibold text-[10.5px] text-foreground">
                          {m.teamBName}
                        </span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/30 pt-0.5 text-[8.5px] text-muted-foreground">
                      <span>{m.streamer ? `🎙️ ${m.streamer}` : "📺 Butuh Streamer"}</span>
                      <span className="font-medium text-primary">Hari Ini</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PERTANDINGAN BERIKUTNYA */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Pertandingan Berikutnya
            </span>

            {upcomingMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-3 px-2 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-[10px] font-semibold text-foreground">
                  Tidak Ada Jadwal Lanjutan di Pekan Ini
                </p>
                <p className="text-[8.5px] text-muted-foreground">
                  Jadwal Week {currentWeek + 1} akan dimulai Senin pukul 08.00 WIB.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-border bg-muted/20 p-2 space-y-1 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        <span className="truncate font-semibold text-[10px] text-foreground">
                          {m.teamAName}
                        </span>
                      </div>

                      <div className="flex flex-col items-center px-1.5 shrink-0">
                        <span className="rounded bg-muted px-1 text-[8px] font-semibold text-muted-foreground">
                          VS
                        </span>
                        <span className="text-[8.5px] font-medium text-muted-foreground mt-0.5">
                          {formatMatchDate(m.matchDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="truncate font-semibold text-[10px] text-foreground">
                          {m.teamBName}
                        </span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/30 pt-0.5 text-[8.5px] text-muted-foreground">
                      <span className="truncate">
                        {m.streamer ? `🎙️ ${m.streamer}` : "📺 Butuh Streamer"}
                      </span>
                      <span>Week {m.weekNumber || currentWeek}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: HASIL TERBARU PEKAN INI */
        <div className="space-y-1.5">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Rekap Hasil Pertandingan Terakhir
          </span>
          {recentResults.length === 0 ? (
            <div className="py-4 text-center text-[10px] text-muted-foreground">
              Belum ada hasil pertandingan pekan ini.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentResults.map((m) => {
                const scoreA = m.scoreA || 0;
                const scoreB = m.scoreB || 0;
                const isWinA = scoreA > scoreB;
                const isWinB = scoreB > scoreA;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-border bg-muted/20 text-[10.5px]"
                  >
                    {/* TEAM A */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <img
                        src={m.teamALogo || "/logo.webp"}
                        alt=""
                        className="h-3.5 w-3.5 shrink-0 object-contain"
                      />
                      <span
                        className={`truncate font-semibold ${
                          isWinA ? "text-foreground font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {m.teamAName}
                      </span>
                    </div>

                    {/* FINAL SCORE */}
                    <div className="flex items-center gap-1.5 px-2 shrink-0 font-bold">
                      <span className={isWinA ? "text-emerald-500" : "text-muted-foreground"}>
                        {scoreA}
                      </span>
                      <span className="text-muted-foreground/50">-</span>
                      <span className={isWinB ? "text-emerald-500" : "text-muted-foreground"}>
                        {scoreB}
                      </span>
                    </div>

                    {/* TEAM B */}
                    <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                      <span
                        className={`truncate font-semibold ${
                          isWinB ? "text-foreground font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {m.teamBName}
                      </span>
                      <img
                        src={m.teamBLogo || "/logo.webp"}
                        alt=""
                        className="h-3.5 w-3.5 shrink-0 object-contain"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
      }
            
