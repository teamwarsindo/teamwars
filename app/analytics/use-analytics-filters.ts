"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { StageScopeType, AnalyticsFilterMatchItem } from "./_components/analytics-filter";
import { MatchReportData, TeamRosterData } from "./_library/power-ranking";
import { ScheduleItem } from "./_components/match-reports-view";
import { buildAllTeamsList, matchScheduleFilter } from "./_library/filter-utils";

interface UseAnalyticsFiltersProps {
  schedules: ScheduleItem[];
  reports: MatchReportData[];
  teams: TeamRosterData[];
  maxActiveWeek: number;
}

export function useAnalyticsFilters({
  schedules,
  reports,
  teams,
  maxActiveWeek,
}: UseAnalyticsFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab: "reports" | "power-ranking" =
    searchParams.get("tab") === "power-ranking" ? "power-ranking" : "reports";
  const stageParam = searchParams.get("stage");
  const selectedMatchId = searchParams.get("match") || "";
  const teamParam = searchParams.get("team") || "";
  const weekParam = searchParams.get("week");

  // Normalisasi & Deduplikasi Daftar Tim menggunakan helper
  const allTeamsList = useMemo(() => {
    return buildAllTeamsList(teams, schedules);
  }, [teams, schedules]);

  const initialTeamName = useMemo(() => {
    if (!teamParam) return "";
    const found = allTeamsList.find(
      (t) =>
        t.slug.toLowerCase() === teamParam.toLowerCase() ||
        t.name.toLowerCase() === teamParam.toLowerCase()
    );
    return found ? found.name : teamParam;
  }, [teamParam, allTeamsList]);

  // Default week: di tab reports default adalah "ALL", di power-ranking default adalah maxActiveWeek
  const initialWeek: number | "ALL" = useMemo(() => {
    if (weekParam === "ALL") return "ALL";
    if (weekParam && !isNaN(Number(weekParam))) {
      return Math.min(Number(weekParam), maxActiveWeek);
    }
    return currentTab === "reports" ? "ALL" : maxActiveWeek;
  }, [weekParam, maxActiveWeek, currentTab]);

  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamName);
  const [selectedWeek, setSelectedWeek] = useState<number | "ALL">(initialWeek);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isSelectedWeekGroup =
    typeof selectedWeek === "number" && selectedWeek < TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  const initialStageScope: StageScopeType = useMemo(() => {
    if (isSelectedWeekGroup) return "GROUP_ONLY";
    if (stageParam === "playoff") return "PLAYOFF_ONLY";
    if (stageParam === "group") return "GROUP_ONLY";
    return "ALL";
  }, [stageParam, isSelectedWeekGroup]);

  const [stageScope, setStageScope] = useState<StageScopeType>(initialStageScope);

  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

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

  useEffect(() => {
    if (isSelectedWeekGroup) {
      setStageScope("GROUP_ONLY");
    } else {
      if (stageParam === "playoff") setStageScope("PLAYOFF_ONLY");
      else if (stageParam === "group") setStageScope("GROUP_ONLY");
      else setStageScope("ALL");
    }
  }, [isSelectedWeekGroup, stageParam]);

  useEffect(() => {
    if (currentTab === "power-ranking" && selectedWeek === "ALL") {
      setSelectedWeek(maxActiveWeek);
    }
  }, [currentTab, selectedWeek, maxActiveWeek]);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeek }, (_, i) => i + 1);
  }, [maxActiveWeek]);

  const handleGroupChange = (g: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    setSelectedGroup(g);
    setSearchQuery("");
    updateUrlParams({ match: null });
  };

  const handleStageScopeChange = (nextScope: StageScopeType) => {
    if (isSelectedWeekGroup && nextScope === "ALL") {
      return;
    }

    setStageScope(nextScope);

    const stageVal =
      nextScope === "PLAYOFF_ONLY" ? "playoff" : nextScope === "GROUP_ONLY" ? "group" : null;

    updateUrlParams({
      stage: stageVal,
    });
  };

  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    setSearchQuery("");
    const targetTeam = allTeamsList.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
    const teamSlug = targetTeam?.slug || (teamName ? teamName.toLowerCase().replace(/\s+/g, "-") : null);

    updateUrlParams({
      team: teamSlug,
      match: null,
    });
  };

  const handleWeekChange = (w: number | "ALL") => {
    setSelectedWeek(w);
    setSearchQuery("");
    let updatedStageScope = stageScope;

    if (typeof w === "number") {
      if (w < TOURNAMENT_RULES.PLAYOFF_START_WEEK) {
        updatedStageScope = "GROUP_ONLY";
        setStageScope("GROUP_ONLY");
      }
    }

    const stageVal =
      updatedStageScope === "PLAYOFF_ONLY"
        ? "playoff"
        : updatedStageScope === "GROUP_ONLY"
        ? "group"
        : null;

    const isDefaultWeek = currentTab === "reports" ? w === "ALL" : w === maxActiveWeek;

    updateUrlParams({
      week: isDefaultWeek ? null : String(w),
      stage: stageVal,
      match: null,
    });
  };

  const handleTabChange = (tabKey: "reports" | "power-ranking") => {
    const nextWeek = tabKey === "power-ranking" && selectedWeek === "ALL" ? maxActiveWeek : selectedWeek;
    if (nextWeek !== selectedWeek) setSelectedWeek(nextWeek);
    setSearchQuery("");

    const isDefaultWeek = tabKey === "reports" ? nextWeek === "ALL" : nextWeek === maxActiveWeek;

    updateUrlParams({
      tab: tabKey,
      week: isDefaultWeek ? null : String(nextWeek),
      match: tabKey !== "reports" ? null : selectedMatchId || null,
      stage:
        tabKey === "power-ranking" && stageScope !== "ALL"
          ? stageScope === "PLAYOFF_ONLY"
            ? "playoff"
            : "group"
          : null,
    });
  };

  const handleMatchChange = (matchId: string) => {
    setSearchQuery("");
    updateUrlParams({
      tab: "reports",
      match: matchId,
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const isFilterActive =
    (currentTab === "reports" && selectedWeek !== "ALL") ||
    (currentTab === "power-ranking" && (!isSelectedWeekGroup && stageScope !== "ALL")) ||
    selectedTeam !== "" ||
    (currentTab === "power-ranking" && selectedWeek !== maxActiveWeek) ||
    Boolean(selectedMatchId) ||
    Boolean(teamParam) ||
    Boolean(searchQuery);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTeam("");
    setSelectedWeek(currentTab === "reports" ? "ALL" : maxActiveWeek);
    setSearchQuery("");
    const defaultScope = maxActiveWeek < TOURNAMENT_RULES.PLAYOFF_START_WEEK ? "GROUP_ONLY" : "ALL";
    setStageScope(defaultScope);

    updateUrlParams({
      team: null,
      week: null,
      match: null,
      stage: null,
    });
  };

  const reportsMap = useMemo(() => {
    const map = new Map<string, any>();
    reports.forEach((r: any) => {
      const idKey = String(r.id || r.matchId || "");
      if (idKey) map.set(idKey, r);
    });
    return map;
  }, [reports]);

  const matchesInView: AnalyticsFilterMatchItem[] = useMemo(() => {
    return schedules.filter((schedule) =>
      matchScheduleFilter({
        schedule,
        currentTab,
        selectedGroup,
        selectedWeek,
        selectedTeam,
        searchQuery,
        reportsMap,
      })
    );
  }, [schedules, currentTab, selectedGroup, selectedWeek, selectedTeam, searchQuery, reportsMap]);

  useEffect(() => {
    if (currentTab === "reports" && matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId, currentTab]);

  const filteredReportsForPowerRanking = useMemo(() => {
    if (stageScope === "GROUP_ONLY") {
      return reports.filter((r) => Number(r.week) < TOURNAMENT_RULES.PLAYOFF_START_WEEK);
    }
    if (stageScope === "PLAYOFF_ONLY") {
      return reports.filter((r) => Number(r.week) >= TOURNAMENT_RULES.PLAYOFF_START_WEEK);
    }
    return reports;
  }, [reports, stageScope]);

  return {
    currentTab,
    selectedGroup,
    stageScope,
    selectedTeam,
    selectedWeek,
    selectedMatchId,
    searchQuery,
    allTeamsList,
    availableWeeks,
    isFilterActive,
    matchesInView,
    filteredReportsForPowerRanking,
    handleTabChange,
    handleGroupChange,
    handleStageScopeChange,
    handleTeamChange,
    handleWeekChange,
    handleMatchChange,
    handleSearchChange,
    handleReset,
  };
}
