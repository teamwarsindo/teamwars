"use client";

import Link from "next/link";
import { Calendar, Trophy, BookOpen, Search } from "lucide-react";
import { MatchScheduleItem } from "@/lib/types/tournament";

interface QuickActionsProps {
  currentWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResult: { team: any; nextMatch?: MatchScheduleItem } | "NOT_FOUND" | null;
  formatDate: (d: string) => string;
}

export function QuickActions({
  currentWeek,
  searchQuery,
  onSearchChange,
  searchResult,
  formatDate,
}: QuickActionsProps) {
  const actions = [
    { href: "/tournament?tab=schedule", icon: Calendar, title: "Jadwal Match", sub: `Week ${currentWeek}`, color: "text-primary bg-primary/10" },
    { href: "/tournament?tab=standing", icon: Trophy, title: "Klasemen", sub: "Group & Playoff", color: "text-amber-500 bg-amber-500/10" },
    { href: "/rules", icon: BookOpen, title: "Rulebook", sub: "Regulasi Resmi", color: "text-emerald-500 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-2.5">
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

      <div className="relative">
        <div className="flex items-center rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-2xs focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Cari profil tim & jadwal berikutnya..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {searchResult && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
            {searchResult === "NOT_FOUND" ? (
              <p className="text-center text-xs text-muted-foreground py-2">
                Tim tidak ditemukan. Coba ketik nama yang lebih spesifik.
              </p>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={searchResult.team.teamLogo || "/logo.webp"}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                    <div>
                      <p className="text-xs font-black text-foreground">{searchResult.team.teamName}</p>
                      <p className="text-[10px] text-muted-foreground">{searchResult.team.groupName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-primary">{searchResult.team.points} Pts</p>
                    <p className="text-[10px] text-muted-foreground">
                      {searchResult.team.matchWins}W - {searchResult.team.matchLosses}L
                    </p>
                  </div>
                </div>

                {searchResult.nextMatch ? (
                  <div className="rounded-xl bg-muted/40 p-2 text-xs">
                    <span className="text-[9.5px] font-bold text-muted-foreground block mb-1">
                      JADWAL BERIKUTNYA:
                    </span>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{searchResult.nextMatch.teamAName} vs {searchResult.nextMatch.teamBName}</span>
                      <span className="text-primary">{formatDate(searchResult.nextMatch.matchDate)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Belum ada jadwal tanding berikutnya.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
