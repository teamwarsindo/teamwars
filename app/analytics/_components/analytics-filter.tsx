"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";
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
  selectedWeek: number | "" | "ALL";
  onWeekChange: (week: number | "ALL") => void;
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

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanNameA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanNameB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  const activeMatch = matchesInView.find((m) => m.id === selectedMatchId);
  const selectedTeamObj = teams.find((t) => t.name === selectedTeam);

  // 1. Tentukan Grup yang Terkunci Berdasarkan Match atau Tim Terpilih
  const lockedGroup = useMemo(() => {
    if (activeMatch?.groupName) return activeMatch.groupName;
    if (selectedTeamObj?.groupName) return selectedTeamObj.groupName;
    return null;
  }, [activeMatch, selectedTeamObj]);

  const effectiveGroup = lockedGroup || selectedGroup;

  // 2. Daftar Tim Dinamis
  const filteredTeams = useMemo(() => {
    // Jika match dipilih, pilihan tim hanya berisi 2 tim yang bertanding
    if (activeMatch && activeMatch.teamAName && activeMatch.teamBName) {
      return teams.filter(
        (t) => t.name === activeMatch.teamAName || t.name === activeMatch.teamBName
      );
    }

    // Jika filter grup aktif
    const list =
      effectiveGroup === "ALL"
        ? [...teams]
        : teams.filter((t) => !t.groupName || t.groupName === effectiveGroup);

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [teams, effectiveGroup, activeMatch]);

  // Handler Ganti Tim
  const handleSelectTeam = (teamName: string) => {
    if (!teamName || teamName === "ALL") {
      onTeamChange("");
    } else {
      onTeamChange(teamName);
      // Auto-set grup sesuai tim yang dipilih
      const targetTeam = teams.find((t) => t.name === teamName);
      if (targetTeam?.groupName) {
        onGroupChange(targetTeam.groupName as any);
      }
    }
    setOpenDropdown(null);
  };

  // Handler Ganti Match
  const handleSelectMatch = (matchId: string) => {
    if (!matchId || matchId === "ALL") {
      onMatchChange?.("");
    } else {
      onMatchChange?.(matchId);
      const match = matchesInView.find((m) => m.id === matchId);
      if (match?.groupName) {
        onGroupChange(match.groupName as any);
      }
      // Reset pilihan tim jika tim sebelumnya tidak ada di match ini
      if (
        selectedTeam &&
        match &&
        selectedTeam !== match.teamAName &&
        selectedTeam !== match.teamBName
      ) {
        onTeamChange("");
      }
    }
    setOpenDropdown(null);
  };

  // Handler Klik Toggle Grup
  const handleToggleGroup = (group: typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B) => {
    if (lockedGroup) return; // Tidak bisa diganti jika match/tim mengunci grup
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

  // Format Badge Skor Sederhana
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

  const isGroupADisabled = Boolean(lockedGroup && lockedGroup !== DIVISION_MAP.GROUP_A);
  const isGroupBDisabled = Boolean(lockedGroup && lockedGroup !== DIVISION_MAP.GROUP_B);

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-2.5">
      {/* BARIS 1: TOGGLE DUA DIVISI */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          disabled={isGroupADisabled}
          onClick={() => handleToggleGroup(DIVISION_MAP.GROUP_A)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
            isGroupADisabled
              ? "opacity-35 cursor-not-allowed bg-muted/20 text-muted-foreground border border-border/20"
              : effectiveGroup === DIVISION_MAP.GROUP_A
              ? "bg-sky-500 text-white shadow-xs cursor-pointer"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
          }`}
        >
          {cleanNameA}
        </button>

        <button
          type="button"
          disabled={isGroupBDisabled}
          onClick={() => handleToggleGroup(DIVISION_MAP.GROUP_B)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center truncate ${
            isGroupBDisabled
              ? "opacity-35 cursor-not-allowed bg-muted/20 text-muted-foreground border border-border/20"
              : effectiveGroup === DIVISION_MAP.GROUP_B
              ? "bg-amber-500 text-slate-950 shadow-xs cursor-pointer"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/30 cursor-pointer"
          }`}
        >
          {cleanNameB}
        </button>
      </div>

      {/* BARIS 2: TIM & WEEK + RESET */}
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* Dropdown Tim */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "team" ? null : "team")}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition focus:outline-none cursor-pointer"
          >
            <span className="truncate">{selectedTeam || "Semua Tim"}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-primary transition-transform ml-1 shrink-0 ${openDropdown === "team" ? "rotate-180" : ""}`} />
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
                <span>
                  {effectiveGroup === DIVISION_MAP.GROUP_A
                    ? `Semua Tim (${cleanNameA})`
                    : effectiveGroup === DIVISION_MAP.GROUP_B
                    ? `Semua Tim (${cleanNameB})`
                    : "Semua Tim"}
                </span>
                {!selectedTeam && <Check className="h-3.5 w-3.5" />}
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
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
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
                {!selectedWeek || selectedWeek === "ALL" ? "Semua Week" : `Week ${selectedWeek}`}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-primary transition-transform ml-1 shrink-0 ${openDropdown === "week" ? "rotate-180" : ""}`} />
            </button>

            {openDropdown === "week" && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
                {/* Opsi Default: Semua Week */}
                <button
                  type="button"
                  onClick={() => {
                    onWeekChange("ALL");
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                    !selectedWeek || selectedWeek === "ALL" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <span>Semua Week</span>
                  {(!selectedWeek || selectedWeek === "ALL") && <Check className="h-3.5 w-3.5" />}
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
                    {selectedWeek === w && <Check className="h-3.5 w-3.5" />}
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
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BARIS 3: MATCH SPESIFIK */}
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
                  <span className="truncate">
                    {activeMatch.teamAName} vs {activeMatch.teamBName}
                  </span>
                  {activeMatch.isFinished && renderScore(activeMatch.scoreA, activeMatch.scoreB)}
                </>
              ) : matchesInView.length === 0 ? (
                "Tidak ada jadwal yang cocok"
              ) : (
                "-- Semua Pertandingan --"
              )}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ml-1 shrink-0 ${openDropdown === "match" ? "rotate-180" : ""}`} />
          </button>

          {openDropdown === "match" && matchesInView.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
              <button
                type="button"
                onClick={() => handleSelectMatch("ALL")}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  !selectedMatchId ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span>-- Semua Pertandingan --</span>
                {!selectedMatchId && <Check className="h-3.5 w-3.5" />}
              </button>

              {matchesInView.map((m) => {
                const isSelected = m.id === selectedMatchId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMatch(m.id)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                      isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="truncate">
                        <span className="font-medium text-foreground">{m.teamAName}</span>
                        <span className="text-muted-foreground text-[10px] mx-1">vs</span>
                        <span className="font-medium text-foreground">{m.teamBName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.isFinished && renderScore(m.scoreA, m.scoreB)}
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
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
