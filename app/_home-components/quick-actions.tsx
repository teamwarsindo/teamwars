"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Trophy, BookOpen, Search, X, Users } from "lucide-react";
import { MatchScheduleItem } from "@/lib/types/tournament";

interface QuickActionsProps {
  currentWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResult: { team: any; nextMatch?: MatchScheduleItem; roster: any[] } | "NOT_FOUND" | null;
}

export function QuickActions({
  currentWeek,
  searchQuery,
  onSearchChange,
  searchResult,
}: QuickActionsProps) {
  const [selectedRosterTeam, setSelectedRosterTeam] = useState<{
    team: any;
    roster: any[];
  } | null>(null);

  const actions = [
    { href: "/tournament?tab=schedule", icon: Calendar, title: "Jadwal Match", sub: `Week ${currentWeek}`, color: "text-primary bg-primary/10" },
    { href: "/tournament?tab=standing", icon: Trophy, title: "Klasemen", sub: "Group & Playoff", color: "text-amber-500 bg-amber-500/10" },
    { href: "/rules", icon: BookOpen, title: "Rulebook", sub: "Regulasi Resmi", color: "text-emerald-500 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-2.5">
      {/* 1. Quick Menu Buttons */}
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

      {/* 2. Quick Search Bar */}
      <div className="relative">
        <div className="flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-2xs focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Cari tim (klik untuk melihat roster)..."
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

        {/* Dropdown Hasil Pencarian */}
        {searchResult && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
            {searchResult === "NOT_FOUND" ? (
              <p className="text-center text-xs text-muted-foreground py-2">
                Tim tidak ditemukan. Coba ketik nama yang lebih spesifik.
              </p>
            ) : (
              <div className="space-y-2.5">
                {/* Header Tim yang bisa diklik */}
                <div
                  onClick={() =>
                    setSelectedRosterTeam({
                      team: searchResult.team,
                      roster: searchResult.roster,
                    })
                  }
                  className="flex items-center justify-between border-b border-border/40 pb-2 cursor-pointer hover:bg-muted/30 p-1.5 rounded-xl transition"
                  title="Klik untuk melihat daftar roster"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={searchResult.team.teamLogo || "/logo.webp"}
                      alt=""
                      className="h-7 w-7 object-contain shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-foreground hover:text-primary transition">
                          {searchResult.team.teamName}
                        </p>
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                          <Users className="h-2.5 w-2.5" /> Roster
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{searchResult.team.groupName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-primary">{searchResult.team.points} Pts</p>
                    <p className="text-[10px] text-muted-foreground">
                      {searchResult.team.matchWins}W - {searchResult.team.matchLosses}L
                    </p>
                  </div>
                </div>

                {/* Jadwal Berikutnya (Tanggal di-hide, tampilkan Logo Lawan) */}
                {searchResult.nextMatch ? (
                  <div className="rounded-xl bg-muted/40 p-2 text-xs">
                    <span className="text-[9.5px] font-black uppercase text-muted-foreground block mb-1.5">
                      Jadwal Tanding Berikutnya:
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-background/60 p-2 rounded-lg border border-border/40">
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

                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
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
                    Belum ada jadwal match berikutnya.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. MODAL POPUP ROSTER TIM */}
      {selectedRosterTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={selectedRosterTeam.team.teamLogo || "/logo.webp"}
                  alt=""
                  className="h-8 w-8 object-contain shrink-0"
                />
                <div>
                  <h3 className="text-sm font-black text-foreground truncate">
                    {selectedRosterTeam.team.teamName}
                  </h3>
                  <p className="text-[10.5px] text-muted-foreground font-semibold">
                    {selectedRosterTeam.team.groupName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRosterTeam(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List Pemain / Roster */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Daftar Lineup / Pemain Tim:
              </span>

              {selectedRosterTeam.roster && selectedRosterTeam.roster.length > 0 ? (
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedRosterTeam.roster.map((player: any, idx: number) => {
                    const playerName = typeof player === "string" ? player : player.playerName || player.name;
                    const playerId = typeof player === "object" ? player.duellinksId || player.playerId : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                          <span className="font-bold text-foreground text-[11px]">{playerName}</span>
                        </div>
                        {playerId && (
                          <span className="text-[9.5px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                            ID: {playerId}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Informasi roster belum dipublikasikan oleh panitia.
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRosterTeam(null)}
              className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
                }
