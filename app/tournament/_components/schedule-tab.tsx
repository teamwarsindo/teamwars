"use client";

import { useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { TournamentFilter, DivisionFilterType } from "./tournament-filter";
import { ScheduleCard } from "./schedule-card";

export interface ScheduleTabProps {
  schedules: MatchScheduleItem[];
  allTeamNames: string[];
  allWeeks: number[];
  isAdmin: boolean;
  onResetSchedules: () => void;
  onSelectMatch: (match: MatchScheduleItem) => void;
  defaultWeek?: number;
}

export function ScheduleTab({
  schedules = [],
  allTeamNames = [],
  allWeeks = [],
  isAdmin,
  onResetSchedules,
  onSelectMatch,
  defaultWeek = 1,
}: ScheduleTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sinkronisasi Filter dari URL Query Params
  const rawGroupParam = searchParams.get("group");
  const selectedGroup: DivisionFilterType =
    rawGroupParam === "group_a"
      ? DIVISION_MAP.GROUP_A
      : rawGroupParam === "group_b"
      ? DIVISION_MAP.GROUP_B
      : "ALL";

  const rawWeekParam = searchParams.get("week");
  const selectedWeekFilter: number | "ALL" =
    rawWeekParam === "ALL"
      ? "ALL"
      : rawWeekParam
      ? Number(rawWeekParam)
      : defaultWeek;

  const selectedTeamFilter = searchParams.get("team") || "ALL";

  const availableWeeks = useMemo(() => {
    const allWeekNumbers = Array.from(
      new Set([...schedules.map((s) => s.weekNumber || 1), ...allWeeks])
    ).sort((a, b) => a - b);

    if (isAdmin) return allWeekNumbers.length > 0 ? allWeekNumbers : [1];

    const activeWeekNum = typeof defaultWeek === "number" && defaultWeek > 0 ? defaultWeek : 1;
    const restrictedWeeks = allWeekNumbers.filter((w) => w <= activeWeekNum);
    return restrictedWeeks.length > 0 ? restrictedWeeks : [1];
  }, [schedules, allWeeks, defaultWeek, isAdmin]);

  const updateURL = (newGroup: DivisionFilterType, newWeek: number | "ALL", newTeam: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "schedule");

    if (newGroup === DIVISION_MAP.GROUP_A) params.set("group", "group_a");
    else if (newGroup === DIVISION_MAP.GROUP_B) params.set("group", "group_b");
    else params.delete("group");

    if (newWeek !== defaultWeek) params.set("week", newWeek.toString());
    else params.delete("week");

    if (newTeam !== "ALL") params.set("team", newTeam);
    else params.delete("team");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleGroupChange = (val: DivisionFilterType) => {
    updateURL(val, selectedWeekFilter, selectedTeamFilter);
  };

  const handleWeekChange = (val: number | "ALL") => {
    updateURL(selectedGroup, val, selectedTeamFilter);
  };

  const handleTeamChange = (val: string) => {
    updateURL(selectedGroup, selectedWeekFilter, val);
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "schedule");
    params.delete("group");
    params.delete("week");
    params.delete("team");
    params.delete("wildcard");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isFilterActive = useMemo(() => {
    return (
      selectedWeekFilter !== defaultWeek ||
      selectedGroup !== "ALL" ||
      selectedTeamFilter !== "ALL"
    );
  }, [selectedWeekFilter, selectedGroup, selectedTeamFilter, defaultWeek]);

  const filteredSchedules = useMemo(() => {
    const cleanTeam = selectedTeamFilter.toLowerCase().trim();
    const cleanA = DIVISION_MAP.GROUP_A.toLowerCase().trim();
    const cleanB = DIVISION_MAP.GROUP_B.toLowerCase().trim();

    return schedules
      .filter((m) => {
        if (!m) return false;
        const mWeek = m.weekNumber || 1;

        if (selectedWeekFilter !== "ALL" && mWeek !== selectedWeekFilter) {
          return false;
        }

        if (selectedGroup !== "ALL") {
          const matchGroupName = (m.groupName || "").toLowerCase().trim();
          const isA = matchGroupName === cleanA || matchGroupName === "group a" || matchGroupName === "divisi a";
          const isB = matchGroupName === cleanB || matchGroupName === "group b" || matchGroupName === "divisi b";

          if (selectedGroup === DIVISION_MAP.GROUP_A && !isA) return false;
          if (selectedGroup === DIVISION_MAP.GROUP_B && !isB) return false;
        }

        if (cleanTeam !== "all") {
          const aName = (m.teamAName || "").toLowerCase().trim();
          const bName = (m.teamBName || "").toLowerCase().trim();
          if (aName !== cleanTeam && bName !== cleanTeam) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
        const timeB = b.matchDate ? new Date(b.matchDate).getTime() : 0;
        return timeA - timeB;
      });
  }, [schedules, selectedWeekFilter, selectedGroup, selectedTeamFilter]);

  const groupedByWeek = useMemo(() => {
    const map = new Map<number, MatchScheduleItem[]>();
    filteredSchedules.forEach((m) => {
      const w = m.weekNumber || 1;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(m);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filteredSchedules]);

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* 1. FILTER BERSAMA */}
      <TournamentFilter
        mode="schedule"
        selectedGroup={selectedGroup}
        onGroupChange={handleGroupChange}
        selectedWeek={selectedWeekFilter}
        onWeekChange={handleWeekChange}
        availableWeeks={availableWeeks}
        selectedTeam={selectedTeamFilter}
        onTeamChange={handleTeamChange}
        allTeamNames={allTeamNames}
        isFilterActive={isFilterActive}
        onReset={handleResetFilters}
        isAdmin={isAdmin}
        onSyncSchedules={onResetSchedules}
      />

      {/* 2. LIST MATCH CARD */}
      {groupedByWeek.length === 0 ? (
        <div className="p-8 text-center text-xs md:text-sm font-semibold text-muted-foreground bg-card border border-border rounded-2xl">
          Tidak ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        groupedByWeek.map(([weekNum, matches]) => (
          <div key={weekNum} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs md:text-sm font-black uppercase text-primary tracking-wider">
                WEEK {weekNum}
              </span>
              <div className="h-[1px] flex-1 bg-border/60"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {matches.map((m) => (
                <ScheduleCard
                  key={m.id}
                  match={m}
                  groupAName={DIVISION_MAP.GROUP_A}
                  groupBName={DIVISION_MAP.GROUP_B}
                  onSelect={onSelectMatch}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
