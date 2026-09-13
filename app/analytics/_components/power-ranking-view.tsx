"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
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
  const filterScope =
    selectedTeam && selectedTeam !== "ALL"
      ? "TEAM"
      : selectedGroup === "Anda Yakin?" || selectedGroup?.includes("Anda Yakin")
      ? "Anda Yakin?"
      : selectedGroup === "Sakurasawa Fighters" || selectedGroup?.includes("Sakurasawa")
      ? "Sakurasawa Fighters"
      : "GLOBAL";

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

  // Buat lookup logo tim
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      if (t.logo) {
        map.set(t.name.toLowerCase(), t.logo);
        map.set(t.slug.toLowerCase(), t.logo);
      }
    });
    return map;
  }, [teams]);

  const isTeamView = filterScope === "TEAM";
  const topOnePlayer = !isTeamView && players.length > 0 ? players[0] : null;
  const tablePlayers = !isTeamView && players.length > 0 ? players.slice(1) : players;

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-medium">0</span>;
  };

  return (
    <div className="w-full space-y-3">
      {/* ── KOTAK TOP 1 SPOTLIGHT (STICKY PINNED) ── */}
      {topOnePlayer && (
        <div className="sticky top-[100px] sm:top-[106px] z-30 mb-3">
          <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-amber-500/30 p-3 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Kiri: Avatar Bundar & Info Player */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/40 border border-amber-500/40 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                    {topOnePlayer.teamLogo ? (
                      <Image
                        src={topOnePlayer.teamLogo}
                        alt={topOnePlayer.teamName}
                        width={44}
                        height={44}
                        className="rounded-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <Trophy className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow-xs border border-card">
                    1
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs sm:text-sm text-foreground truncate">
                      {topOnePlayer.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md text-[8px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                      MVP #1
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    {topOnePlayer.teamName}
                  </div>
                </div>
              </div>

              {/* Kanan: Ringkasan Skor Terpisah */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono text-center">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <div>
                    <div className="text-[8px] font-sans font-bold uppercase text-muted-foreground">P</div>
                    <span className="font-bold text-foreground">{topOnePlayer.played}</span>
                  </div>
                  <div>
                    <div className="text-[8px] font-sans font-bold uppercase text-emerald-500">W</div>
                    <span className="font-bold text-emerald-500">{topOnePlayer.won}</span>
                  </div>
                  <div>
                    <div className="text-[8px] font-sans font-bold uppercase text-rose-500">L</div>
                    <span className="font-bold text-rose-500">{topOnePlayer.lost}</span>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-border/60" />

                <div className="text-right">
                  <div className="text-[8px] font-sans font-bold uppercase text-muted-foreground">AGG</div>
                  <div className="text-sm font-black">{renderAgg(topOnePlayer.agg)}</div>
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
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-3 pr-1 text-center w-10">Rank</th>
                <th className="py-2.5 px-2">Player</th>
                <th className="py-2.5 px-1.5 text-center font-mono w-8">P</th>
                <th className="py-2.5 px-1.5 text-center font-mono w-8 text-emerald-600 dark:text-emerald-400">W</th>
                <th className="py-2.5 px-1.5 text-center font-mono w-8 text-rose-600 dark:text-rose-400">L</th>
                <th className="py-2.5 px-2 text-center font-mono w-12">WPM</th>
                <th className="py-2.5 pr-3 pl-2 text-right font-mono w-12">AGG</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40">
              {tablePlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground italic">
                    Tidak ada data pemain pada kriteria ini.
                  </td>
                </tr>
              ) : (
                tablePlayers.map((p) => {
                  const rankBadgeColor =
                    p.rank === 1
                      ? "bg-amber-500 text-slate-950 font-black"
                      : p.rank === 2
                      ? "bg-slate-300 text-slate-900 font-bold"
                      : p.rank === 3
                      ? "bg-amber-700/80 text-white font-bold"
                      : "bg-muted/70 text-muted-foreground font-medium";

                  const teamLogo =
                    p.teamLogo ||
                    teamLogoMap.get(p.teamName.toLowerCase()) ||
                    teamLogoMap.get(p.teamSlug.toLowerCase());

                  return (
                    <tr key={`${p.name}-${p.teamSlug}`} className="hover:bg-muted/30 transition-colors">
                      {/* Rank */}
                      <td className="py-2.5 pl-3 pr-1 text-center">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-mono ${rankBadgeColor}`}
                        >
                          {p.rank}
                        </span>
                      </td>

                      {/* Player Name + Logo Tim Bundar di sebelah nama tim */}
                      <td className="py-2.5 px-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground truncate max-w-[125px] sm:max-w-[200px]">
                            {p.name}
                          </span>
                          {p.isExPlayer && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                              EX
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate mt-0.5">
                          {teamLogo && (
                            <Image
                              src={teamLogo}
                              alt={p.teamName}
                              width={14}
                              height={14}
                              className="rounded-full object-contain shrink-0 border border-border/50"
                              unoptimized
                            />
                          )}
                          <span className="truncate">{p.teamName}</span>
                        </div>
                      </td>

                      {/* P / W / L Terpisah */}
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-foreground/80">
                        {p.played}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {p.won}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        {p.lost}
                      </td>

                      {/* WPM */}
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-foreground/80">
                        {p.wpm}
                      </td>

                      {/* AGG */}
                      <td className="py-2.5 pr-3 pl-2 text-right font-mono text-xs">
                        {renderAgg(p.agg)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Grand Total Khusus View Tim */}
            {isTeamView && grandTotal && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-bold text-[11px]">
                  <td className="py-2.5 pl-3 pr-1 text-center font-mono text-muted-foreground">Σ</td>
                  <td className="py-2.5 px-2 text-foreground">TOTAL ROSTER</td>
                  <td className="py-2.5 px-1.5 text-center font-mono">{grandTotal.played}</td>
                  <td className="py-2.5 px-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400">
                    {grandTotal.won}
                  </td>
                  <td className="py-2.5 px-1.5 text-center font-mono text-rose-600 dark:text-rose-400">
                    {grandTotal.lost}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-foreground/80">{grandTotal.wpm}</td>
                  <td className="py-2.5 pr-3 pl-2 text-right font-mono">{renderAgg(grandTotal.agg)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
    }
