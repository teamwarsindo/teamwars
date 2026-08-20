"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";
import { DIVISION_MAP } from "@/app/tournament/_library";

interface ScheduleFilterProps {
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  onGroupChange: (val: "ALL" | "Group A" | "Group B") => void;
  groupAName?: string;
  groupBName?: string;
  selectedTeamFilter: string;
  onTeamChange: (team: string) => void;
  allTeamNames: string[];
  selectedWeekFilter: number | "ALL";
  onWeekChange: (week: number | "ALL") => void;
  availableWeeks: number[];
  isFilterActive: boolean;
  onReset: () => void;
  isAdmin: boolean;
  onSyncSchedules?: () => void;
}

export function ScheduleFilter({
  selectedGroupFilter,
  onGroupChange,
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
  selectedTeamFilter,
  onTeamChange,
  allTeamNames,
  selectedWeekFilter,
  onWeekChange,
  availableWeeks,
  isFilterActive,
  onReset,
  isAdmin,
  onSyncSchedules,
}: ScheduleFilterProps) {
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isWeekOpen, setIsWeekOpen] = useState(false);

  const teamRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) {
        setIsTeamOpen(false);
      }
      if (weekRef.current && !weekRef.current.contains(e.target as Node)) {
        setIsWeekOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs space-y-3">
      {/* 1. BUTTON FILTER DIVISI */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2 w-full">
        <button
          type="button"
          onClick={() => onGroupChange("ALL")}
          className={`py-2 px-1.5 md:py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition cursor-pointer leading-snug truncate ${
            selectedGroupFilter === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          Semua Divisi
        </button>
        <button
          type="button"
          onClick={() => onGroupChange("Group A")}
          className={`py-2 px-1.5 md:py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition cursor-pointer leading-snug truncate ${
            selectedGroupFilter === "Group A"
              ? "bg-sky-500 text-white shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          Div. {groupAName}
        </button>
        <button
          type="button"
          onClick={() => onGroupChange("Group B")}
          className={`py-2 px-1.5 md:py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition cursor-pointer leading-snug truncate ${
            selectedGroupFilter === "Group B"
              ? "bg-amber-500 text-white shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          Div. {groupBName}
        </button>
      </div>

      {/* 2. FILTER TIM + FILTER WEEK + RESET BUTTON */}
      <div className="flex items-center gap-2 md:gap-2.5">
        {/* DROPDOWN TIM */}
        <div className="relative flex-1" ref={teamRef}>
          <button
            type="button"
            onClick={() => {
              setIsTeamOpen(!isTeamOpen);
              setIsWeekOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm font-medium text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span className="truncate">
              {selectedTeamFilter === "ALL" ? "Semua Tim" : selectedTeamFilter}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isTeamOpen ? "rotate-180" : ""}`} />
          </button>

          {isTeamOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 md:max-h-72 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  onTeamChange("ALL");
                  setIsTeamOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                  selectedTeamFilter === "ALL" ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                }`}
              >
                <span>Semua Tim</span>
                {selectedTeamFilter === "ALL" && <Check className="h-4 w-4 text-primary" />}
              </button>

              {allTeamNames.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    onTeamChange(team);
                    setIsTeamOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                    selectedTeamFilter === team ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span className="truncate">{team}</span>
                  {selectedTeamFilter === team && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DROPDOWN WEEK */}
        <div className="relative w-[120px] sm:w-[140px] md:w-[160px]" ref={weekRef}>
          <button
            type="button"
            onClick={() => {
              setIsWeekOpen(!isWeekOpen);
              setIsTeamOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span className="truncate">
              {selectedWeekFilter === "ALL" ? "Semua Week" : `Week ${selectedWeekFilter}`}
            </span>
            <ChevronDown className={`h-4 w-4 text-primary transition-transform shrink-0 ${isWeekOpen ? "rotate-180" : ""}`} />
          </button>

          {isWeekOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 md:max-h-72 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  onWeekChange("ALL");
                  setIsWeekOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                  selectedWeekFilter === "ALL" ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                }`}
              >
                <span>Semua Week</span>
                {selectedWeekFilter === "ALL" && <Check className="h-4 w-4 text-primary" />}
              </button>

              {availableWeeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    onWeekChange(w);
                    setIsWeekOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                    selectedWeekFilter === w ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span>Week {w}</span>
                  {selectedWeekFilter === w && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RESET BUTTON */}
        <button
          type="button"
          onClick={onReset}
          disabled={!isFilterActive}
          title="Reset Filter"
          className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition flex items-center justify-center cursor-pointer ${
            isFilterActive
              ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
              : "bg-muted/30 text-muted-foreground/40 border border-border/30 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* ADMIN SYNC */}
      {isAdmin && onSyncSchedules && (
        <div className="pt-2 border-t border-border/30 text-right">
          <button
            type="button"
            onClick={onSyncSchedules}
            className="text-xs font-black text-rose-500 hover:text-rose-400 transition cursor-pointer"
          >
            ⚡ Sync Roulette &amp; Jadwal
          </button>
        </div>
      )}
    </div>
  );
}