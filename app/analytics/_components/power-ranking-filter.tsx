"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";
import { DIVISION_MAP } from "@/app/tournament/_library";

export interface PowerRankingFilterProps {
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  onGroupChange: (g: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  selectedWeek: number;
  onWeekChange: (w: number) => void;
  availableWeeks: number[];
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: { slug: string; name: string }[];
  isFilterActive: boolean;
  onReset: () => void;
}

export function PowerRankingFilter({
  selectedGroup,
  onGroupChange,
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedTeam,
  onTeamChange,
  teams,
  isFilterActive,
  onReset,
}: PowerRankingFilterProps) {
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isWeekOpen, setIsWeekOpen] = useState(false);

  const teamRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setIsTeamOpen(false);
      if (weekRef.current && !weekRef.current.contains(e.target as Node)) setIsWeekOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleGroup = (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    if (selectedGroup === group) {
      onGroupChange("ALL");
    } else {
      onGroupChange(group);
      onTeamChange("ALL"); // reset team jika klik group
    }
  };

  const cleanNameA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanNameB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs space-y-2.5">
      {/* 1. BARIS 1: TOGGLE DUA DIVISI (50:50) */}
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

      {/* 2. BARIS 2: DROPDOWN TIM (KIRI) & DROPDOWN WEEK + RESET (KANAN) */}
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* KOLOM KIRI: TEAM DROPDOWN */}
        <div className="relative w-full" ref={teamRef}>
          <button
            type="button"
            onClick={() => {
              setIsTeamOpen(!isTeamOpen);
              setIsWeekOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-2.5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-foreground flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span className="truncate">
              {selectedTeam === "ALL" ? "Semua Tim (Global)" : teams.find((t) => t.slug === selectedTeam)?.name || selectedTeam}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isTeamOpen ? "rotate-180" : ""}`} />
          </button>

          {isTeamOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  onTeamChange("ALL");
                  setIsTeamOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                  selectedTeam === "ALL" ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                }`}
              >
                <span>Semua Tim (Global)</span>
                {selectedTeam === "ALL" && <Check className="h-4 w-4 text-primary" />}
              </button>

              {teams.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => {
                    onTeamChange(t.slug);
                    setIsTeamOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                    selectedTeam === t.slug ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {selectedTeam === t.slug && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: DROPDOWN WEEK + RESET BUTTON */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1 min-w-0" ref={weekRef}>
            <button
              type="button"
              onClick={() => {
                setIsWeekOpen(!isWeekOpen);
                setIsTeamOpen(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-2.5 py-2 md:py-2.5 text-xs md:text-sm font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
            >
              <span className="truncate">Week {selectedWeek}</span>
              <ChevronDown className={`h-4 w-4 text-primary transition-transform shrink-0 ${isWeekOpen ? "rotate-180" : ""}`} />
            </button>

            {isWeekOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
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
                    {selectedWeek === w && <Check className="h-4 w-4 text-primary" />}
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
