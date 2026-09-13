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
  reports?: MatchReportData[];
  teams?: TeamRosterData[];
  maxActiveWeek?: number;
}

export default function AnalyticsClientContent({
  schedules = [],
  reports = [],
  teams = [],
  maxActiveWeek = 1,
}: AnalyticsClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") === "power-ranking" ? "power-ranking" : "reports";
  const selectedMatchId = searchParams.get("match") || "";

  // Filter State - Keduanya default ke maxActiveWeek agar konsisten
  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number | "">(maxActiveWeek);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeek }, (_, i) => i + 1);
  }, [maxActiveWeek]);

  // Ekstraksi Tim Terpadu: Gabungan dari teams props dan schedules (jaminan tidak kosong)
  const allTeamsList = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; groupName: string }>();

    // 1. Masukkan data teams roster jika ada
    teams.forEach((t) => {
      if (t.name) {
        map.set(t.name.toLowerCase(), {
          name: t.name,
          slug: t.slug || t.name.toLowerCase().replace(/\s+/g, "-"),
          groupName: t.groupName || "",
        });
      }
    });

    // 2. Ekstrak dari jadwal pertandingan (schedules)
    schedules.forEach((s) => {
      if (s.teamAName && !map.has(s.teamAName.toLowerCase())) {
        map.set(s.teamAName.toLowerCase(), {
          name: s.teamAName,
          slug: s.teamAName.toLowerCase().replace(/\s+/g, "-"),
          groupName: s.groupName || "",
        });
      }
      if (s.teamBName && !map.has(s.teamBName.toLowerCase())) {
        map.set(s.teamBName.toLowerCase(), {
          name: s.teamBName,
          slug: s.teamBName.toLowerCase().replace(/\s+/g, "-"),
          groupName: s.groupName || "",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, teams]);

  // Hapus parameter match lama dari URL saat kriteria filter berubah
  const clearMatchParam = () => {
    if (!searchParams.get("match")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleGroupChange = (g: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    setSelectedGroup(g);
    clearMatchParam();
  };

  const handleTeamChange = (t: string) => {
    setSelectedTeam(t);
    clearMatchParam();
  };

  const handleWeekChange = (w: number | "") => {
    setSelectedWeek(w);
    clearMatchParam();
  };

  const handleTabChange = (tabKey: "reports" | "power-ranking") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    if (tabKey !== "reports") params.delete("match");
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
    selectedWeek !== maxActiveWeek ||
    Boolean(selectedMatchId);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTeam("");
    setSelectedWeek(maxActiveWeek);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("match");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Filter daftar jadwal untuk baris match di Match Reports
  const matchesInView: AnalyticsFilterMatchItem[] = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedGroup !== "ALL" && s.groupName !== selectedGroup) return false;
      if (selectedWeek !== "" && Number(s.weekNumber) !== Number(selectedWeek)) return false;
      if (selectedTeam !== "") {
        if (s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
      }
      return true;
    });
  }, [schedules, selectedGroup, selectedWeek, selectedTeam]);

  // Otomatis pilih laga jika hasil filter menyisakan 1 opsi
  useEffect(() => {
    if (currentTab === "reports" && matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId, currentTab]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. Tab Switcher */}
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
        onGroupChange={handleGroupChange}
        selectedTeam={selectedTeam}
        onTeamChange={handleTeamChange}
        teams={allTeamsList}
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
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
