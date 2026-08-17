"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchScheduleItem, DIVISION_MAP } from "@/app/tournament/_library";
import { ScheduleFilter } from "./schedule/schedule-filter";
import { ScheduleCard } from "./schedule/schedule-card";

export interface ScheduleTabProps {
  schedules: MatchScheduleItem[];
  allTeamNames: string[];
  allWeeks: number[];
  isAdmin: boolean;
  onResetSchedules: () => void;
  onSelectMatch: (match: MatchScheduleItem) => void;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  setSelectedGroupFilter: (v: "ALL" | "Group A" | "Group B") => void;
  groupAName?: string;
  groupBName?: string;
  defaultWeek?: number;
}

export function ScheduleTab({
  schedules = [],
  allTeamNames = [],
  allWeeks = [],
  isAdmin,
  onResetSchedules,
  onSelectMatch,
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
  defaultWeek = 1,
}: ScheduleTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const groupQuery = searchParams.get("group");
  const selectedGroupFilter: "ALL" | "Group A" | "Group B" =
    groupQuery === "A" ? "Group A" : groupQuery === "B" ? "Group B" : "ALL";

  const handleGroupChange = (groupVal: "ALL" | "Group A" | "Group B") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "schedule");
    if (groupVal === "Group A") params.set("group", "A");
    else if (groupVal === "Group B") params.set("group", "B");
    else params.delete("group");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const availableWeeks = useMemo(() => {
    const allWeekNumbers = Array.from(
      new Set([...schedules.map((s) => s.weekNumber || 1), ...allWeeks])
    ).sort((a, b) => a - b);

    if (isAdmin) return allWeekNumbers.length > 0 ? allWeekNumbers : [1];

    const activeWeekNum = typeof defaultWeek === "number" && defaultWeek > 0 ? defaultWeek : 1;
    const restrictedWeeks = allWeekNumbers.filter((w) => w <= activeWeekNum);
    return restrictedWeeks.length > 0 ? restrictedWeeks : [1];
  }, [schedules, allWeeks, defaultWeek, isAdmin]);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | "ALL">(defaultWeek);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  useEffect(() => {
    if (typeof defaultWeek === "number" && defaultWeek > 0) {
      setSelectedWeekFilter(defaultWeek);
    }
  }, [defaultWeek]);

  const isFilterActive = useMemo(() => {
    return (
      selectedWeekFilter !== defaultWeek ||
      selectedGroupFilter !== "ALL" ||
      selectedTeamFilter !== "ALL"
    );
  }, [selectedWeekFilter, selectedGroupFilter, selectedTeamFilter, defaultWeek]);

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((m) => {
        const mWeek = m.weekNumber || 1;

        if (selectedWeekFilter === "ALL") {
          if (!isAdmin && mWeek > defaultWeek) return false;
        } else if (mWeek !== selectedWeekFilter) {
          return false;
        }

        if (selectedGroupFilter !== "ALL") {
          const isGroupAMatch = m.groupName === "Group A" || m.groupName === groupAName;
          const isGroupBMatch = m.groupName === "Group B" || m.groupName === groupBName;
          if (selectedGroupFilter === "Group A" && !isGroupAMatch) return false;
          if (selectedGroupFilter === "Group B" && !isGroupBMatch) return false;
        }

        if (
          selectedTeamFilter !== "ALL" &&
          m.teamAName !== selectedTeamFilter &&
          m.teamBName !== selectedTeamFilter
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
        const timeB = b.matchDate ? new Date(b.matchDate).getTime() : 0;
        return timeA - timeB;
      });
  }, [
    schedules,
    selectedWeekFilter,
    selectedGroupFilter,
    selectedTeamFilter,
    defaultWeek,
    isAdmin,
    groupAName,
    groupBName,
  ]);

  const groupedByWeek = useMemo(() => {
    const map = new Map<number, MatchScheduleItem[]>();
    filteredSchedules.forEach((m) => {
      const w = m.weekNumber || 1;
      if (!map.has(w)) map.set(w, []);
      map.get(w)!.push(m);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filteredSchedules]);

  const handleResetFilters = () => {
    setSelectedWeekFilter(defaultWeek);
    setSelectedTeamFilter("ALL");
    handleGroupChange("ALL");
  };

  return (
    <div className="space-y-4">
      {/* SUB-KOMPONEN FILTER */}
      <ScheduleFilter
        selectedGroupFilter={selectedGroupFilter}
        onGroupChange={handleGroupChange}
        groupAName={groupAName}
        groupBName={groupBName}
        selectedTeamFilter={selectedTeamFilter}
        onTeamChange={setSelectedTeamFilter}
        allTeamNames={allTeamNames}
        selectedWeekFilter={selectedWeekFilter}
        onWeekChange={setSelectedWeekFilter}
        availableWeeks={availableWeeks}
        isFilterActive={isFilterActive}
        onReset={handleResetFilters}
        isAdmin={isAdmin}
        onSyncSchedules={onResetSchedules}
      />

      {/* LIST KARTU JADWAL */}
      {groupedByWeek.length === 0 ? (
        <div className="p-8 text-center text-[11px] font-semibold text-muted-foreground bg-card border border-border rounded-2xl">
          Tidak ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        groupedByWeek.map(([weekNum, matches]) => (
          <div key={weekNum} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-primary tracking-wider">
                WEEK {weekNum}
              </span>
              <div className="h-[1px] flex-1 bg-border/60"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matches.map((m) => (
                <ScheduleCard
                  key={m.id}
                  match={m}
                  groupAName={groupAName}
                  groupBName={groupBName}
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
