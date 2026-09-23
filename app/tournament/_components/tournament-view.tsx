"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  TeamStandingItem,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { ScheduleTab } from "./schedule-tab";
import { StandingTab } from "./standing-tab";
import { PlayoffTab } from "./playoff-tab";
import { DivisionFilterType } from "./tournament-filter";
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
    const params = new URLSearchParams(searchParams.toString());

    if (tabKey === "SCHEDULE") {
      params.set("tab", "schedule");
    } else if (tabKey === "STANDINGS") {
      params.set("tab", "standings");
      params.delete("view");
    } else {
      params.set("tab", "playoff");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [standings, setStandings] = useState<TeamStandingItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [playoffData, setPlayoffData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportMatch, setActiveReportMatch] = useState<MatchScheduleItem | null>(null);

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const isPlayoffWeek = useMemo(
    () => currentWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK,
    [currentWeek]
  );

  const fetchTournamentData = async () => {
    try {
      const [resTourney, resPlayoff] = await Promise.all([
        fetch("/api/tournament"),
        fetch("/api/tournament/playoff"),
      ]);

      const data = await resTourney.json();
      const playoffRes = await resPlayoff.json();

      if (data) {
        setSchedules(data.schedules || []);
        setStandings(data.standings || []);
        setMasterTeams(data.masterTeams || []);

        if (activeReportMatch) {
          const updatedActive = (data.schedules || []).find(
            (m: MatchScheduleItem) => m.id === activeReportMatch.id
          );
          if (updatedActive) setActiveReportMatch(updatedActive);
        }
      }

      if (playoffRes && playoffRes.success) {
        setPlayoffData(playoffRes.playoffData || null);
      } else if (data?.playoffData) {
        setPlayoffData(data.playoffData);
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

  const handleLockPlayoff = async () => {
    if (!isAdmin) {
      Swal.fire("Akses Ditolak", "Anda harus login sebagai admin untuk mengunci playoff.", "error");
      return;
    }

    const regularMatches = schedules.filter(
      (m: any) =>
        !m.id.startsWith("match-po-") &&
        Number(m.weekNumber || 1) < TOURNAMENT_RULES.PLAYOFF_START_WEEK
    );
    const unfinished = regularMatches.filter((m) => !m.isFinished);

    if (regularMatches.length === 0 || unfinished.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Pertandingan Belum Selesai",
        text: `Masih ada ${unfinished.length} match babak reguler yang belum selesai (isFinished: false).`,
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Kunci Tim & Buat Jadwal Playoff?",
      text: "Daftar tim yang lolos akan dikunci secara resmi dan jadwal babak playoff akan otomatis dibuat ke sistem.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Eksekusi",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
    });

    if (!confirm.isConfirmed) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/tournament/playoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOCK_AND_GENERATE" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses playoff");

      if (json.playoffData || json.data) {
        setPlayoffData(json.playoffData || json.data);
      }
      if (json.schedules) {
        setSchedules(json.schedules);
      }

      await fetchTournamentData();
      Swal.fire("Berhasil!", "Data playoff resmi telah dikunci dan jadwal berhasil dibuat.", "success");
    } catch (err: any) {
      Swal.fire("Gagal!", err.message || "Terjadi kesalahan sistem.", "error");
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

  // Filter week agar tidak membocorkan match pekan masa depan bagi user biasa
  const allWeeks = Array.from(
    new Set([...schedules.map((m) => m.weekNumber || 1), currentWeek])
  )
    .filter((w) => (isAdmin ? true : w <= currentWeek))
    .sort((a, b) => a - b);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4">
      {/* 3 TAB NAVIGASI UTAMA */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xl mx-auto">
        {[
          { key: "SCHEDULE", label: "Schedule" },
          { key: "STANDINGS", label: "Standing" },
          { key: "PLAYOFF", label: "Playoff" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as any)}
            className={`min-h-[42px] flex items-center justify-center rounded-2xl py-2 px-3 text-center text-xs sm:text-sm font-bold transition-all cursor-pointer truncate ${
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
          playoffData={playoffData}
          isAdmin={isAdmin}
          onLockPlayoff={handleLockPlayoff}
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
