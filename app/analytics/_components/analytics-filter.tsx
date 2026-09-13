"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { DIVISION_MAP } from "@/app/tournament/_library";

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
}

interface AnalyticsFilterProps {
  mode: "reports" | "power-ranking";
  selectedGroup: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B;
  onGroupChange: (group: "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => void;
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  teams: FilterTeamItem[];
  selectedWeek: number | "";
  onWeekChange: (week: number | "") => void;
  availableWeeks: number[];
  selectedMatchId?: string;
  onMatchChange?: (matchId: string) => void;
  matchesInView?: AnalyticsFilterMatchItem[];
  isFilterActive: boolean;
  onReset: () => void;
}

export function AnalyticsFilter({
  mode,
  selectedGroup,
  onGroupChange,
  selectedTeam,
  onTeamChange,
  teams = [],
  selectedWeek,
  onWeekChange,
  availableWeeks = [],
  selectedMatchId = "",
  onMatchChange,
  matchesInView = [],
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

  // Filter tim di dropdown berdasarkan divisi aktif
  const filteredTeams = useMemo(() => {
    if (selectedGroup === "ALL") return teams;
    return teams.filter((t) => !t.groupName || t.groupName === selectedGroup);
  }, [teams, selectedGroup]);

  // Handler memilih tim: Otomatis aktifkan tombol divisi
  const handleSelectTeam = (teamName: string) => {
    if (!teamName || teamName === "ALL") {
      onTeamChange("");
    } else {
      onTeamChange(teamName);
      const target = teams.find((t) => t.name === teamName);
      if (target?.groupName) {
        if (target.groupName === DIVISION_MAP.GROUP_A || target.groupName === DIVISION_MAP.GROUP_B) {
          onGroupChange(target.groupName);
        }
      }
    }
    setOpenDropdown(null);
  };

  // Handler toggle divisi
  const handleToggleGroup = (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
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

  const cleanNameA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanNameB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");
  const activeMatch = matchesInView.find((m) => m.id === selectedMatchId);

  const renderScore = (sA?: number, sB?: number) => {
    if (sA === undefined || sB === undefined) return null;
    const aWin = sA >= 10;
    const bWin = sB >= 10;

    return (
      <span className="font-mono text-[10px] bg-muted/70 px-1.5 py-0.5 rounded-md border border-border/60 shrink-0">
        <span className={aWin ? "text-emerald-500 font-bold" : bWin ? "text-rose-500 font-bold" : "text-foreground/80 font-medium"}>
          {sA}
        </span>
        <span className="mx-0.5 text-muted-foreground/40">-</span>
        <span className={bWin ? "text-emerald-500 font-bold" : aWin ? "text-rose-500 font-bold" : "text-foreground/80 font-medium"}>
          {sB}
        </span>
      </span>
    );
  };

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      {/* ── BARIS 1: TOGGLE DUA DIVISI ── */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          onClick={() => handleToggleGroup(DIVISION_MAP.GROUP_A)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center truncate ${
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
          className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer text-center truncate ${
            selectedGroup === DIVISION_MAP.GROUP_B
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30"
          }`}
        >
          {cleanNameB}
        </button>
      </div>

      {/* ── BARIS 2: TIM & WEEK + RESET ── */}
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* Dropdown Tim */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "team" ? null : "team")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition focus:outline-none cursor-pointer"
          >
            <span className="truncate">{selectedTeam || "Semua Tim"}</span>
            <span className={`text-[10px] text-primary transition-transform ml-1 shrink-0 ${openDropdown === "team" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {openDropdown === "team" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
              <button
                type="button"
                onClick={() => handleSelectTeam("ALL")}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  !selectedTeam ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span>Semua Tim</span>
                {!selectedTeam && <span>✓</span>}
              </button>

              {filteredTeams.map((t) => {
                const isSelected = selectedTeam === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleSelectTeam(t.name)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                      isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dropdown Week + Reset */}
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "week" ? null : "week")}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition focus:outline-none cursor-pointer"
            >
              <span className="truncate">
                {selectedWeek !== "" ? `Week ${selectedWeek}` : "-- Semua Week --"}
              </span>
              <span className={`text-[10px] text-primary transition-transform ml-1 shrink-0 ${openDropdown === "week" ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {openDropdown === "week" && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onWeekChange("");
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                    selectedWeek === "" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span>-- Semua Week --</span>
                  {selectedWeek === "" && <span>✓</span>}
                </button>

                {availableWeeks.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      onWeekChange(w);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                      selectedWeek === w ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span>Week {w}</span>
                    {selectedWeek === w && <span>✓</span>}
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
            className={`h-9 w-9 rounded-xl flex items-center justify-center bg-rose-500 text-white shadow-xs transition shrink-0 cursor-pointer ${
              !isFilterActive ? "opacity-35 cursor-not-allowed" : "hover:bg-rose-600 active:scale-95"
            }`}
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── BARIS 3: MATCH SPESIFIK (HANYA TAB MATCH REPORTS) ── */}
      {mode === "reports" && onMatchChange && (
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "match" ? null : "match")}
            disabled={matchesInView.length === 0}
            className={`w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold transition focus:outline-none cursor-pointer ${
              matchesInView.length === 0 ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground"
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              {activeMatch ? (
                <>
                  {selectedWeek === "" && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                      W{activeMatch.weekNumber}
                    </span>
                  )}
                  <span className="truncate">
                    {activeMatch.teamAName} vs {activeMatch.teamBName}
                  </span>
                  {activeMatch.isFinished && renderScore(activeMatch.scoreA, activeMatch.scoreB)}
                </>
              ) : matchesInView.length === 0 ? (
                "Tidak ada jadwal yang cocok"
              ) : (
                "-- Pilih Pertandingan --"
              )}
            </span>
            <span className={`text-[10px] text-muted-foreground transition-transform ml-1 shrink-0 ${openDropdown === "match" ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {openDropdown === "match" && matchesInView.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
              {matchesInView.map((m) => {
                const isSelected = m.id === selectedMatchId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onMatchChange(m.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                      isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      {selectedWeek === "" && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                          W{m.weekNumber}
                        </span>
                      )}
                      <span className="truncate">
                        <span className="font-medium text-foreground">{m.teamAName}</span>
                        <span className="text-muted-foreground text-[10px] mx-1">vs</span>
                        <span className="font-medium text-foreground">{m.teamBName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.isFinished && renderScore(m.scoreA, m.scoreB)}
                      {isSelected && <span className="text-primary font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
