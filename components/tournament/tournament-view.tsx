"use client";

import { useState, useEffect, useMemo } from "react";
import { MatchScheduleItem, TeamStandingItem } from "@/lib/types/tournament";
import { ScheduleTab } from "./schedule-tab";
import { StandingTab } from "./standing-tab";
import { PlayoffTab } from "./playoff-tab";
import { MatchReportModal } from "./match-report-modal";
import Swal from "sweetalert2";

// Helper menghitung week berjalan saat ini dari kalender server (dimulai hari Senin)
function getCurrentServerWeek(): number {
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime(); // Senin pertama
  const now = new Date().getTime();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

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
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportMatch, setActiveReportMatch] = useState<MatchScheduleItem | null>(null);

  // Ambil minggu berjalan saat ini
  const currentWeek = useMemo(() => getCurrentServerWeek(), []);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
        setMasterTeams(data.masterTeams || []);

        // Jika modal match report sedang terbuka, perbarui data match aktif yang sedang dilihat
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

  // Hitung weekNumber untuk setiap item schedule berdasarkan tanggal pertandingan
  const getMatchWeekNumber = (dateString: string) => {
    if (!dateString) return 1;
    const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
    const matchDate = new Date(dateString).getTime();
    if (isNaN(matchDate)) return 1;

    const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  const schedulesWithWeek = schedules.map((m) => ({
    ...m,
    weekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
  }));

  const allTeamNames = Array.from(new Set(standings.map((s) => s.teamName)));
  
  // Dapatkan daftar seluruh minggu yang tersedia
  const allWeeks = Array.from(
    new Set([
      ...schedulesWithWeek.map((m) => m.weekNumber),
      currentWeek,
    ])
  ).sort((a, b) => a - b);

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

      {activeMainTab === "STANDING" && (
        <StandingTab schedules={schedules} masterTeams={masterTeams} />
      )}

      {activeMainTab === "PLAYOFF" && <PlayoffTab />}

      {/* Modal Popup Match Report Read-Only untuk Publik */}
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
