"use client";

import { MatchReportsView, ScheduleItem } from "./_components/match-reports-view";
import { PowerRankingView } from "./_components/power-ranking-view";
import { AnalyticsFilter } from "./_components/analytics-filter";
import { MatchReportData, TeamRosterData, FreeDuelistRecord } from "./_library/power-ranking";
import { useAnalyticsFilters } from "./use-analytics-filters";

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
  const {
    currentTab,
    selectedGroup,
    stageScope,
    selectedTeam,
    selectedWeek,
    selectedMatchId,
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
    handleReset,
  } = useAnalyticsFilters({
    schedules,
    reports,
    teams,
    maxActiveWeek,
  });

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
