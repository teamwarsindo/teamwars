"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Trophy, Flame, ShieldAlert, Sparkles, TrendingUp, Zap } from "lucide-react";
import {
  calculatePowerRanking,
  MatchReportData,
  TeamRosterData,
} from "../_library/power-ranking";

interface PowerRankingViewProps {
  reports: MatchReportData[];
  teams: TeamRosterData[];
  maxActiveWeek: number;
  selectedGroup: string;
  selectedTeam: string;
  selectedWeek: number | "";
}

export function PowerRankingView({
  reports = [],
  teams = [],
  maxActiveWeek = 1,
  selectedGroup,
  selectedTeam,
  selectedWeek,
}: PowerRankingViewProps) {
  // 1. Tentukan Scope Filter
  const filterScope =
    selectedTeam && selectedTeam !== "ALL"
      ? "TEAM"
      : selectedGroup === "Anda Yakin?" || selectedGroup?.includes("Anda Yakin")
      ? "Anda Yakin?"
      : selectedGroup === "Sakurasawa Fighters" || selectedGroup?.includes("Sakurasawa")
      ? "Sakurasawa Fighters"
      : "GLOBAL";

  // 2. Hitung Agregasi Ranking
  const targetWeek = typeof selectedWeek === "number" ? selectedWeek : maxActiveWeek;

  const { players, grandTotal } = useMemo(() => {
    return calculatePowerRanking({
      reports,
      targetWeek,
      teams,
      filterScope,
      selectedTeamSlug: selectedTeam && selectedTeam !== "ALL" ? selectedTeam : undefined,
    });
  }, [reports, targetWeek, teams, filterScope, selectedTeam]);

  const isTeamView = filterScope === "TEAM";
  const topOnePlayer = !isTeamView && players.length > 0 ? players[0] : null;
  const tablePlayers = !isTeamView && players.length > 0 ? players.slice(1) : players;

  return (
    <div className="w-full space-y-3">
      {/* ── KOTAK TOP 1 SPOTLIGHT (STICKY PINNED PERSIS SCOREBOARD) ── */}
      {topOnePlayer && (
        <div className="sticky top-[100px] sm:top-[106px] z-30 mb-3">
          <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-amber-500/30 p-3 shadow-md relative overflow-hidden">
            {/* Background Glow Emas */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-3">
              {/* Kiri: Avatar & Info Player */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center overflow-hidden">
                    {topOnePlayer.teamLogo ? (
                      <Image
                        src={topOnePlayer.teamLogo}
                        alt={topOnePlayer.teamName}
                        width={44}
                        height={44}
                        className="object-contain p-1"
                        unoptimized
                      />
                    ) : (
                      <Trophy className="h-6 w-6 text-amber-500" />
                    )}
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow-xs border border-card">
                    1
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs sm:text-sm text-foreground truncate">
                      {topOnePlayer.ign}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md text-[8px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                      MVP #1
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {topOnePlayer.teamName}
                  </div>
                </div>
              </div>

              {/* Kanan: Ringkasan Skor Agregat & Rasio */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono">
                <div className="text-right">
                  <div className="text-[9px] font-sans font-bold uppercase text-muted-foreground/80">
                    P / W / L
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    <span>{topOnePlayer.played}</span>
                    <span className="text-muted-foreground/40 mx-0.5">/</span>
                    <span className="text-emerald-500">{topOnePlayer.won}</span>
                    <span className="text-muted-foreground/40 mx-0.5">/</span>
                    <span className="text-rose-500">{topOnePlayer.lost}</span>
                  </div>
                </div>

                <div className="h-7 w-[1px] bg-border/60" />

                <div className="text-right">
                  <div className="text-[9px] font-sans font-bold uppercase text-amber-600 dark:text-amber-400">
                    AGG
                  </div>
                  <div className="text-sm sm:text-base font-black text-amber-500">
                    {topOnePlayer.aggregateScore}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABEL RANKING RESPONSIF ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            {/* Table Header Sticky */}
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-3 pr-1 text-center w-10">Rank</th>
                <th className="py-2.5 px-2">Player</th>
                {!isTeamView && <th className="py-2.5 px-2 hidden sm:table-cell">Team</th>}
                <th className="py-2.5 px-2 text-center font-mono">P/W/L</th>
                <th className="py-2.5 px-2 text-center font-mono">WPM</th>
                <th className="py-2.5 pr-3 pl-2 text-right font-mono">AGG</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border/40">
              {tablePlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isTeamView ? 5 : 6}
                    className="py-12 text-center text-xs text-muted-foreground italic"
                  >
                    Tidak ada data pemain pada kriteria ini.
                  </td>
                </tr>
              ) : (
                tablePlayers.map((p) => {
                  const isTopThree = !isTeamView && p.rank <= 3;
                  const rankBadgeColor =
                    p.rank === 1
                      ? "bg-amber-500 text-slate-950 font-black"
                      : p.rank === 2
                      ? "bg-slate-300 text-slate-900 font-bold"
                      : p.rank === 3
                      ? "bg-amber-700/80 text-white font-bold"
                      : "bg-muted/70 text-muted-foreground font-medium";

                  return (
                    <tr
                      key={`${p.ign}-${p.teamSlug}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Rank Number */}
                      <td className="py-2 pl-3 pr-1 text-center">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-mono ${rankBadgeColor}`}
                        >
                          {p.rank}
                        </span>
                      </td>

                      {/* Player IGN & Mobile Sub-Team */}
                      <td className="py-2 px-2 min-w-0">
                        <div className="font-bold text-foreground truncate max-w-[130px] sm:max-w-[200px]">
                          {p.ign}
                        </div>
                        {!isTeamView && (
                          <div className="text-[10px] text-muted-foreground truncate sm:hidden">
                            {p.teamName}
                          </div>
                        )}
                      </td>

                      {/* Tim (Desktop Cell) */}
                      {!isTeamView && (
                        <td className="py-2 px-2 hidden sm:table-cell text-muted-foreground truncate max-w-[140px]">
                          {p.teamName}
                        </td>
                      )}

                      {/* Record P/W/L */}
                      <td className="py-2 px-2 text-center font-mono whitespace-nowrap text-[11px]">
                        <span className="text-foreground/80">{p.played}</span>
                        <span className="text-muted-foreground/30 mx-0.5">/</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {p.won}
                        </span>
                        <span className="text-muted-foreground/30 mx-0.5">/</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {p.lost}
                        </span>
                      </td>

                      {/* WPM (Win Per Match %) */}
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-foreground/80">
                        {p.winRate}%
                      </td>

                      {/* Aggregate Points */}
                      <td className="py-2 pr-3 pl-2 text-right font-mono text-xs font-bold text-primary">
                        {p.aggregateScore}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
