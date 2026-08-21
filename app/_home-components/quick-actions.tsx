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

  const teamMatchHistory = useMemo(() => {
    const map = new Map<string, MatchScheduleItem[]>();
    allSchedules.forEach((m) => {
      if (!m.isFinished) return;
      const kA = (m.teamAName || "").toLowerCase();
      const kB = (m.teamBName || "").toLowerCase();
      if (!map.has(kA)) map.set(kA, []);
      if (!map.has(kB)) map.set(kB, []);
      map.get(kA)!.push(m);
      map.get(kB)!.push(m);
    });
    return map;
  }, [allSchedules]);

  const matchingTeams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return allTeams.filter((t) => {
      const name = (t.teamName || t.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [searchQuery, allTeams]);

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

  const handleSelectTeam = (team: any) => {
    setSelectedTeam(team);
    setIsDropdownOpen(false);
    onSearchChange("");
  };

  const handleCloseModal = () => {
    setSelectedTeam(null);
    onSearchChange("");
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-3.5 md:space-y-4">
      {/* 3 MENU NAVIGASI UTAMA (STANDARISASI LABEL STANDING & UKURAN FONT) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
        <Link
          href="/tournament?tab=schedule"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3 sm:p-4 md:p-5 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30 group"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <Calendar className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </div>
          <span className="mt-2 text-xs sm:text-sm md:text-base font-bold text-foreground">Jadwal Match</span>
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Week {currentWeek}</span>
        </Link>

        <Link
          href="/tournament?tab=standings"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3 sm:p-4 md:p-5 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30 group"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Trophy className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </div>
          <span className="mt-2 text-xs sm:text-sm md:text-base font-bold text-foreground">Standing</span>
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Divisi &amp; Wildcard</span>
        </Link>

        <Link
          href="/rules"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-3 sm:p-4 md:p-5 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30 group"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <BookOpen className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </div>
          <span className="mt-2 text-xs sm:text-sm md:text-base font-bold text-foreground">Rulebook</span>
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Regulasi Resmi</span>
        </Link>
      </div>

      {/* INPUT PENCARIAN & DROPDOWN RESULT */}
      <div className="relative" ref={searchContainerRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 md:left-4 h-4 w-4 md:h-5 md:w-5 text-muted-foreground pointer-events-none" />
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
            className="w-full rounded-2xl border border-border/80 bg-card py-2.5 md:py-3 pl-10 md:pl-12 pr-10 text-xs md:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onSearchChange("");
                setIsDropdownOpen(false);
              }}
              className="absolute right-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          )}
        </div>

        {/* DROPDOWN LIST TIM */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-64 md:max-h-80 overflow-y-auto rounded-2xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
            {matchingTeams.length === 0 ? (
              <div className="p-4 text-center text-xs md:text-sm font-semibold text-muted-foreground">
                Tidak ada tim yang cocok dengan &quot;{searchQuery}&quot;
              </div>
            ) : (
              matchingTeams.map((team) => {
                const tName = team.teamName || team.name;
                const cleanKey = (tName || "").toLowerCase();
                const matches = teamMatchHistory.get(cleanKey) || [];

                return (
                  <button
                    key={team.teamId || tName}
                    type="button"
                    onClick={() => handleSelectTeam(team)}
                    className="w-full flex items-center justify-between p-2.5 md:p-3 rounded-xl hover:bg-muted/70 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={team.teamLogo || team.logo || "/logo.webp"}
                        alt=""
                        className="h-6 w-6 md:h-7 md:w-7 object-contain shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs md:text-sm text-foreground block truncate">
                          {tName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground">
                          <span>{team.groupName}</span>
                          <span>•</span>
                          {matches.length === 0 ? (
                            <span className="font-medium">Belum bertanding</span>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              {matches.slice(0, 5).map((m, idx) => {
                                const isTeamA = (m.teamAName || "").toLowerCase() === cleanKey;
                                const myScore = Number(isTeamA ? m.scoreA : m.scoreB) || 0;
                                const oppScore = Number(isTeamA ? m.scoreB : m.scoreA) || 0;
                                const isWin = myScore > oppScore;

                                return (
                                  <span
                                    key={idx}
                                    className={`px-1 py-0.2 rounded font-black text-[9px] md:text-[10px] ${
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
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}