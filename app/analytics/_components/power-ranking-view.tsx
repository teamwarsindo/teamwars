"use client";

import { useMemo } from "react";
import {
  calculatePowerRanking,
  MatchReportData,
  TeamRosterData,
} from "../_library/power-ranking";
import { PowerRankingPodium } from "./power-ranking-podium";
import { PowerRankingTable, RankedPlayerWithDiff } from "./power-ranking-table";

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

  // 1. Ranking Pekan Aktif
  const { players: currentPlayers, grandTotal } = useMemo(() => {
    return calculatePowerRanking({
      reports,
      targetWeek,
      teams,
      filterScope,
      selectedTeamSlug: selectedTeam && selectedTeam !== "ALL" ? selectedTeam : undefined,
    });
  }, [reports, targetWeek, teams, filterScope, selectedTeam]);

  // 2. Ranking Pekan Sebelumnya (untuk Delta +/-)
  const prevPlayers = useMemo(() => {
    if (targetWeek <= 1) return [];
    return calculatePowerRanking({
      reports,
      targetWeek: targetWeek - 1,
      teams,
      filterScope,
      selectedTeamSlug: selectedTeam && selectedTeam !== "ALL" ? selectedTeam : undefined,
    }).players;
  }, [reports, targetWeek, teams, filterScope, selectedTeam]);

  // Map logo tim
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

  // 3. Gabungkan selisih peringkat
  const playersWithDiff: RankedPlayerWithDiff[] = useMemo(() => {
    const prevRankMap = new Map<string, number>();
    prevPlayers.forEach((p) => {
      prevRankMap.set(`${p.teamSlug}:${p.name.toLowerCase()}`, p.rank);
    });

    return currentPlayers.map((p) => {
      const key = `${p.teamSlug}:${p.name.toLowerCase()}`;
      const prevRank = prevRankMap.get(key);

      if (prevRank === undefined || targetWeek <= 1) {
        return { ...p, rankDiff: 0, isNew: targetWeek > 1 };
      }
      return {
        ...p,
        rankDiff: prevRank - p.rank,
        isNew: false,
      };
    });
  }, [currentPlayers, prevPlayers, targetWeek]);

  const isTeamView = filterScope === "TEAM";

  const top1 = !isTeamView && playersWithDiff.length >= 1 ? playersWithDiff[0] : null;
  const top2 = !isTeamView && playersWithDiff.length >= 2 ? playersWithDiff[1] : null;
  const top3 = !isTeamView && playersWithDiff.length >= 3 ? playersWithDiff[2] : null;
  const hasPodium = !isTeamView && top1 !== null;

  const tablePlayers = hasPodium ? playersWithDiff.slice(3) : playersWithDiff;

  return (
    <div className="w-full space-y-4">
      {hasPodium && (
        <PowerRankingPodium
          top1={top1}
          top2={top2}
          top3={top3}
          teamLogoMap={teamLogoMap}
        />
      )}

      <PowerRankingTable
        players={tablePlayers}
        isTeamView={isTeamView}
        grandTotal={grandTotal}
        teamLogoMap={teamLogoMap}
      />
    </div>
  );
}
