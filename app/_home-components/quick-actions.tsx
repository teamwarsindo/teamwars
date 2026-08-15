"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar, Trophy, BookOpen, Search, Eye } from "lucide-react";
import { MatchScheduleItem } from "@/lib/types/tournament";
import { TeamProfileModal } from "./team-profile-modal";

interface QuickActionsProps {
  currentWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResult: { team: any; nextMatch?: MatchScheduleItem } | "NOT_FOUND" | null;
  allSchedules: MatchScheduleItem[];
}

export function QuickActions({
  currentWeek,
  searchQuery,
  onSearchChange,
  searchResult,
  allSchedules,
}: QuickActionsProps) {
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const actions = [
    { href: "/tournament?tab=schedule", icon: Calendar, title: "Jadwal Match", sub: `Week ${currentWeek}`, color: "text-primary bg-primary/10" },
    { href: "/tournament?tab=standing", icon: Trophy, title: "Klasemen", sub: "Group & Playoff", color: "text-amber-500 bg-amber-500/10" },
    { href: "/rules", icon: BookOpen, title: "Rulebook", sub: "Regulasi Resmi", color: "text-emerald-500 bg-emerald-500/10" },
  ];

  // Hitung form streak [W, L] untuk preview di kartu pencarian
  const searchTeamForm = useMemo(() => {
    if (!searchResult || searchResult === "NOT_FOUND") return [];
    const q = searchResult.team.teamName.toLowerCase();
    return allSchedules
      .filter((m) => m.isFinished && (m.teamAName.toLowerCase() === q || m.teamBName.toLowerCase() === q))
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 5)
      .reverse()
      .map((m) => {
        const isTeamA = m.teamAName.toLowerCase() === q;
        const myScore = isTeamA ? m.scoreA || 0 : m.scoreB || 0;
        const oppScore = isTeamA ? m.scoreB || 0 : m.scoreA || 0;
        return myScore > oppScore ? "W" : "L";
      });
  }, [searchResult, allSchedules]);

  return (
    <div className="space-y-2.5">
      {/* 1. Quick Navigation Menu */}
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">{item.title}</span>
              <span className="text-[9.5px] text-muted-foreground">{item.sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 2. Quick Search Bar & Solid Adaptive Floating Card */}
      <div className="relative">
        <div className="flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-2xs focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Cari profil tim & statistik..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* FLOATING CARD PENCARIAN */}
        {searchResult && (
          <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border-2 border-primary/50 bg-card p-3.5 shadow-2xl">
            {searchResult === "NOT_FOUND" ? (
              <p className="text-center text-xs text-muted-foreground py-2 font-medium">
                Tim tidak ditemukan. Coba ketik nama tim lainnya.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Header Profil Tim */}
                <div
                  onClick={() => setSelectedTeam(searchResult.team)}
                  className="flex items-center justify-between border-b border-border pb-2.5 cursor-pointer hover:bg-muted/40 p-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={searchResult.team.teamLogo || "/logo.webp"}
                      alt=""
                      className="h-8 w-8 object-contain shrink-0 rounded-lg bg-muted/40 p-0.5 border border-border/50"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-foreground hover:text-primary transition truncate">
                          {searchResult.team.teamName}
                        </p>
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-black text-primary shrink-0">
                          <Eye className="h-2.5 w-2.5" /> Buka Profil
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {searchResult.team.rank && (
                          <span className="rounded bg-primary/15 px-1 py-0.2 text-[8.5px] font-black text-primary">
                            #{searchResult.team.rank}
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {searchResult.team.groupName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nilai Poin & Form Streak Seragam */}
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs font-black text-primary">{searchResult.team.points} Pts</p>
                    <div className="flex items-center justify-end gap-1">
                      {searchTeamForm.length > 0 ? (
                        searchTeamForm.map((f, idx) => (
                          <span
                            key={idx}
                            className={`flex h-3.5 w-3.5 items-center justify-center rounded text-[8px] font-black ${
                              f === "W"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-muted-foreground">0 Match</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Mendatang */}
                {searchResult.nextMatch ? (
                  <div className="rounded-xl bg-muted/50 border border-border/80 p-2.5 text-xs">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-muted-foreground block mb-2">
                      Laga Mendatang:
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img
                          src={searchResult.nextMatch.teamALogo || "/logo.webp"}
                          alt=""
                          className="h-4 w-4 object-contain shrink-0"
                        />
                        <span className="truncate font-bold text-[11px] text-foreground">
                          {searchResult.nextMatch.teamAName}
                        </span>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-card border border-border text-muted-foreground shrink-0">
                        VS
                      </span>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                        <span className="truncate font-bold text-[11px] text-right text-foreground">
                          {searchResult.nextMatch.teamBName}
                        </span>
                        <img
                          src={searchResult.nextMatch.teamBLogo || "/logo.webp"}
                          alt=""
                          className="h-4 w-4 object-contain shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    Semua match grup tim ini telah selesai.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. TEAM PROFILE DOSSIER MODAL */}
      {selectedTeam && (
        <TeamProfileModal
          team={selectedTeam}
          allSchedules={allSchedules}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
                  }
