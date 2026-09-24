"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { MatchReportsView, ScheduleItem } from "./_components/match-reports-view";
import { PowerRankingView } from "./_components/power-ranking-view";
import { AnalyticsFilter, AnalyticsFilterMatchItem, StageScopeType } from "./_components/analytics-filter";
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
  const stageParam = searchParams.get("stage");
  const selectedMatchId = searchParams.get("match") || "";
  const teamParam = searchParams.get("team") || "";
  const weekParam = searchParams.get("week");

  const isTournamentInPlayoff = maxActiveWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  // Ekstraksi Tim
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

  const initialTeamName = useMemo(() => {
    if (!teamParam) return "";
    const found = allTeamsList.find(
      (t) =>
        t.slug.toLowerCase() === teamParam.toLowerCase() ||
        t.name.toLowerCase() === teamParam.toLowerCase()
    );
    return found ? found.name : teamParam;
  }, [teamParam, allTeamsList]);

  // Initial stage scope dari URL
  const initialStageScope: StageScopeType = useMemo(() => {
    if (!isTournamentInPlayoff) return "GROUP_ONLY";
    if (stageParam === "playoff") return "PLAYOFF_ONLY";
    if (stageParam === "group") return "GROUP_ONLY";
    return "ALL";
  }, [isTournamentInPlayoff, stageParam]);

  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [stageScope, setStageScope] = useState<StageScopeType>(initialStageScope);
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamName);

  const initialWeek: number | "ALL" = useMemo(() => {
    if (weekParam === "ALL" && currentTab === "reports") return "ALL";
    if (weekParam && !isNaN(Number(weekParam))) {
      return Math.min(Number(weekParam), maxActiveWeek);
    }
    return maxActiveWeek;
  }, [weekParam, maxActiveWeek, currentTab]);

  const [selectedWeek, setSelectedWeek] = useState<number | "ALL">(initialWeek);

  // Sync stageScope jika stageParam berubah di URL
  useEffect(() => {
    if (!isTournamentInPlayoff) {
      setStageScope("GROUP_ONLY");
    } else if (stageParam === "playoff") {
      setStageScope("PLAYOFF_ONLY");
    } else if (stageParam === "group") {
      setStageScope("GROUP_ONLY");
    } else {
      setStageScope("ALL");
    }
  }, [stageParam, isTournamentInPlayoff]);

  // Proteksi tab power-ranking: tidak boleh "ALL"
  useEffect(() => {
    if (currentTab === "power-ranking" && selectedWeek === "ALL") {
      setSelectedWeek(maxActiveWeek);
    }
  }, [currentTab, selectedWeek, maxActiveWeek]);

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

  const handleStageScopeChange = (nextScope: StageScopeType) => {
    setStageScope(nextScope);
    const stageVal =
      nextScope === "PLAYOFF_ONLY"
        ? "playoff"
        : nextScope === "GROUP_ONLY"
        ? isTournamentInPlayoff
          ? "group"
          : null
        : null;

    updateUrlParams({
      stage: stageVal,
      team: null,
    });
  };

  const handleTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    const targetTeam = allTeamsList.find(
      (t) => t.name.toLowerCase() === teamName.toLowerCase()
    );
    const teamSlug = targetTeam?.slug || (teamName ? teamName.toLowerCase().replace(/\s+/g, "-") : null);

    updateUrlParams({
      team: teamSlug,
      match: null,
    });
  };

  const handleWeekChange = (w: number | "ALL") => {
    setSelectedWeek(w);
    updateUrlParams({
      week: w === maxActiveWeek ? null : String(w),
      match: null,
    });
  };

  const handleTabChange = (tabKey: "reports" | "power-ranking") => {
    const nextWeek = tabKey === "power-ranking" && selectedWeek === "ALL" ? maxActiveWeek : selectedWeek;
    if (nextWeek !== selectedWeek) setSelectedWeek(nextWeek);

    updateUrlParams({
      tab: tabKey,
      week: nextWeek === maxActiveWeek ? null : String(nextWeek),
      match: tabKey !== "reports" ? null : selectedMatchId || null,
      stage: tabKey === "power-ranking" && isTournamentInPlayoff && stageScope !== "ALL"
        ? stageScope === "PLAYOFF_ONLY" ? "playoff" : "group"
        : null,
    });
  };

  const handleMatchChange = (matchId: string) => {
    updateUrlParams({
      tab: "reports",
      match: matchId,
    });
  };

  const isFilterActive =
    (currentTab === "reports" && selectedGroup !== "ALL") ||
    (currentTab === "power-ranking" && isTournamentInPlayoff && stageScope !== "ALL") ||
    selectedTeam !== "" ||
    selectedWeek !== maxActiveWeek ||
    Boolean(selectedMatchId) ||
    Boolean(teamParam);

  const handleReset = () => {
    setSelectedGroup("ALL");
    setStageScope(isTournamentInPlayoff ? "ALL" : "GROUP_ONLY");
    setSelectedTeam("");
    setSelectedWeek(maxActiveWeek);
    updateUrlParams({
      team: null,
      week: null,
      match: null,
      stage: null,
    });
  };

  const matchesInView: AnalyticsFilterMatchItem[] = useMemo(() => {
    const isPlayoff =
      typeof selectedWeek === "number" &&
      selectedWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

    return schedules.filter((s) => {
      if (!isPlayoff && selectedGroup !== "ALL" && s.groupName !== selectedGroup) return false;
      if (selectedWeek !== "ALL" && Number(s.weekNumber) !== Number(selectedWeek)) return false;
      if (selectedTeam !== "") {
        if (s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
      }
      return true;
    });
  }, [schedules, selectedGroup, selectedWeek, selectedTeam]);

  useEffect(() => {
    if (currentTab === "reports" && matchesInView.length === 1 && matchesInView[0].id !== selectedMatchId) {
      handleMatchChange(matchesInView[0].id);
    }
  }, [matchesInView, selectedMatchId, currentTab]);

  // Filter reports untuk Power Ranking sesuai Stage Scope
  const filteredReportsForPowerRanking = useMemo(() => {
    if (stageScope === "GROUP_ONLY") {
      return reports.filter((r) => Number(r.week) < TOURNAMENT_RULES.PLAYOFF_START_WEEK);
    }
    if (stageScope === "PLAYOFF_ONLY") {
      return reports.filter((r) => Number(r.week) >= TOURNAMENT_RULES.PLAYOFF_START_WEEK);
    }
    return reports;
  }, [reports, stageScope]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Tab Switcher */}
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

      {/* Filter Terpadu */}
      <AnalyticsFilter
        mode={currentTab}
        selectedGroup={selectedGroup}
        onGroupChange={handleGroupChange}
        stageScope={stageScope}
        onStageScopeChange={handleStageScopeChange}
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
        allSchedules={schedules}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* Content View */}
      {currentTab === "reports" ? (
        <MatchReportsView
          schedules={schedules}
          selectedMatchId={selectedMatchId}
        />
      ) : (
        <PowerRankingView
          reports={filteredReportsForPowerRanking}
          teams={teams}
          schedules={schedules}
          freeDuelists={freeDuelists}
          maxActiveWeek={maxActiveWeek}
          selectedGroup={selectedGroup}
          selectedTeam={selectedTeam}
          selectedWeek={selectedWeek === "ALL" ? maxActiveWeek : selectedWeek}
        />
      )}
    </div>
  );
}
