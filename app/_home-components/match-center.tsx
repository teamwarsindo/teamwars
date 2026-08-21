"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchScheduleItem, formatDateTimeWIB, formatMatchWIB } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { MatchH2HModal } from "./match-h2h-modal";
import { Calendar, Radio, Sparkles, ChevronRight, Mic, Tv } from "lucide-react";

interface MatchCenterProps {
  currentWeek: number;
  loading: boolean;
  liveMatches: MatchScheduleItem[];
  todayMatches: MatchScheduleItem[];
  upcomingMatches: MatchScheduleItem[];
  recentResults: MatchScheduleItem[];
  standings?: ExtendedStandingItem[];
  allSchedules?: MatchScheduleItem[];
}

export function MatchCenter({
  currentWeek,
  loading,
  liveMatches,
  todayMatches,
  upcomingMatches,
  recentResults,
  standings = [],
  allSchedules = [],
}: MatchCenterProps) {
  const [activeTab, setActiveTab] = useState<"JADWAL" | "HASIL">("JADWAL");
  const [selectedH2HMatch, setSelectedH2HMatch] = useState<MatchScheduleItem | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 text-card-foreground shadow-xs">
      {/* HEADER & TAB SWITCHER */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/40">
          <button
            onClick={() => setActiveTab("JADWAL")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "JADWAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Jadwal Week {currentWeek}</span>
          </button>
          <button
            onClick={() => setActiveTab("HASIL")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "HASIL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Hasil Terbaru</span>
          </button>
        </div>

        <Link
          href={`/tournament?tab=schedule&week=${currentWeek}`}
          className="inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"
        >
          Semua <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-xs font-bold text-muted-foreground animate-pulse">
          ⏳ Memuat Jadwal Pertandingan...
        </div>
      ) : activeTab === "JADWAL" ? (
        <div className="space-y-3.5">
          {/* 1. SEDANG BERLANGSUNG (LIVE) */}
          {liveMatches.length > 0 && (
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-500">
                <Radio className="h-3 w-3 animate-pulse" /> Sedang Berlangsung
              </span>
              <div className="space-y-2">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedH2HMatch(m)}
                    className="flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5 transition hover:border-rose-500/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                        <span className="font-bold text-xs truncate">{m.teamAName}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white shrink-0 animate-pulse">
                        <Radio className="h-2.5 w-2.5" /> LIVE
                      </span>
                      <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                        <span className="font-bold text-xs truncate">{m.teamBName}</span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                      </div>
                    </div>

                    {/* FOOTER LIVE CARD */}
                    <div className="flex items-center justify-between border-t border-rose-500/20 pt-1.5 text-[10px] text-rose-600 dark:text-rose-400">
                      <span className="flex items-center gap-1 font-medium truncate">
                        <Tv className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          Streamer: <strong>{m.streamer || "Official Match"}</strong>
                        </span>
                      </span>
                      {m.streamLink ? (
                        <a
                          href={m.streamLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold underline hover:opacity-80 shrink-0"
                        >
                          Live ↗
                        </a>
                      ) : (
                        <span className="font-bold text-[9px] uppercase">Live</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. MAIN HARI INI */}
          {todayMatches.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-500">
                Main Hari Ini
              </span>
              <div className="space-y-2">
                {todayMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedH2HMatch(m)}
                    className="flex flex-col gap-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5 transition hover:border-sky-500/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                        <span className="font-bold text-xs truncate">{m.teamAName}</span>
                      </div>
                      <div className="flex flex-col items-center shrink-0 px-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">VS</span>
                        <span className="text-[9.5px] font-extrabold text-sky-600 dark:text-sky-400">
                          {formatDateTimeWIB(m.matchDate, { includeDate: false })}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                        <span className="font-bold text-xs truncate">{m.teamBName}</span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                      </div>
                    </div>

                    {/* FOOTER HARI INI */}
                    <div className="flex items-center justify-between border-t border-sky-500/20 pt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mic className="h-3 w-3 text-sky-500 shrink-0" />
                        <span className="truncate">
                          {m.streamer ? (
                            <strong className="text-foreground">{m.streamer}</strong>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Official Match</span>
                          )}
                        </span>
                      </span>
                      <span className="font-bold text-[9px] uppercase tracking-wide text-sky-600 dark:text-sky-400">
                        Hari Ini
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PERTANDINGAN BERIKUTNYA */}
          {upcomingMatches.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Pertandingan Berikutnya
              </span>
              <div className="space-y-2">
                {upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedH2HMatch(m)}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2.5 transition hover:border-primary/40 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={m.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                        <span className="font-bold text-xs truncate">{m.teamAName}</span>
                      </div>
                      <div className="flex flex-col items-center shrink-0 px-2 text-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">VS</span>
                        <span className="text-[9.5px] font-medium text-muted-foreground">
                          {formatMatchWIB(m.matchDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                        <span className="font-bold text-xs truncate">{m.teamBName}</span>
                        <img
                          src={m.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                        />
                      </div>
                    </div>

                    {/* FOOTER BERIKUTNYA */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mic className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">
                          {m.streamer ? (
                            <strong className="text-foreground">{m.streamer}</strong>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Official Match</span>
                          )}
                        </span>
                      </span>
                      <span className="font-bold text-[9px] uppercase tracking-wide text-muted-foreground">
                        Week {m.weekNumber || currentWeek}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {liveMatches.length === 0 && todayMatches.length === 0 && upcomingMatches.length === 0 && (
            <div className="py-8 text-center text-xs font-semibold text-muted-foreground">
              Tidak ada jadwal pertandingan pekan ini.
            </div>
          )}
        </div>
      ) : (
        /* TAB HASIL TERBARU */
        <div className="space-y-2">
          {recentResults.length > 0 ? (
            recentResults.map((m) => {
              const sA = Number(m.scoreA) || 0;
              const sB = Number(m.scoreB) || 0;
              const winA = sA > sB;
              const winB = sB > sA;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedH2HMatch(m)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2.5 transition hover:border-primary/40 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* TIM A */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        src={m.teamALogo || "/logo.webp"}
                        alt=""
                        className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                      />
                      <span
                        className={`text-xs truncate ${
                          winA
                            ? "font-black text-emerald-600 dark:text-emerald-400"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {m.teamAName}
                      </span>
                    </div>

                    {/* SCORE TENGAH */}
                    <div className="flex items-center gap-1.5 shrink-0 px-2 font-black text-sm">
                      <span
                        className={
                          winA
                            ? "text-emerald-600 dark:text-emerald-400 font-black"
                            : "text-muted-foreground"
                        }
                      >
                        {sA}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">-</span>
                      <span
                        className={
                          winB
                            ? "text-emerald-600 dark:text-emerald-400 font-black"
                            : "text-muted-foreground"
                        }
                      >
                        {sB}
                      </span>
                    </div>

                    {/* TIM B */}
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                      <span
                        className={`text-xs truncate ${
                          winB
                            ? "font-black text-emerald-600 dark:text-emerald-400"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {m.teamBName}
                      </span>
                      <img
                        src={m.teamBLogo || "/logo.webp"}
                        alt=""
                        className="h-6 w-6 object-contain rounded shrink-0 bg-background/50 border p-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
                    <span>{formatDateTimeWIB(m.matchDate, { includeDay: true })}</span>
                    <span className="font-bold text-primary flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> Lihat Detail H2H
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs font-semibold text-muted-foreground">
              Belum ada hasil pertandingan di pekan ini.
            </div>
          )}
        </div>
      )}

      {/* MODAL H2H */}
      {selectedH2HMatch && (
        <MatchH2HModal
          match={selectedH2HMatch}
          currentWeek={currentWeek}
          standings={standings}
          allSchedules={allSchedules}
          onClose={() => setSelectedH2HMatch(null)}
        />
      )}
    </div>
  );
}
