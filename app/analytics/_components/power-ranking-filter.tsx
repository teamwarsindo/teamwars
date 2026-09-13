"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronDown, RotateCcw } from "lucide-react";

export const DIVISION_MAP = {
  GROUP_A: "Anda Yakin?",
  GROUP_B: "Sakurasawa Fighters",
} as const;

export interface FilterSchedule {
  week: number;
  home: string;
  away: string;
  group?: string;
}

export interface FilterRosterTeam {
  name: string;
  slug: string;
  logo?: string;
  groupName?: string;
}

interface AnalyticsFilterProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  selectedWeek: number | "";
  onWeekChange: (week: number | "") => void;
  maxActiveWeek: number;
  onReset: () => void;
  schedules?: FilterSchedule[];
  teams?: FilterRosterTeam[];
}

export function AnalyticsFilter({
  selectedGroup,
  onGroupChange,
  selectedTeam,
  onTeamChange,
  selectedWeek,
  onWeekChange,
  maxActiveWeek,
  onReset,
  schedules = [],
  teams = [],
}: AnalyticsFilterProps) {
  const [openDropdown, setOpenDropdown] = useState<"team" | "week" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map logo tim
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      if (t.logo) {
        map.set(t.name.toLowerCase(), t.logo);
        if (t.slug) map.set(t.slug.toLowerCase(), t.logo);
      }
    });
    return map;
  }, [teams]);

  // Daftar tim yang disaring berdasarkan grup (jika ada grup yang dipilih)
  const availableTeams = useMemo(() => {
    const teamSet = new Map<string, { name: string; logo?: string; groupName?: string }>();

    // 1. Ekstraksi dari daftar roster utama
    teams.forEach((t) => {
      if (t.name) {
        teamSet.set(t.name, {
          name: t.name,
          logo: t.logo,
          groupName: t.groupName,
        });
      }
    });

    // 2. Ekstraksi pelengkap dari data jadwal
    schedules.forEach((s) => {
      if (s.home && !teamSet.has(s.home)) {
        teamSet.set(s.home, {
          name: s.home,
          logo: teamLogoMap.get(s.home.toLowerCase()),
          groupName: s.group,
        });
      }
      if (s.away && !teamSet.has(s.away)) {
        teamSet.set(s.away, {
          name: s.away,
          logo: teamLogoMap.get(s.away.toLowerCase()),
          groupName: s.group,
        });
      }
    });

    let list = Array.from(teamSet.values());

    // Filter tim berdasarkan grup bila tombol divisi sedang aktif
    if (selectedGroup === DIVISION_MAP.GROUP_A) {
      list = list.filter((t) => t.groupName === DIVISION_MAP.GROUP_A);
    } else if (selectedGroup === DIVISION_MAP.GROUP_B) {
      list = list.filter((t) => t.groupName === DIVISION_MAP.GROUP_B);
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, schedules, selectedGroup, teamLogoMap]);

  // Handler memilih tim: HANYA ubah tim terpilih, TANPA auto-select grup/divisi
  const handleSelectTeam = (teamName: string) => {
    if (!teamName || teamName === "ALL") {
      onTeamChange("");
    } else {
      onTeamChange(teamName);
    }
    setOpenDropdown(null);
  };

  const handleSelectWeek = (week: number | "") => {
    onWeekChange(week);
    setOpenDropdown(null);
  };

  const handleGroupToggle = (group: string) => {
    if (selectedGroup === group) {
      onGroupChange("ALL");
    } else {
      onGroupChange(group);
      // Jika tim yang dipilih berada di luar grup baru, reset pilihan tim
      if (selectedTeam) {
        const teamInNewGroup = availableTeams.some(
          (t) => t.name.toLowerCase() === selectedTeam.toLowerCase()
        );
        if (!teamInNewGroup) {
          onTeamChange("");
        }
      }
    }
  };

  const activeWeekNum = typeof selectedWeek === "number" ? selectedWeek : maxActiveWeek;

  return (
    <div
      ref={dropdownRef}
      className="w-full rounded-2xl border border-border/80 bg-card p-3 shadow-xs space-y-2.5"
    >
      {/* ── BARIS 1: TOGGLE DIVISI ── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Tombol Divisi A */}
        <button
          type="button"
          onClick={() => handleGroupToggle(DIVISION_MAP.GROUP_A)}
          className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            selectedGroup === DIVISION_MAP.GROUP_A
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          {DIVISION_MAP.GROUP_A}
        </button>

        {/* Tombol Divisi B */}
        <button
          type="button"
          onClick={() => handleGroupToggle(DIVISION_MAP.GROUP_B)}
          className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            selectedGroup === DIVISION_MAP.GROUP_B
              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-bold"
              : "border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          {DIVISION_MAP.GROUP_B}
        </button>
      </div>

      {/* ── BARIS 2: DROPDOWN TIM, MINGGU, DAN RESET ── */}
      <div className="flex items-center gap-2">
        {/* Dropdown Tim */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "team" ? null : "team")}
            className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate pr-1">
              {selectedTeam && (
                <div className="h-3.5 w-3.5 rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted/20">
                  {teamLogoMap.get(selectedTeam.toLowerCase()) ? (
                    <Image
                      src={teamLogoMap.get(selectedTeam.toLowerCase())!}
                      alt={selectedTeam}
                      width={14}
                      height={14}
                      className="h-full w-full object-cover rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/20" />
                  )}
                </div>
              )}
              <span className="truncate">{selectedTeam || "Semua Tim"}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>

          {openDropdown === "team" && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
              <button
                type="button"
                onClick={() => handleSelectTeam("ALL")}
                className={`flex w-full items-center px-2.5 py-1.5 text-xs rounded-lg text-left transition cursor-pointer ${
                  !selectedTeam ? "bg-muted font-bold text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                Semua Tim
              </button>
              {availableTeams.map((team) => (
                <button
                  key={team.name}
                  type="button"
                  onClick={() => handleSelectTeam(team.name)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition cursor-pointer ${
                    selectedTeam.toLowerCase() === team.name.toLowerCase()
                      ? "bg-muted font-bold text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {team.logo && (
                    <div className="h-4 w-4 rounded-full overflow-hidden shrink-0 border border-border/60">
                      <Image
                        src={team.logo}
                        alt={team.name}
                        width={16}
                        height={16}
                        className="h-full w-full object-cover rounded-full"
                        unoptimized
                      />
                    </div>
                  )}
                  <span className="truncate">{team.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Minggu */}
        <div className="relative w-28 sm:w-32">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "week" ? null : "week")}
            className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition cursor-pointer"
          >
            <span className="truncate">Week {activeWeekNum}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>

          {openDropdown === "week" && (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
              {Array.from({ length: maxActiveWeek || 1 }, (_, i) => i + 1).map((wk) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => handleSelectWeek(wk)}
                  className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition cursor-pointer ${
                    activeWeekNum === wk
                      ? "bg-muted font-bold text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span>Week {wk}</span>
                  {wk === maxActiveWeek && (
                    <span className="text-[9px] text-primary font-bold">LATEST</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tombol Reset */}
        <button
          type="button"
          onClick={onReset}
          title="Reset Filter"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition shrink-0 cursor-pointer shadow-xs"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
                  }
