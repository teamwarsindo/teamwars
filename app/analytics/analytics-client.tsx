"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DIVISION_MAP } from "@/app/tournament/_library";
import { MatchReportsView, ScheduleItem } from "./_components/match-reports-view";
import { PowerRankingView } from "./_components/power-ranking-view";
import { AnalyticsFilter, AnalyticsFilterMatchItem } from "./_components/analytics-filter";
import { MatchReportData, TeamRosterData, FreeDuelistRecord } from "./_library/power-ranking";

interface AnalyticsClientContentProps {
  schedules: ScheduleItem[];
  reports?: MatchReportData[];
  teams?: TeamRosterData[];
  freeDuelists?: FreeDuelistRecord[];
  maxActiveWeek?: number;
}

export default function AnalyticsClientContent({
  schedules = [],
  reports = [],
  teams = [],
  freeDuelists = [],
  maxActiveWeek = 1,
}: AnalyticsClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") === "power-ranking" ? "power-ranking" : "reports";
  const selectedMatchId = searchParams.get("match") || "";
  const teamParam = searchParams.get("team") || "";

  // Ekstraksi Tim Terpadu: Sertakan Logo Tim & Slug Resmi
  const allTeamsList = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; groupName: string; logo?: string }>();

    teams.forEach((t) => {
      if (t.name) {
        map.set(t.name.toLowerCase(), {
          name: t.name,
          slug: t.slug || t.name.toLowerCase().replace(/\s+/g, "-"),
          groupName: t.groupName || "",
          logo: t.logo,
        });
      }
    });

    schedules.forEach((s) => {
      if (s.teamAName && !map.has(s.teamAName.toLowerCase())) {
        map.set(s.teamAName.toLowerCase(), {
          name: s.teamAName,
          slug: s.teamAName.toLowerCase().replace(/\s+/g, "-"),
          groupName: s.groupName || "",
          logo: s.teamALogo,
        });
      }
      if (s.teamBName && !map.has(s.teamBName.toLowerCase())) {
        map.set(s.teamBName.toLowerCase(), {
          name: s.teamBName,
          slug: s.teamBName.toLowerCase().replace(/\s+/g, "-"),
          groupName: s.groupName || "",
          logo: s.teamBLogo,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, teams]);

  // Resolusi nama tim awal dari query parameter ?team=[slug-atau-nama]
  const initialTeamName = useMemo(() => {
    if (!teamParam) return "";
    const found = allTeamsList.find(
      (t) =>
        t.slug.toLowerCase() === teamParam.toLowerCase() ||
        t.name.toLowerCase() === teamParam.toLowerCase()
    );
    return found ? found.name : teamParam;
  }, [teamParam, allTeamsList]);

  // Filter State
  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamName);
  const [selectedWeek, setSelectedWeek] = useState<number | "">(maxActiveWeek);

  // Sinkronisasi state saat tombol Back / Forward browser ditekan
  useEffect(() => {
    if (teamParam) {
      const found = allTeamsList.find(
        (t) =>
          t.slug.toLowerCase() === teamParam.toLowerCase() ||
          t.name.toLowerCase() === teamParam.toLowerCase()
      );
      setSelectedTeam(found ? found.name : teamParam);
    } else {
      setSelectedTeam("");
    }
  }, [teamParam, allTeamsList]);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeek }, (_, i) => i + 1);
  }, [maxActiveWeek]);

  // Helper pembaruan URL query param
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const handleGroupChange = (g: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    setSelectedGroup(g);
    updateUrlParams({ match: null });
  };

  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);

    // Cari slug dari tim yang dipilih
    const targetTeam = allTeamsList.find(
      (t) => t.name.toLowerCase() === teamName.toLowerCase()
    );
    const teamSlug = targetTeam?.slug || (teamName ? teamName.toLowerCase().replace(/\s+/g, "-") : null);

    // Simpan parameter team=slug ke URL dan bersihkan match param lama
    updateUrlParams({
      team: teamSlug,
      match: null,
    });
  };

  const handleWeekChange = (w: number | "") => {
    setSelectedWeek(w);
    updateUrlParams({ match: null });
  };

  const handleTabChange = (tabKey: "reports" | "power-ranking") => {
    updateUrlParams({
      tab: tabKey,
      match: tabKey !== "reports" ? null : selectedMatchId || null,
    });
  };

  const handleMatchChange = (matchId: string) => {
    updateUrlParams({
      tab: "reports",
      match: matchId,
    });
  };

  const isFilterActive =
    selectedGroup !== "ALL" ||
    selectedTeam !== "" ||
    selectedWeek !== maxActiveWeek ||
    Boolean(selectedMatchId) ||
    Boolean(teamParam);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTeam("");
    setSelectedWeek(maxActiveWeek);
    updateUrlParams({
      team: null,
      match: null,
    });
  };

  // Filter daftar jadwal untuk Match Reports
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

  // Otomatis pilih laga jika hasil filter menyisakan 1 opsi (di tab Match Reports)
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
        maxActiveWeek={maxActiveWeek}
        selectedMatchId={selectedMatchId}
        onMatchChange={handleMatchChange}
        matchesInView={matchesInView}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* 3. Konten View Sesuai Tab */}
      {currentTab === "reports" ? (
        <MatchReportsView
          schedules={schedules}
          selectedMatchId={selectedMatchId}
        />
      ) : (
        <PowerRankingView
          reports={reports}
          teams={teams}
          schedules={schedules}
          freeDuelists={freeDuelists}
          maxActiveWeek={maxActiveWeek}
          selectedGroup={selectedGroup}
          selectedTeam={selectedTeam}
          selectedWeek={selectedWeek}
        />
      )}
    </div>
  );
          }
                                 
