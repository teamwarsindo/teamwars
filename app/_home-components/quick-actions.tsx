"use client";

import { useState } from "react";
import Link from "next/link";
import { MatchScheduleItem } from "@/lib/tournament";
import {
  Search,
  Calendar,
  Trophy,
  BookOpen,
  X,
  Swords,
  Copy,
  Check,
} from "lucide-react";

interface QuickActionsProps {
  currentWeek: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResult: any;
  allSchedules?: MatchScheduleItem[];
}

export function QuickActions({
  currentWeek,
  searchQuery,
  onSearchChange,
  searchResult,
  allSchedules = [],
}: QuickActionsProps) {
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeTeam = selectedTeam || (searchResult && searchResult !== "NOT_FOUND" ? searchResult.team : null);
  const nextMatch = searchResult && searchResult !== "NOT_FOUND" ? searchResult.nextMatch : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isModalOpen = Boolean(activeTeam);

  return (
    <div className="space-y-4">
      {/* MENU NAVIGASI UTAMA */}
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

        {/* ✅ Arahkan ke tab standings */}
        <Link
          href="/tournament?tab=standings"
          className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs transition hover:border-primary/50 hover:bg-muted/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-black text-foreground">Klasemen</span>
          <span className="text-[10px] text-muted-foreground">Group &amp; Playoff</span>
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

      {/* INPUT PENCARIAN PROFIL TIM */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari profil tim & statistik..."
          className="w-full rounded-2xl border border-border/80 bg-card py-2.5 pl-10 pr-10 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* MODAL PROFIL TIM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
            {/* TOMBOL CLOSE */}
            <button
              onClick={() => {
                setSelectedTeam(null);
                onSearchChange("");
              }}
              className="absolute right-4 top-4 rounded-full bg-muted/60 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* HEADER PROFIL TIM */}
            <div className="flex items-center gap-3 pr-8">
              <img
                src={activeTeam.teamLogo || "/logo.webp"}
                alt=""
                className="h-12 w-12 rounded-xl object-contain border border-border p-1 bg-background shrink-0"
              />
              <div className="space-y-1">
                <h3 className="font-black text-base text-foreground leading-tight">
                  {activeTeam.teamName}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    #{activeTeam.rank || 1} {activeTeam.groupName}
                  </span>

                  {(() => {
                    const isTopDivisi = (activeTeam.rank || 1) <= 2;
                    const globalRank = activeTeam.globalRank || activeTeam.rank || 1;
                    const isPlayoffWildcard = !isTopDivisi && globalRank <= 8;

                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          isTopDivisi
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : isPlayoffWildcard
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        #{globalRank} Global{" "}
                        {isTopDivisi
                          ? "👑 (Top Divisi)"
                          : isPlayoffWildcard
                          ? "🔥 (Zona Playoff)"
                          : "⚠️ (Belum Lolos)"}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* KOTAK STATISTIK TIM */}
            <div className="grid grid-cols-4 gap-2 rounded-2xl bg-muted/30 p-3 text-center border border-border/40">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground">POIN</span>
                <span className="text-base font-black text-primary">{activeTeam.points || 0}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground">SET WIN</span>
                <span className="text-base font-black text-foreground">{activeTeam.setWins || 0}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground">ROUND DIFF</span>
                <span
                  className={`text-base font-black ${
                    (activeTeam.roundDifference || 0) > 0
                      ? "text-emerald-500"
                      : (activeTeam.roundDifference || 0) < 0
                      ? "text-rose-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {(activeTeam.roundDifference || 0) > 0
                    ? `+${activeTeam.roundDifference}`
                    : activeTeam.roundDifference || 0}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground">WIN RATE</span>
                <span className="text-base font-black text-foreground">
                  {activeTeam.matchWins + activeTeam.matchLosses > 0
                    ? `${Math.round((activeTeam.matchWins / (activeTeam.matchWins + activeTeam.matchLosses)) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* PERTANDINGAN MENDATANG */}
            {nextMatch && (
              <div className="space-y-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Swords className="h-3 w-3" /> Laga Mendatang (Week {nextMatch.weekNumber || currentWeek})
                </span>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate flex-1">{nextMatch.teamAName}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground mx-2">
                    VS
                  </span>
                  <span className="truncate flex-1 text-right">{nextMatch.teamBName}</span>
                </div>
              </div>
            )}

            {/* DAFTAR ROSTER TIM */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Roster Anggota ({activeTeam.players?.length || 0})
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {activeTeam.players?.map((p: any, idx: number) => {
                  const ign = typeof p === "string" ? p : p.ign || p.name || `Pemain ${idx + 1}`;
                  const idDl = typeof p === "object" ? p.idDl || p.id : "";
                  const role = typeof p === "object" ? p.role || "" : "";

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-extrabold text-muted-foreground text-[10px] w-3">
                          {idx + 1}
                        </span>
                        <span className="truncate font-bold text-foreground">{ign}</span>
                        {role && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                            {role}
                          </span>
                        )}
                      </div>

                      {idDl && (
                        <button
                          onClick={() => handleCopy(idDl)}
                          className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition"
                        >
                          {copiedId === idDl ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>{idDl}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOMBOL TUTUP MODAL */}
            <button
              onClick={() => {
                setSelectedTeam(null);
                onSearchChange("");
              }}
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-black text-primary-foreground shadow-xs hover:opacity-90 transition"
            >
              Tutup Profil Tim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}