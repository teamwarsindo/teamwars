"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MatchScheduleItem,
  TOURNAMENT_RULES,
  getScheduleEmptyStateMessage,
} from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { MatchCardItem } from "./match-card-item";
import { MatchH2HModal } from "./match-h2h-modal";
import { Calendar, Radio, ChevronRight, AlertCircle } from "lucide-react";

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

  const isPlayoffStage = currentWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;
  const hasFinishedMatches = recentResults.length > 0;

  // Filter agar laga yang sedang LIVE tidak muncul ganda di today atau upcoming
  const liveMatchIds = new Set(liveMatches.map((m) => m.id));
  const filteredTodayMatches = todayMatches.filter((m) => !liveMatchIds.has(m.id));
  const filteredUpcomingMatches = upcomingMatches.filter((m) => !liveMatchIds.has(m.id));

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
            <span>{isPlayoffStage ? "Jadwal Playoff" : `Jadwal Week ${currentWeek}`}</span>
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
          href={isPlayoffStage ? "/tournament?tab=playoff" : `/tournament?tab=schedule&week=${currentWeek}`}
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
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Sedang Berlangsung
              </span>
              <div className="space-y-2">
                {liveMatches.map((m) => (
                  <MatchCardItem
                    key={m.id}
                    match={m}
                    variant="LIVE"
                    currentWeek={currentWeek}
                    onClick={() => setSelectedH2HMatch(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. MAIN HARI INI */}
          {filteredTodayMatches.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
                Main Hari Ini
              </span>
              <div className="space-y-2">
                {filteredTodayMatches.map((m) => (
                  <MatchCardItem
                    key={m.id}
                    match={m}
                    variant="TODAY"
                    currentWeek={currentWeek}
                    onClick={() => setSelectedH2HMatch(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. PERTANDINGAN BERIKUTNYA */}
          {filteredUpcomingMatches.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pertandingan Berikutnya
              </span>
              <div className="space-y-2">
                {filteredUpcomingMatches.map((m) => (
                  <MatchCardItem
                    key={m.id}
                    match={m}
                    variant="UPCOMING"
                    currentWeek={currentWeek}
                    onClick={() => setSelectedH2HMatch(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAMPILAN KOSONG */}
          {liveMatches.length === 0 && filteredTodayMatches.length === 0 && filteredUpcomingMatches.length === 0 && (
            <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-muted/20 border border-border/40">
              <AlertCircle className="h-6 w-6 text-muted-foreground/80 mb-2" />
              <p className="max-w-md text-xs font-medium text-muted-foreground leading-relaxed">
                {getScheduleEmptyStateMessage(currentWeek, hasFinishedMatches)}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* TAB HASIL TERBARU */
        <div className="space-y-2">
          {recentResults.length > 0 ? (
            recentResults.map((m) => (
              <MatchCardItem
                key={m.id}
                match={m}
                variant="RESULT"
                currentWeek={currentWeek}
                onClick={() => setSelectedH2HMatch(m)}
              />
            ))
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
