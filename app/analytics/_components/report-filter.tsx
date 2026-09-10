"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";
import { DIVISION_MAP } from "@/app/tournament/_library";

export interface ReportFilterMatchItem {
  id: string;
  weekNumber: number;
  groupName?: string;
  teamAName: string;
  teamBName: string;
}

export interface ReportFilterProps {
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  onGroupChange: (group: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  availableWeeks: number[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
  matchesInView: ReportFilterMatchItem[];
  isFilterActive: boolean;
  onReset: () => void;
}

export function ReportFilter({
  selectedGroup,
  onGroupChange,
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedMatchId,
  onMatchChange,
  matchesInView,
  isFilterActive,
  onReset,
}: ReportFilterProps) {
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [isWeekOpen, setIsWeekOpen] = useState(false);

  const matchRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (matchRef.current && !matchRef.current.contains(e.target as Node)) setIsMatchOpen(false);
      if (weekRef.current && !weekRef.current.contains(e.target as Node)) setIsWeekOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleGroup = (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    onGroupChange(selectedGroup === group ? "ALL" : group);
  };

  const cleanNameA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanNameB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  const activeMatch = matchesInView.find((m) => m.id === selectedMatchId);

  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs space-y-2.5">
      {/* BARIS 1: TOGGLE DUA DIVISI (50:50) */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          onClick={() => handleToggleGroup(DIVISION_MAP.GROUP_A)}
          className={`py-2 px-3 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer text-center truncate ${
            selectedGroup === DIVISION_MAP.GROUP_A
              ? "bg-sky-500 text-white shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          {cleanNameA}
        </button>
        <button
          type="button"
          onClick={() => handleToggleGroup(DIVISION_MAP.GROUP_B)}
          className={`py-2 px-3 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer text-center truncate ${
            selectedGroup === DIVISION_MAP.GROUP_B
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          {cleanNameB}
        </button>
      </div>

      {/* BARIS 2: MATCH DROPDOWN + WEEK DROPDOWN & RESET (50:50) */}
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* MATCH PICKER */}
        <div className="relative w-full" ref={matchRef}>
          <button
            type="button"
            onClick={() => {
              setIsMatchOpen(!isMatchOpen);
              setIsWeekOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-2.5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span className="truncate">
              {activeMatch ? `${activeMatch.teamAName} vs ${activeMatch.teamBName}` : "Pilih Match"}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isMatchOpen ? "rotate-180" : ""}`} />
          </button>

          {isMatchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md">
              {matchesInView.length === 0 ? (
                <div className="p-2 text-center text-xs text-muted-foreground">Tidak ada match</div>
              ) : (
                matchesInView.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onMatchChange(m.id);
                      setIsMatchOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                      selectedMatchId === m.id ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="truncate">{m.teamAName} vs {m.teamBName}</span>
                    {selectedMatchId === m.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* WEEK PICKER & RESET BUTTON */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1 min-w-0" ref={weekRef}>
            <button
              type="button"
              onClick={() => {
                setIsWeekOpen(!isWeekOpen);
                setIsMatchOpen(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-2.5 py-2 md:py-2.5 text-xs md:text-sm font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">Week {selectedWeek}</span>
              <ChevronDown className={`h-4 w-4 text-primary transition-transform shrink-0 ${isWeekOpen ? "rotate-180" : ""}`} />
            </button>

            {isWeekOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md">
                {availableWeeks.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      onWeekChange(w);
                      setIsWeekOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                      selectedWeek === w ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                    }`}
                  >
                    <span>Week {w}</span>
                    {selectedWeek === w && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={!isFilterActive}
            title="Reset Filter"
            className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition flex items-center justify-center ${
              isFilterActive
                ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600 cursor-pointer"
                : "bg-muted/20 text-muted-foreground/30 border border-border/30 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
  }
                
