"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { ChevronRight, Calendar, Radio, CheckCircle2 } from "lucide-react";
import { MatchCardItem } from "./match-card-item";
import { MatchH2HModal } from "./match-h2h-modal";

interface MatchCenterProps {
  currentWeek: number;
  loading: boolean;
  liveMatches?: MatchScheduleItem[];
  todayMatches?: MatchScheduleItem[];
  upcomingMatches?: MatchScheduleItem[];
  recentResults?: MatchScheduleItem[];
  standings?: ExtendedStandingItem[];
  allSchedules?: MatchScheduleItem[];
}

export function MatchCenter({
  currentWeek,
  loading,
  liveMatches = [],
  todayMatches = [],
  upcomingMatches = [],
  recentResults = [],
  standings = [],
  allSchedules = [],
}: MatchCenterProps) {
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "RESULTS">("SCHEDULE");
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);

  const hasLive = liveMatches.length > 0;
  const hasToday = todayMatches.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 md:p-5 shadow-sm flex flex-col justify-between">
      <div>
        {/* TAB HEADER */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5 md:pb-3">
          <div className="flex items-center gap-1 md:gap-1.5">
            <button
              onClick={() => setActiveTab("SCHEDULE")}
              className={`rounded-xl px-2.5 py-1 md:px-3.5 md:py-1.5 text-[11px] md:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "SCHEDULE"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
              Jadwal Week {currentWeek}
            </button>
            <button
              onClick={() => setActiveTab("RESULTS")}
              className={`rounded-xl px-2.5 py-1 md:px-3.5 md:py-1.5 text-[11px] md:text-xs font-bold transition cursor-pointer ${
                activeTab === "RESULTS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Hasil Terbaru
            </button>
          </div>

          <Link
            href={`/tournament?tab=schedule&week=${currentWeek}`}
            className="flex items-center gap-0.5 text-[10.5px] md:text-xs font-bold text-primary hover:underline"
          >
            Semua <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs md:text-sm text-muted-foreground animate-pulse font-semibold">
            Memuat pertandingan...
          </div>
        ) : activeTab === "SCHEDULE" ? (
          <div className="space-y-3.5 md:space-y-4 pt-2.5">
            {/* LIVE MATCH */}
            {hasLive && (
              <div className="space-y-1.5">
                <span className="text-[9.5px] md:text-xs font-bold uppercase tracking-wider text-rose-500 px-1 flex items-center gap-1">
                  <Radio className="h-2.5 w-2.5 md:h-3 md:w-3 animate-pulse" /> Sedang Berlangsung
                </span>
                <div className="space-y-2">
                  {liveMatches.map((m) => (
                    <MatchCardItem
                      key={m.id}
                      match={m}
                      variant="LIVE"
                      currentWeek={currentWeek}
                      onClick={() => setSelectedMatch(m)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* MAIN HARI INI */}
            {hasToday && (
              <div className="space-y-1.5">
                <span className="text-[9.5px] md:text-xs font-bold uppercase tracking-wider text-primary px-1">
                  Main Hari Ini
                </span>
                <div className="space-y-2">
                  {todayMatches.map((m) => (
                    <MatchCardItem
                      key={m.id}
                      match={m}
                      variant="TODAY"
                      currentWeek={currentWeek}
                      onClick={() => setSelectedMatch(m)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PERTANDINGAN BERIKUTNYA */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                Pertandingan Berikutnya
              </span>

              {upcomingMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 px-3 text-center rounded-2xl border border-dashed border-border/60 bg-muted/10 space-y-1">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                  <p className="text-[11px] md:text-xs font-bold text-foreground">
                    Tidak Ada Jadwal Lanjutan di Pekan Ini
                  </p>
                  <p className="text-[9px] md:text-[10.5px] text-muted-foreground">
                    Jadwal Week {currentWeek + 1} akan dimulai Senin pukul 08.00 WIB.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingMatches.map((m) => (
                    <MatchCardItem
                      key={m.id}
                      match={m}
                      variant="UPCOMING"
                      currentWeek={currentWeek}
                      onClick={() => setSelectedMatch(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* HASIL TERBARU */
          <div className="space-y-2 pt-2.5">
            <span className="text-[9.5px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Rekap Hasil Pertandingan Terakhir
            </span>
            {recentResults.length === 0 ? (
              <div className="py-6 text-center text-xs md:text-sm text-muted-foreground font-medium">
                Belum ada hasil pertandingan pekan ini.
              </div>
            ) : (
              <div className="space-y-2">
                {recentResults.map((m) => (
                  <MatchCardItem
                    key={m.id}
                    match={m}
                    variant="RESULT"
                    currentWeek={currentWeek}
                    onClick={() => setSelectedMatch(m)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL H2H */}
      <MatchH2HModal
        match={selectedMatch}
        currentWeek={currentWeek}
        standings={standings}
        allSchedules={allSchedules}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}