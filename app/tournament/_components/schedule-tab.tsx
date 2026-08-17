"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  formatMatchWIB,
} from "@/app/tournament/_library";
import { ChevronDown, Check, RotateCcw, Radio, Tv, ExternalLink } from "lucide-react";

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

  // Filter & Sort Kronologis Waktu Otomatis
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
        return timeA - timeB; // Urut otomatis dari yang paling awal ke yang paling akhir
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
    const isLive = Boolean(match.streamLink) && !match.isFinished;
    const isPlayed = match.isFinished || (match.scoreA || 0) + (match.scoreB || 0) > 0;

    const isWinA = match.isFinished && (match.scoreA || 0) > (match.scoreB || 0);
    const isWinB = match.isFinished && (match.scoreB || 0) > (match.scoreA || 0);

    return (
      <div
        key={match.id}
        onClick={() => onSelectMatch(match)}
        className={`border transition p-3 rounded-2xl shadow-xs cursor-pointer space-y-2 relative ${
          isGroupA
            ? "bg-sky-500/[0.04] border-sky-500/30 hover:border-sky-500/60"
            : "bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/60"
        }`}
      >
        {/* CARD HEADER */}
        <div className="flex items-center justify-between text-[10px]">
          <span
            className={`font-bold uppercase tracking-wider text-[9.5px] ${
              isGroupA ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {groupDisplayName}
          </span>
          <span className="text-muted-foreground font-medium">
            {formatMatchWIB(match.matchDate)}
          </span>
        </div>

        {/* TEAMS & SCORE CENTER */}
        <div className="grid grid-cols-7 items-center gap-1.5 text-center py-0.5">
          {/* TEAM A */}
          <div className="col-span-3 flex items-center justify-end gap-1.5 min-w-0 pr-0.5">
            <span
              className={`text-[10.5px] truncate text-right leading-snug ${
                isPlayed
                  ? isWinA
                    ? "font-bold text-foreground"
                    : "font-normal text-muted-foreground"
                  : "font-semibold text-foreground"
              }`}
            >
              {match.teamAName}
            </span>
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-4.5 w-4.5 shrink-0 object-contain"
            />
          </div>

          {/* BADGE SKOR / VS / LIVE */}
          <div className="col-span-1 flex justify-center">
            {isLive ? (
              <span className="flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[8.5px] font-black text-white uppercase tracking-wider animate-pulse shadow-xs">
                <Radio className="h-2.5 w-2.5" /> LIVE
              </span>
            ) : isPlayed ? (
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs whitespace-nowrap text-white ${
                  isGroupA ? "bg-sky-600 dark:bg-sky-500" : "bg-amber-600 dark:bg-amber-500"
                }`}
              >
                {match.scoreA} - {match.scoreB}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-bold text-[10px] whitespace-nowrap border border-border/40">
                VS
              </span>
            )}
          </div>

          {/* TEAM B */}
          <div className="col-span-3 flex items-center justify-start gap-1.5 min-w-0 pl-0.5">
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-4.5 w-4.5 shrink-0 object-contain"
            />
            <span
              className={`text-[10.5px] truncate text-left leading-snug ${
                isPlayed
                  ? isWinB
                    ? "font-bold text-foreground"
                    : "font-normal text-muted-foreground"
                  : "font-semibold text-foreground"
              }`}
            >
              {match.teamBName}
            </span>
          </div>
        </div>

        {/* CARD FOOTER (STREAMER / REFEREE / LINK ACTION) */}
        <div className="flex items-center justify-between border-t border-border/30 pt-1 text-[9px] text-muted-foreground">
          <span className="truncate flex items-center gap-1">
            {match.streamer ? (
              <>
                <Tv className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">Streamer: {match.streamer}</span>
              </>
            ) : (
              <span>🎙️ Official Match</span>
            )}
          </span>

          {match.streamLink && (
            <a
              href={match.streamLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 font-bold text-rose-500 hover:text-rose-600 transition"
            >
              Live <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* FILTER PANEL */}
      <div className="bg-card border border-border p-3 sm:p-3.5 rounded-2xl shadow-xs space-y-2.5">
        {/* 3 BUTTON FILTER DIVISI */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => handleGroupChange("ALL")}
            className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            Semua Divisi
          </button>
          <button
            onClick={() => handleGroupChange("Group A")}
            className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group A"
                ? "bg-sky-500 text-white shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            {groupAName}
          </button>
          <button
            onClick={() => handleGroupChange("Group B")}
            className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold transition cursor-pointer leading-snug break-words ${
              selectedGroupFilter === "Group B"
                ? "bg-amber-500 text-white shadow-xs"
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
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-[11px] font-medium text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {selectedTeamFilter === "ALL" ? "Semua Tim" : selectedTeamFilter}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isTeamDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isTeamDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamFilter("ALL");
                    setIsTeamDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
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
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-[11px] font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                {selectedWeekFilter === "ALL" ? "Semua Week" : `Week ${selectedWeekFilter}`}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-primary transition-transform ${isWeekDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isWeekDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeekFilter("ALL");
                    setIsWeekDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
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
            className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
          <div className="pt-1.5 border-t border-border/30 text-right">
            <button
              onClick={onResetSchedules}
              className="text-[10.5px] font-black text-rose-500 hover:text-rose-400 transition cursor-pointer"
            >
              ⚡ Sync Roulette &amp; Jadwal
            </button>
          </div>
        )}
      </div>

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
              {matches.map((m) => renderMatchCard(m))}
            </div>
          </div>
        ))
      )}
    </div>
  );                   
}
