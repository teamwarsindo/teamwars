"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { formatStageName } from "@/app/tournament/_library/utils";
import { FilterGroupToggle, StageScopeType } from "./filter-group-toggle";
import { FilterTeamDropdown } from "./filter-team-dropdown";
import { FilterWeekDropdown } from "./filter-week-dropdown";
import { FilterMatchDropdown } from "./filter-match-dropdown";

export * from "./filter-group-toggle";

export interface AnalyticsFilterMatchItem {
  id: string;
  weekNumber: number | string;
  groupName?: string;
  teamAName?: string;
  teamBName?: string;
  isFinished?: boolean;
  scoreA?: number;
  scoreB?: number;
}

export interface FilterTeamItem {
  name: string;
  slug: string;
  groupName?: string;
  logo?: string;
}

export interface AnalyticsFilterProps {
  mode: "reports" | "power-ranking";
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  onGroupChange: (group: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  stageScope: StageScopeType;
  onStageScopeChange: (scope: StageScopeType) => void;
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: FilterTeamItem[];
  selectedWeek: number | "ALL";
  onWeekChange: (week: number | "ALL") => void;
  availableWeeks: number[];
  maxActiveWeek?: number;
  selectedMatchId?: string;
  onMatchChange?: (matchId: string) => void;
  matchesInView?: AnalyticsFilterMatchItem[];
  allSchedules?: AnalyticsFilterMatchItem[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isFilterActive: boolean;
  onReset: () => void;
}

export function AnalyticsFilter({
  mode,
  selectedGroup,
  onGroupChange,
  stageScope,
  onStageScopeChange,
  selectedTeam,
  onTeamChange,
  teams = [],
  selectedWeek,
  onWeekChange,
  availableWeeks = [],
  maxActiveWeek = 1,
  selectedMatchId = "",
  onMatchChange,
  matchesInView = [],
  allSchedules = [],
  searchQuery = "",
  onSearchChange,
  isFilterActive,
  onReset,
}: AnalyticsFilterProps) {
  const [openDropdown, setOpenDropdown] = useState<"team" | "week" | "match" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPlayoffWeek =
    typeof selectedWeek === "number" &&
    selectedWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  const selectedTeamHasPlayoff = useMemo(() => {
    if (!selectedTeam) return true;
    const clean = selectedTeam.toLowerCase().trim();
    return allSchedules.some(
      (m) =>
        Number(m.weekNumber) >= TOURNAMENT_RULES.PLAYOFF_START_WEEK &&
        ((m.teamAName || "").toLowerCase().trim() === clean ||
          (m.teamBName || "").toLowerCase().trim() === clean)
    );
  }, [allSchedules, selectedTeam]);

  const dynamicWeeks = useMemo(() => {
    if (mode === "power-ranking") {
      if (selectedTeam && !selectedTeamHasPlayoff) {
        return availableWeeks.filter((w) => w < TOURNAMENT_RULES.PLAYOFF_START_WEEK);
      }
      if (stageScope === "PLAYOFF_ONLY") {
        return availableWeeks.filter((w) => w >= TOURNAMENT_RULES.PLAYOFF_START_WEEK);
      }
      return availableWeeks;
    }
    return availableWeeks;
  }, [mode, stageScope, availableWeeks, selectedTeam, selectedTeamHasPlayoff]);

  const filteredTeams = useMemo(() => {
    let list = [...teams];

    if (mode === "power-ranking") {
      if (stageScope === "PLAYOFF_ONLY") {
        const playoffTeamNames = new Set<string>();
        allSchedules.forEach((m) => {
          if (Number(m.weekNumber) >= TOURNAMENT_RULES.PLAYOFF_START_WEEK) {
            if (m.teamAName) playoffTeamNames.add(m.teamAName.toLowerCase());
            if (m.teamBName) playoffTeamNames.add(m.teamBName.toLowerCase());
          }
        });
        if (playoffTeamNames.size > 0) {
          list = list.filter((t) => playoffTeamNames.has(t.name.toLowerCase()));
        }
      } else if (stageScope === "GROUP_ONLY") {
        const groupTeamNames = new Set<string>();
        allSchedules.forEach((m) => {
          if (Number(m.weekNumber) < TOURNAMENT_RULES.PLAYOFF_START_WEEK) {
            if (m.teamAName) groupTeamNames.add(m.teamAName.toLowerCase());
            if (m.teamBName) groupTeamNames.add(m.teamBName.toLowerCase());
          }
        });
        list = list.filter(
          (t) => groupTeamNames.has(t.name.toLowerCase()) || Boolean(t.groupName)
        );
      }
    } else {
      if (selectedWeek !== "ALL") {
        const activeTeamNames = new Set<string>();
        allSchedules.forEach((m) => {
          if (Number(m.weekNumber) === Number(selectedWeek)) {
            if (m.teamAName) activeTeamNames.add(m.teamAName.toLowerCase());
            if (m.teamBName) activeTeamNames.add(m.teamBName.toLowerCase());
          }
        });
        if (activeTeamNames.size > 0) {
          list = list.filter((t) => activeTeamNames.has(t.name.toLowerCase()));
        }
      }
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [teams, mode, stageScope, selectedWeek, allSchedules]);

  const formattedMatchesInView = useMemo(() => {
    return matchesInView.map((m) => ({
      ...m,
      groupName: m.groupName ? formatStageName(m.groupName) : m.groupName,
    }));
  }, [matchesInView]);

  const handleSelectTeam = (teamName: string) => {
    onTeamChange(!teamName || teamName === "ALL" ? "" : teamName);
    setOpenDropdown(null);
  };

  const handleToggleGroup = (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    if (isPlayoffWeek) return;
    if (selectedGroup === group) {
      onGroupChange("ALL");
    } else {
      onGroupChange(group);
      if (selectedTeam) {
        const currentSelected = teams.find((t) => t.name === selectedTeam);
        if (currentSelected?.groupName && currentSelected.groupName !== group) {
          onTeamChange("");
        }
      }
    }
  };

  const handleToggleStageScope = (targetScope: "GROUP_ONLY" | "PLAYOFF_ONLY") => {
    if (stageScope === targetScope) {
      onStageScopeChange("ALL");
    } else {
      onStageScopeChange(targetScope);
    }
  };

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      {/* 1. Baris Toggle (Hanya ditampilkan pada mode Power Ranking) */}
      {mode === "power-ranking" && (
        <FilterGroupToggle
          mode={mode}
          selectedGroup={selectedGroup}
          stageScope={stageScope}
          currentTournamentWeek={maxActiveWeek}
          selectedWeek={selectedWeek}
          isPlayoffWeek={isPlayoffWeek}
          selectedTeam={selectedTeam}
          selectedTeamHasPlayoff={selectedTeamHasPlayoff}
          onToggleGroup={handleToggleGroup}
          onToggleStageScope={handleToggleStageScope}
        />
      )}

      {/* 2. Universal Search Bar (Mode Reports) */}
      {mode === "reports" && onSearchChange && (
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari tim, stage (misal Play-Ins), atau ID match..."
            className="w-full rounded-xl border border-border bg-background pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. Baris Dropdown Tim & Week + Reset */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <FilterTeamDropdown
          isOpen={openDropdown === "team"}
          onToggle={() => setOpenDropdown(openDropdown === "team" ? null : "team")}
          selectedTeam={selectedTeam}
          onSelectTeam={handleSelectTeam}
          filteredTeams={filteredTeams}
          allTeams={teams}
        />

        <FilterWeekDropdown
          mode={mode}
          isOpen={openDropdown === "week"}
          onToggle={() => setOpenDropdown(openDropdown === "week" ? null : "week")}
          selectedWeek={selectedWeek}
          onSelectWeek={(w) => {
            onWeekChange(w);
            setOpenDropdown(null);
          }}
          availableWeeks={dynamicWeeks}
          isFilterActive={isFilterActive}
          onReset={onReset}
        />
      </div>

      {/* 4. Baris Match Dropdown (Mode Reports) */}
      {mode === "reports" && onMatchChange && (
        <FilterMatchDropdown
          isOpen={openDropdown === "match"}
          onToggle={() => setOpenDropdown(openDropdown === "match" ? null : "match")}
          matchesInView={formattedMatchesInView}
          selectedMatchId={selectedMatchId}
          onSelectMatch={(id) => {
            onMatchChange(id);
            setOpenDropdown(null);
          }}
        />
      )}
    </div>
  );  
}
