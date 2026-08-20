"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ScheduleTab } from "./schedule-tab";
import { StandingTab } from "./standing-tab";
import { PlayoffTab } from "./playoff-tab";
import { MatchH2HModal } from "@/app/_home-components/match-h2h-modal";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { Calendar, Trophy, GitBranch } from "lucide-react";

interface TournamentHubProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
  allWeeks: number[];
  isAdmin: boolean;
  onResetSchedules: () => void;
  onSelectMatch?: (match: MatchScheduleItem) => void;
  defaultWeek: number;
  standings?: ExtendedStandingItem[];
}

export function TournamentHub({
  schedules = [],
  masterTeams = [],
  allWeeks = [],
  isAdmin,
  onResetSchedules,
  onSelectMatch: externalOnSelectMatch,
  defaultWeek = 1,
  standings = [],
}: TournamentHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. State Modal H2H Mandiri (Agar klik kartu match di schedule selalu membuka modal)
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);

  const activeTab = searchParams.get("tab") || "schedule";

  const setTab = (tab: "schedule" | "standings" | "playoff") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 2. Handler Seleksi Match
  const handleSelectMatch = (match: MatchScheduleItem) => {
    setSelectedMatch(match);
    if (externalOnSelectMatch) {
      externalOnSelectMatch(match);
    }
  };

  // 3. Ekstraksi Semua Nama Tim Unik untuk Dropdown Filter
  const allTeamNames = useMemo(() => {
    return Array.from(
      new Set([
        ...masterTeams.map((t) => t.name || t.teamName).filter(Boolean),
        ...schedules.map((s) => s.teamAName).filter(Boolean),
        ...schedules.map((s) => s.teamBName).filter(Boolean),
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [masterTeams, schedules]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
      {/* 3 TAB UTAMA TURNAMEN */}
      <div className="grid grid-cols-3 gap-2 max-w-xl md:max-w-2xl mx-auto bg-card border border-border p-1.5 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setTab("schedule")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "schedule"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Group Stage</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("standings")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "standings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Klasemen</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("playoff")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === "playoff"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>Playoff</span>
        </button>
      </div>

      {/* KONTEN AKTIF */}
      <div className="w-full">
        {activeTab === "schedule" && (
          <ScheduleTab
            schedules={schedules}
            allTeamNames={allTeamNames}
            allWeeks={allWeeks}
            isAdmin={isAdmin}
            onResetSchedules={onResetSchedules}
            onSelectMatch={handleSelectMatch}
            defaultWeek={defaultWeek}
          />
        )}

        {activeTab === "standings" && (
          <StandingTab
            schedules={schedules}
            masterTeams={masterTeams}
          />
        )}

        {activeTab === "playoff" && (
          <PlayoffTab
            schedules={schedules}
            masterTeams={masterTeams}
            groupAName={DIVISION_MAP.GROUP_A}
            groupBName={DIVISION_MAP.GROUP_B}
          />
        )}
      </div>

      {/* MODAL H2H TERPUSAT UNTUK TAB JADWAL */}
      <MatchH2HModal
        match={selectedMatch}
        currentWeek={defaultWeek}
        standings={standings}
        allSchedules={schedules}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}