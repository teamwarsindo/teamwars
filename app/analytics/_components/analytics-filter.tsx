"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
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

  // 1. Sesuaikan Opsi Week yang muncul di Dropdown berdasarkan Stage
  const dynamicWeeks = useMemo(() => {
    if (mode === "power-ranking") {
      if (stageScope === "PLAYOFF_ONLY") {
        return availableWeeks.filter((w) => w >= TOURNAMENT_RULES.PLAYOFF_START_WEEK);
      }
      if (stageScope === "GROUP_ONLY") {
        return availableWeeks.filter((w) => w < TOURNAMENT_RULES.PLAYOFF_START_WEEK);
      }
    }
    return availableWeeks;
  }, [mode, stageScope, availableWeeks]);

  // 2. Filter Tim yang Valid & Tidak Pernah Kosong
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

        // Ambil tim dari jadwal grup atau fallback ke atribut grup tim
        list = list.filter(
          (t) => groupTeamNames.has(t.name.toLowerCase()) || Boolean(t.groupName)
        );
      }

      // Jika user memilih pekan tertentu dalam power ranking
      if (selectedWeek !== "ALL") {
        const weekTeamNames = new Set<string>();
        allSchedules.forEach((m) => {
          if (Number(m.weekNumber) === Number(selectedWeek)) {
            if (m.teamAName) weekTeamNames.add(m.teamAName.toLowerCase());
            if (m.teamBName) weekTeamNames.add(m.teamBName.toLowerCase());
          }
        });
        if (weekTeamNames.size > 0) {
          list = list.filter((t) => weekTeamNames.has(t.name.toLowerCase()));
        }
      }
    } else {
      // Mode Reports
      if (!isPlayoffWeek && selectedGroup !== "ALL") {
        list = list.filter((t) => !t.groupName || t.groupName === selectedGroup);
      }

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
  }, [teams, mode, stageScope, selectedGroup, selectedWeek, isPlayoffWeek, allSchedules]);

  // Reset otomatis jika tim terpilih tidak ada di list aktif
  useEffect(() => {
    if (selectedTeam && filteredTeams.length > 0) {
      const exists = filteredTeams.some(
        (t) => t.name.toLowerCase() === selectedTeam.toLowerCase()
      );
      if (!exists) {
        onTeamChange("");
      }
    }
  }, [filteredTeams, selectedTeam, onTeamChange]);

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
    const isTournamentInPlayoff = maxActiveWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;
    if (!isTournamentInPlayoff && targetScope === "GROUP_ONLY") return;

    if (stageScope === targetScope) {
      onStageScopeChange("ALL");
    } else {
      onStageScopeChange(targetScope);
    }
  };

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      {/* 1. Baris Toggle */}
      <FilterGroupToggle
        mode={mode}
        selectedGroup={selectedGroup}
        stageScope={stageScope}
        currentTournamentWeek={maxActiveWeek}
        selectedWeek={selectedWeek}
        isPlayoffWeek={isPlayoffWeek}
        onToggleGroup={handleToggleGroup}
        onToggleStageScope={handleToggleStageScope}
      />

      {/* 2. Baris Tim & Week Dropdown + Reset */}
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

      {/* 3. Baris Match Dropdown (Mode Reports) */}
      {mode === "reports" && onMatchChange && (
        <FilterMatchDropdown
          isOpen={openDropdown === "match"}
          onToggle={() => setOpenDropdown(openDropdown === "match" ? null : "match")}
          matchesInView={matchesInView}
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
