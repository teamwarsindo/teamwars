"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import { ScheduleTab } from "./schedule-tab";
import { StandingTab } from "./standing-tab";
import { PlayoffTab } from "./playoff-tab";
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
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (v: string) => void;
}) {
  const [activeMainTab, setActiveMainTab] = useState<"SCHEDULE" | "STANDING" | "PLAYOFF">("SCHEDULE");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportMatch, setActiveReportMatch] = useState<MatchScheduleItem | null>(null);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
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
      text: "Sistem akan mengambil daftar tim Group A & B terbaru dari Roulette dan menyusun ulang jadwal pertandingan secara otomatis.",
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
    } catch (err) {
      Swal.fire("Gagal!", "Terjadi kesalahan saat menyinkronkan data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Data Turnamen...</div>;
  }

  const getMatchWeekNumber = (dateString: string) => {
    const startDate = new Date("2026-08-05T00:00:00+07:00").getTime();
    const matchDate = new Date(dateString).getTime();
    const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  const schedulesWithWeek = schedules.map((m) => ({ ...m, weekNumber: getMatchWeekNumber(m.matchDate) }));
  const allTeamNames = Array.from(new Set(standings.map((s) => s.teamName)));
  const allWeeks = Array.from(new Set(schedulesWithWeek.map((m) => m.weekNumber))).sort((a, b) => a - b);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 3 Main Buttons Konsisten */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {[
          { key: "SCHEDULE", label: "Group Stage" },
          { key: "STANDING", label: "Standing Group" },
          { key: "PLAYOFF", label: "Playoff Stage" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMainTab(tab.key as any)}
            className={`rounded-xl py-3 px-2 text-center text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              activeMainTab === tab.key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View Tab Aktif */}
      {activeMainTab === "SCHEDULE" && (
        <ScheduleTab
          schedules={schedulesWithWeek}
          allTeamNames={allTeamNames}
          allWeeks={allWeeks}
          isAdmin={isAdmin}
          onResetSchedules={handleForceResetSchedules}
          onSelectMatch={(m) => setActiveReportMatch(m)}
          selectedGroupFilter={selectedGroupFilter}
          setSelectedGroupFilter={setSelectedGroupFilter}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
        />
      )}

      {activeMainTab === "STANDING" && <StandingTab standings={standings} />}

      {activeMainTab === "PLAYOFF" && <PlayoffTab />}

      {/* Modal Popup Match Report */}
      {activeReportMatch && (
        <MatchReportModal
          match={activeReportMatch}
          weekNumber={getMatchWeekNumber(activeReportMatch.matchDate)}
          onClose={() => setActiveReportMatch(null)}
        />
      )}
    </div>
  );
}
