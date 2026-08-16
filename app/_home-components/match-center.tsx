"use client";

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
}: MatchCenterProps) {
  const hasLive = liveMatches.length > 0;
  const hasToday = todayMatches.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Jadwal Week {currentWeek}
          </span>
          {hasLive && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-500 animate-pulse">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </span>
          )}
        </div>

        <Link
          href={`/tournament?tab=schedules&week=${currentWeek}`}
          className="flex items-center gap-0.5 text-[10.5px] font-medium text-primary hover:underline"
        >
          Semua Jadwal <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
          Memuat jadwal pertandingan...
        </div>
      ) : (
        <div className="space-y-3">
          {/* 1. MATCH LIVE */}
          {hasLive ? (
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-rose-500 px-1 flex items-center gap-1">
                <Radio className="h-2.5 w-2.5" /> Sedang Berlangsung
              </span>
              <div className="space-y-1.5">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5 space-y-2 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        <span className="truncate font-medium text-[10px] text-foreground">
                          {m.teamAName}
                        </span>
                      </div>

                      <div className="flex flex-col items-center px-2 shrink-0">
                        <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                          LIVE
                        </span>
                        <span className="text-[10.5px] font-bold text-foreground mt-0.5">
                          {m.scoreA || 0} - {m.scoreB || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="truncate font-medium text-[10px] text-foreground">
                          {m.teamBName}
                        </span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-4 w-4 shrink-0 object-contain"
                        />
                      </div>
                    </div>

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
                          Watch ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : hasToday ? (
            /* 2. MAIN HARI INI */
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
                        <span className="truncate font-medium text-[10px] text-foreground">
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
                        <span className="truncate font-medium text-[10px] text-foreground">
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
          ) : null}

          {/* 3. PERTANDINGAN BERIKUTNYA (HANYA HARI BERIKUTNYA DI WEEK INI) */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Pertandingan Berikutnya
            </span>

            {upcomingMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-[10.5px] font-semibold text-foreground">
                  Tidak Ada Jadwal Lanjutan di Pekan Ini
                </p>
                <p className="text-[9px] text-muted-foreground">
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
                        <span className="truncate font-medium text-[10px] text-foreground">
                          {m.teamAName}
                        </span>
                      </div>

                      <div className="flex flex-col items-center px-1.5 shrink-0">
                        <span className="rounded bg-muted px-1 text-[8.5px] font-semibold text-muted-foreground">
                          VS
                        </span>
                        <span className="text-[8.5px] font-medium text-muted-foreground mt-0.5">
                          {formatMatchDate(m.matchDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="truncate font-medium text-[10px] text-foreground">
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
      )}
    </div>
  );
      }
                            
