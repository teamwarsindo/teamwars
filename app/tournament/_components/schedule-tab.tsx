"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  formatMatchWIB,
} from "@/lib/tournament";
import { ChevronDown, Check, RotateCcw } from "lucide-react";

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

  // Sinkronisasi group dari query URL (?tab=schedule&group=A | B)
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

  const availableWeeksFilter = useMemo(() => {
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

  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

  const teamRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof defaultWeek === "number" && defaultWeek > 0) {
      setSelectedWeekFilter(defaultWeek);
    }
  }, [defaultWeek]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
      if (weekRef.current && !weekRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFilterActive = useMemo(() => {
    return (
      selectedWeekFilter !== defaultWeek ||
      selectedGroupFilter !== "ALL" ||
      selectedTeamFilter !== "ALL"
    );
  }, [selectedWeekFilter, selectedGroupFilter, selectedTeamFilter, defaultWeek]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((m) => {
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

  const renderMatchCard = (match: MatchScheduleItem) => {
    const isGroupA = match.groupName === "Group A" || match.groupName === groupAName;
    const groupDisplayName = isGroupA ? groupAName : groupBName;

    return (
      <div
        key={match.id}
        onClick={() => onSelectMatch(match)}
        className={`border transition p-3 rounded-2xl shadow-sm cursor-pointer space-y-2.5 ${
          isGroupA
            ? "bg-sky-500/5 border-sky-500/40 hover:border-sky-500"
            : "bg-amber-500/5 border-amber-500/40 hover:border-amber-500"
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span
            className={`text-[10px] font-black uppercase ${
              isGroupA ? "text-sky-500" : "text-amber-500"
            }`}
          >
            {groupDisplayName}
          </span>
          <span className="text-muted-foreground">{formatMatchWIB(match.matchDate)}</span>
        </div>

        <div className="grid grid-cols-7 items-center gap-1 text-center">
          <div className="col-span-3 flex items-center justify-end gap-1.5 min-w-0 pr-1">
            <span className="font-bold text-[11px] text-foreground break-words text-right leading-snug">
              {match.teamAName}
            </span>
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
          </div>

          <div className="col-span-1 flex justify-center">
            {match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0 ? (
              <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs whitespace-nowrap">
                {match.scoreA} - {match.scoreB}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-primary text-primary-foreground font-black text-[11px] shadow-xs whitespace-nowrap">
                VS
              </span>
            )}
          </div>

          <div className="col-span-3 flex items-center justify-start gap-1.5 min-w-0 pl-1">
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="font-bold text-[11px] text-foreground break-words text-left leading-snug">
              {match.teamBName}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FILTER PANEL */}
      <div className="bg-card border border-border p-3.5 rounded-2xl shadow-sm space-y-3">
        {/* 3 BUTTON FILTER DIVISI TERHUBUNG ROUTE */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => handleGroupChange("ALL")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            Semua Divisi
          </button>
          <button
            onClick={() => handleGroupChange("Group A")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group A"
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupAName}
          </button>
          <button
            onClick={() => handleGroupChange("Group B")}
            className={`py-2 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group B"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupBName}
          </button>
        </div>

        {/* DROPDOWN TIM, WEEK & RESET FILTER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* FILTER TIM */}
          <div className="relative" ref={teamRef}>
            <button
              type="button"
              onClick={() => {
                setIsTeamDropdownOpen(!isTeamDropdownOpen);
                setIsWeekDropdownOpen(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {selectedTeamFilter === "ALL" ? "Semua Tim" : selectedTeamFilter}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isTeamDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isTeamDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamFilter("ALL");
                    setIsTeamDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedTeamFilter === "ALL"
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span>Semua Tim</span>
                  {selectedTeamFilter === "ALL" && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>

                {allTeamNames.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => {
                      setSelectedTeamFilter(team);
                      setIsTeamDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedTeamFilter === team
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="truncate">{team}</span>
                    {selectedTeamFilter === team && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FILTER WEEK */}
          <div className="relative" ref={weekRef}>
            <button
              type="button"
              onClick={() => {
                setIsWeekDropdownOpen(!isWeekDropdownOpen);
                setIsTeamDropdownOpen(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {selectedWeekFilter === "ALL" ? "Semua Week" : `Week ${selectedWeekFilter}`}
              </span>
              <ChevronDown className={`h-4 w-4 text-primary transition-transform ${isWeekDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isWeekDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeekFilter("ALL");
                    setIsWeekDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedWeekFilter === "ALL"
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span>Semua Week</span>
                  {selectedWeekFilter === "ALL" && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>

                {availableWeeksFilter.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setSelectedWeekFilter(w);
                      setIsWeekDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedWeekFilter === w
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span>Week {w}</span>
                    {selectedWeekFilter === w && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RESET FILTER */}
          <button
            onClick={handleResetFilters}
            disabled={!isFilterActive}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              isFilterActive
                ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                : "bg-muted/30 text-muted-foreground/60 border border-border/30 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Reset Filter</span>
          </button>
        </div>

        {/* ADMIN SYNC BUTTON */}
        {isAdmin && (
          <div className="pt-2 border-t border-border/30 text-right">
            <button
              onClick={onResetSchedules}
              className="text-[11px] font-black text-rose-500 hover:text-rose-400 transition cursor-pointer"
            >
              ⚡ Sync Roulette &amp; Jadwal
            </button>
          </div>
        )}
      </div>

      {/* LIST KARTU JADWAL */}
      {groupedByWeek.length === 0 ? (
        <div className="p-8 text-center text-xs font-bold text-muted-foreground bg-card border border-border rounded-2xl">
          Tidak ada jadwal pertandingan yang sesuai dengan filter.
        </div>
      ) : (
        groupedByWeek.map(([weekNum, matches]) => (
          <div key={weekNum} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1">
                WEEK {weekNum}
              </span>
              <div className="h-[1px] flex-1 bg-border/60"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matches.map((m) => renderMatchCard(m))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}