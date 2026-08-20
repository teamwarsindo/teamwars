"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  TeamStandingItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { ScheduleTab } from "./schedule-tab";
import { StandingTab } from "./standing-tab";
import { PlayoffTab } from "./playoff-tab";
import { DivisionFilterType } from "./schedule-filter";
import { MatchReportModal } from "./match-report-modal";
import Swal from "sweetalert2";

export function TournamentView({
  isAdmin,
  selectedGroupFilter,
  setSelectedGroupFilter,
  selectedDateFilter,
  setSelectedDateFilter,
}: {
  isAdmin: boolean;
  selectedGroupFilter: DivisionFilterType;
  setSelectedGroupFilter: (v: DivisionFilterType) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTabParam = searchParams.get("tab")?.toLowerCase();
  const activeMainTab: "SCHEDULE" | "STANDINGS" | "PLAYOFF" =
    rawTabParam === "standings" || rawTabParam === "standing"
      ? "STANDINGS"
      : rawTabParam === "playoff"
      ? "PLAYOFF"
      : "SCHEDULE";

  const handleTabChange = (tabKey: "SCHEDULE" | "STANDINGS" | "PLAYOFF") => {
    const params = new URLSearchParams();
    if (tabKey === "SCHEDULE") {
      params.set("tab", "schedule");
    } else if (tabKey === "STANDINGS") {
      params.set("tab", "standings");
      params.set("view", "groups");
    } else {
      params.set("tab", "playoff");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportMatch, setActiveReportMatch] = useState<MatchScheduleItem | null>(null);

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const isPlayoffWeek = useMemo(() => currentWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK, [currentWeek]);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
        setMasterTeams(data.masterTeams || []);

        if (activeReportMatch) {
          const updatedActive = (data.schedules || []).find((m: MatchScheduleItem) => m.id === activeReportMatch.id);
          if (updatedActive) setActiveReportMatch(updatedActive);
        }
      }
    } catch (err) {
      console.error("Error fetching tournament:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const handleForceResetSchedules = async () => {
    const res = await Swal.fire({
      title: "SYNC DATA ROULETTE & GENERATE JADWAL?",
      text: "Sistem akan mengambil daftar tim terbaru dari Roulette dan menyusun ulang jadwal pertandingan secara otomatis.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Sync Sekarang",
      confirmButtonColor: "#0284c7",
    });

    if (!res.isConfirmed) return;
    setIsLoading(true);

    try {
      await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_ROULETTE" }),
      });

      setSelectedDateFilter("");
      setSelectedGroupFilter("ALL");
      await fetchTournamentData();

      Swal.fire("Berhasil!", "Jadwal dan Standing berhasil disinkronisasi dengan data Roulette terbaru.", "success");
    } catch {
      Swal.fire("Gagal!", "Terjadi kesalahan saat menyinkronkan data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">
        ⏳ Memuat Data Turnamen...
      </div>
    );
  }

  const allTeamNames = Array.from(new Set(standings.map((s) => s.teamName)));
  const allWeeks = Array.from(
    new Set([...schedules.map((m) => m.weekNumber || 1), currentWeek])
  ).sort((a, b) => a - b);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 3 TAB NAVIGASI UTAMA */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {[
          { key: "SCHEDULE", label: "Group Stage" },
          { key: "STANDINGS", label: "Klasemen" },
          { key: "PLAYOFF", label: "Playoff" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as any)}
            className={`rounded-2xl py-2.5 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === tab.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card text-muted-foreground border border-border/80 hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW TAB SCHEDULE */}
      {activeMainTab === "SCHEDULE" && (
        <ScheduleTab
          schedules={schedules}
          allTeamNames={allTeamNames}
          allWeeks={allWeeks}
          isAdmin={isAdmin}
          onResetSchedules={handleForceResetSchedules}
          onSelectMatch={(m) => setActiveReportMatch(m)}
          selectedGroupFilter={selectedGroupFilter}
          setSelectedGroupFilter={setSelectedGroupFilter}
          defaultWeek={currentWeek}
        />
      )}

      {/* VIEW TAB STANDING */}
      {activeMainTab === "STANDINGS" && (
        <StandingTab schedules={schedules} masterTeams={masterTeams} />
      )}

      {/* VIEW TAB PLAYOFF */}
      {activeMainTab === "PLAYOFF" && (
        <PlayoffTab
          schedules={isAdmin || isPlayoffWeek ? schedules : []}
          masterTeams={isAdmin || isPlayoffWeek ? masterTeams : []}
          groupAName={DIVISION_MAP.GROUP_A}
          groupBName={DIVISION_MAP.GROUP_B}
        />
      )}

      {/* MODAL MATCH REPORT */}
      {activeReportMatch && (
        <MatchReportModal
          match={activeReportMatch}
          open={!!activeReportMatch}
          onClose={() => setActiveReportMatch(null)}
        />
      )}
    </div>
  );
}
