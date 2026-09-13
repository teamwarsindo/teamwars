"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DIVISION_MAP } from "@/app/tournament/_library";
import { MatchReportsView, ScheduleItem } from "./_components/match-reports-view";
import { PowerRankingView } from "./_components/power-ranking-view";
import { AnalyticsFilter, AnalyticsFilterMatchItem } from "./_components/analytics-filter";
import { MatchReportData, TeamRosterData } from "./_library/power-ranking";

interface AnalyticsClientContentProps {
  schedules: ScheduleItem[];
  teams?: TeamRosterData[];
  maxActiveWeek?: number;
}

export default function AnalyticsClientContent({
  schedules = [],
  teams = [],
  maxActiveWeek = 1,
}: AnalyticsClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") === "power-ranking" ? "power-ranking" : "reports";
  const selectedMatchId = searchParams.get("match") || "";

  // State sinkronisasi data laporan duel tunggal untuk seluruh analitik
  const [reports, setReports] = useState<MatchReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Shared Filters State
  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number | "">(
    currentTab === "power-ranking" ? maxActiveWeek : ""
  );

  // Ambil semua match reports sekali via API endpoint
  useEffect(() => {
    let isMounted = true;
    async function fetchAllReports() {
      try {
        setLoadingReports(true);
        const res = await fetch("/api/analytics/match-report");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && isMounted) {
          setReports(json.data);
        }
      } catch (err) {
        console.error("Gagal mengambil master reports:", err);
      } finally {
        if (isMounted) setLoadingReports(false);
      }
    }
    fetchAllReports();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeek }, (_, i) => i + 1);
  }, [maxActiveWeek]);

  const handleTabChange = (tabKey: "reports" | "power-ranking") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    if (tabKey !== "reports") params.delete("match");
    if (tabKey === "power-ranking" && selectedWeek === "") {
      setSelectedWeek(maxActiveWeek);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleMatchChange = (matchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("match", matchId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isFilterActive =
    selectedGroup !== "ALL" ||
    selectedTeam !== "" ||
    (currentTab === "power-ranking" ? selectedWeek !== maxActiveWeek : selectedWeek !== "") ||
    Boolean(selectedMatchId);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTeam("");
    setSelectedWeek(currentTab === "power-ranking" ? maxActiveWeek : "");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Filter daftar laga untuk Baris 3 Dropdown (Match Reports)
  const matchesInView: AnalyticsFilterMatchItem[] = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedGroup !== "ALL" && s.groupName !== selectedGroup) return false;
      if (selectedWeek !== "" && Number(s.weekNumber) !== Number(selectedWeek)) return false;
      if (selectedTeam !== "") {
        const teamObj = teams.find((t) => t.slug === selectedTeam || t.name === selectedTeam);
        const tName = teamObj?.name || selectedTeam;
        if (s.teamAName !== tName && s.teamBName !== tName) return false;
      }
      return true;
    });
  }, [schedules, selectedGroup, selectedWeek, selectedTeam, teams]);

  // Otomatis pilih laga jika filter hanya menghasilkan 1 opsi
  useEffect(() => {
    if (currentTab === "reports" && matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId, currentTab]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. Tab Switcher (Hanya Match Reports & Power Ranking) */}
      <div className="flex items-center justify-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange("reports")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            currentTab === "reports"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Match Reports
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("power-ranking")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            currentTab === "power-ranking"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Power Ranking
        </button>
      </div>

      {/* 2. Filter Bar Terpadu */}
      <AnalyticsFilter
        mode={currentTab}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        selectedTeam={selectedTeam}
        onTeamChange={setSelectedTeam}
        teams={teams}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        availableWeeks={availableWeeks}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* 3. Konten View */}
      {currentTab === "reports" ? (
        <MatchReportsView
          schedules={schedules}
          selectedMatchId={selectedMatchId}
        />
      ) : loadingReports ? (
        <div className="p-12 text-center text-xs font-bold text-primary animate-pulse bg-card rounded-2xl border border-border">
          Mengkalkulasi Power Ranking...
        </div>
      ) : (
        <PowerRankingView
          reports={reports}
          teams={teams}
          maxActiveWeek={maxActiveWeek}
          selectedGroup={selectedGroup}
          selectedTeam={selectedTeam}
          selectedWeek={selectedWeek}
        />
      )}
    </div>
  );
      }
