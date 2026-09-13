"use client";

import { useState, useMemo } from "react";
import { DIVISION_MAP } from "@/app/tournament/_library";
import {
  MatchReportData,
  TeamRosterData,
  calculatePowerRanking,
} from "../_library/power-ranking";
import { PowerRankingFilter } from "./power-ranking-filter";
import { PowerRankingSpotlight } from "./power-ranking-spotlight";
import { PowerRankingRow } from "./power-ranking-row";
import { Zap } from "lucide-react";

interface PowerRankingViewProps {
  reports: MatchReportData[];
  teams: TeamRosterData[];
  maxActiveWeek: number;
}

export function PowerRankingView({
  reports,
  teams,
  maxActiveWeek,
}: PowerRankingViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<
    "ALL" | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B
  >("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL");
  const [selectedWeek, setSelectedWeek] = useState<number>(maxActiveWeek);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: maxActiveWeek }, (_, i) => i + 1);
  }, [maxActiveWeek]);

  const isFilterActive =
    selectedGroup !== "ALL" || selectedTeam !== "ALL" || selectedWeek !== maxActiveWeek;

  const handleReset = () => {
    setSelectedGroup("ALL");
    setSelectedTeam("ALL");
    setSelectedWeek(maxActiveWeek);
  };

  const filterScope =
    selectedTeam !== "ALL"
      ? "TEAM"
      : selectedGroup === DIVISION_MAP.GROUP_A
      ? "Anda Yakin?"
      : selectedGroup === DIVISION_MAP.GROUP_B
      ? "Sakurasawa Fighters"
      : "GLOBAL";

  const { players, grandTotal } = useMemo(() => {
    return calculatePowerRanking({
      reports,
      targetWeek: selectedWeek,
      teams,
      filterScope,
      selectedTeamSlug: selectedTeam !== "ALL" ? selectedTeam : undefined,
    });
  }, [reports, teams, selectedWeek, filterScope, selectedTeam]);

  const isTeamView = filterScope === "TEAM";
  const topOnePlayer = !isTeamView && players.length > 0 ? players[0] : null;
  const tablePlayers = !isTeamView && players.length > 0 ? players.slice(1) : players;

  return (
    <div className="w-full space-y-3.5 md:space-y-4">
      {/* 1. FILTER MIRIP STANDING */}
      <PowerRankingFilter
        selectedGroup={selectedGroup}
        onGroupChange={(g) => {
          setSelectedGroup(g);
          if (g !== "ALL") setSelectedTeam("ALL");
        }}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        availableWeeks={availableWeeks}
        selectedTeam={selectedTeam}
        onTeamChange={(t) => {
          setSelectedTeam(t);
          if (t !== "ALL") setSelectedGroup("ALL");
        }}
        teams={teams}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

      {/* 2. STICKY SPOTLIGHT RANK 1 (KHUSUS GLOBAL / DIVISI) */}
      {topOnePlayer && <PowerRankingSpotlight player={topOnePlayer} />}

      {/* 3. TABEL POWER RANKING */}
      <div className="space-y-2 w-full">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 px-1">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
          <span>
            {isTeamView
              ? `Team Power Ranking: ${teams.find((t) => t.slug === selectedTeam)?.name}`
              : selectedGroup !== "ALL"
              ? `${selectedGroup} Power Ranking`
              : "Global Power Ranking"}
          </span>
        </h3>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs md:text-sm table-fixed">
            <thead className="bg-muted/60 border-b border-border text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-tight">
              <tr>
                <th className="py-2.5 px-1 text-center w-[11%]">RANK</th>
                <th className="py-2.5 pl-1.5 pr-1 w-[36%]">PLAYER</th>
                <th className="py-2.5 px-1 w-[22%]">TEAM</th>
                <th className="py-2.5 px-0.5 text-center w-[11%] text-primary leading-tight">P/W/L</th>
                <th className="py-2.5 px-0.5 text-center w-[10%] leading-tight">WPM</th>
                <th className="py-2.5 pr-1.5 pl-0.5 text-center w-[10%] leading-tight">AGG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              {tablePlayers.length > 0 ? (
                tablePlayers.map((player) => (
                  <PowerRankingRow
                    key={`${player.teamSlug}-${player.name}`}
                    player={player}
                    isTeamView={isTeamView}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada data pemain pada pekan ini.
                  </td>
                </tr>
              )}
            </tbody>
            {isTeamView && grandTotal && (
              <tfoot className="bg-muted/70 font-black border-t-2 border-border text-[10.5px] sm:text-xs">
                <tr>
                  <td colSpan={3} className="py-2.5 pl-3 text-left uppercase text-foreground">
                    Grand Total
                  </td>
                  <td className="py-2.5 px-0.5 text-center text-primary">
                    {grandTotal.played} / {grandTotal.won} / {grandTotal.lost}
                  </td>
                  <td className="py-2.5 px-0.5 text-center text-primary">
                    {grandTotal.wpm.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-1.5 pl-0.5 text-center">
                    <span
                      className={
                        grandTotal.agg > 0
                          ? "text-emerald-500"
                          : grandTotal.agg < 0
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      }
                    >
                      {grandTotal.agg > 0 ? `+${grandTotal.agg}` : grandTotal.agg}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
                      }
