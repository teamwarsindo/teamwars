"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  Search,
  Calendar,
  Trophy,
  BookOpen,
  X,
  ChevronRight,
} from "lucide-react";
import { TeamProfileModal } from "./team-profile-modal";

interface QuickActionsProps {
  currentWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  allTeams?: any[];
  allSchedules?: MatchScheduleItem[];
}

export function QuickActions({
  currentWeek,
  searchQuery,
  onSearchChange,
  allTeams = [],
  allSchedules = [],
}: QuickActionsProps) {
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Form W/L riwayat per tim untuk ditampilkan di dropdown pencarian
  const teamMatchHistory = useMemo(() => {
    const map = new Map<string, MatchScheduleItem[]>();
    allSchedules.forEach((m) => {
      if (!m.isFinished) return;
      if (!map.has(m.teamAName)) map.set(m.teamAName, []);
      if (!map.has(m.teamBName)) map.set(m.teamBName, []);
      map.get(m.teamAName)!.push(m);
      map.get(m.teamBName)!.push(m);
    });
    return map;
  }, [allSchedules]);

  // Filter daftar tim
  const matchingTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return allTeams.filter((t) => {
      const name = (t.teamName || t.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [searchQuery, allTeams]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* 3 MENU NAVIGASI UTAMA */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/tournament?tab=schedule"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-black text-foreground">Jadwal Match</span>
          <span className="text-[10px] text-muted-foreground">Week {currentWeek}</span>
        </Link>

        <Link
          href="/tournament?tab=standings"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-black text-foreground">Klasemen</span>
          <span className="text-[10px] text-muted-foreground">Group &amp; Global</span>
        </Link>

        <Link
          href="/rules"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-black text-foreground">Rulebook</span>
          <span className="text-[10px] text-muted-foreground">Regulasi Resmi</span>
        </Link>
      </div>

      {/* INPUT PENCARIAN & DROPDOWN RESULT */}
      <div className="relative" ref={searchContainerRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Cari profil tim & statistik..."
            className="w-full rounded-2xl border border-border/80 bg-card py-2.5 pl-10 pr-10 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange("");
                setIsDropdownOpen(false);
              }}
              className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* DROPDOWN LIST TIM */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 overflow-y-auto rounded-2xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
            {matchingTeams.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-muted-foreground">
                Tidak ada tim yang cocok dengan &quot;{searchQuery}&quot;
              </div>
            ) : (
              matchingTeams.map((team) => {
                const tName = team.teamName || team.name;
                const matches = teamMatchHistory.get(tName) || [];

                return (
                  <button
                    key={team.teamId || tName}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(team);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/70 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={team.teamLogo || team.logo || "/logo.webp"}
                        alt=""
                        className="h-6 w-6 object-contain shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {tName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{team.groupName}</span>
                          <span>•</span>
                          {matches.length === 0 ? (
                            <span className="text-muted-foreground font-semibold">Belum bertanding</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              {matches.slice(0, 5).map((m, idx) => {
                                const isTeamA = m.teamAName === tName;
                                const myScore = isTeamA ? m.scoreA || 0 : m.scoreB || 0;
                                const oppScore = isTeamA ? m.scoreB || 0 : m.scoreA || 0;
                                const isWin = myScore > oppScore;

                                return (
                                  <span
                                    key={idx}
                                    className={`px-1 py-0.2 rounded font-black text-[8.5px] ${
                                      isWin
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                    }`}
                                  >
                                    {isWin ? "W" : "L"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL PROFIL TIM */}
      {selectedTeam && (
        <TeamProfileModal
          team={selectedTeam}
          allTeams={allTeams}
          allSchedules={allSchedules}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
