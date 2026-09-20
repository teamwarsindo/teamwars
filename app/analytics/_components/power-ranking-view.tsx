"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  calculatePowerRanking,
  MatchReportData,
  TeamRosterData,
  PowerRankingPlayer,
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

// 🟢 Multi-tier Sorting: Win -> WPM -> AGG -> Abjad Nama Pemain
function sortPowerRankings(data: PowerRankingPlayer[]): PowerRankingPlayer[] {
  return [...data].sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.agg !== a.agg) return b.agg - a.agg;
    return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
  });
}

export function PowerRankingView({
  reports = [],
  teams = [],
  maxActiveWeek = 1,
  selectedGroup,
  selectedTeam,
  selectedWeek,
}: PowerRankingViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchedTeamSlug = useMemo(() => {
    if (!selectedTeam || selectedTeam === "ALL") return undefined;
    const found = teams.find(
      (t) =>
        t.name.toLowerCase() === selectedTeam.toLowerCase() ||
        t.slug?.toLowerCase() === selectedTeam.toLowerCase()
    );
    return found ? found.slug || found.name : selectedTeam;
  }, [teams, selectedTeam]);

  const filterScope =
    selectedTeam && selectedTeam !== "ALL"
      ? "TEAM"
      : selectedGroup === "Anda Yakin?" || selectedGroup?.includes("Anda Yakin")
      ? "Anda Yakin?"
      : selectedGroup === "Sakurasawa Fighters" || selectedGroup?.includes("Sakurasawa")
      ? "Sakurasawa Fighters"
      : "GLOBAL";

  const targetWeek = typeof selectedWeek === "number" ? selectedWeek : maxActiveWeek;

  // 1. Ranking Pekan Aktif (diterapkan multi-tier sorting & re-index rank)
  const { players: currentPlayers, grandTotal } = useMemo(() => {
    const res = calculatePowerRanking({
      reports,
      targetWeek,
      teams,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    });

    const sorted = sortPowerRankings(res.players);
    const reindexed = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));

    return { players: reindexed, grandTotal: res.grandTotal };
  }, [reports, targetWeek, teams, filterScope, matchedTeamSlug]);

  // 2. Ranking Pekan Sebelumnya (untuk Delta +/-)
  const prevPlayers = useMemo(() => {
    if (targetWeek <= 1) return [];
    const res = calculatePowerRanking({
      reports,
      targetWeek: targetWeek - 1,
      teams,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    });

    const sorted = sortPowerRankings(res.players);
    return sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [reports, targetWeek, teams, filterScope, matchedTeamSlug]);

  // Map logo tim & Map warna aksen tim
  const { teamLogoMap, teamColorMap } = useMemo(() => {
    const lMap = new Map<string, string>();
    const cMap = new Map<string, string>();

    teams.forEach((t) => {
      if (t.logo) {
        lMap.set(t.name.toLowerCase(), t.logo);
        if (t.slug) lMap.set(t.slug.toLowerCase(), t.logo);
      }
      const color = (t as any).color || (t as any).themeColor || (t as any).hexColor;
      if (color) {
        cMap.set(t.name.toLowerCase(), color);
        if (t.slug) cMap.set(t.slug.toLowerCase(), color);
      }
    });

    return { teamLogoMap: lMap, teamColorMap: cMap };
  }, [teams]);

  // 3. Gabungkan diff rank
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
  const isSearching = searchQuery.trim().length > 0;

  const isGlobalMode =
    (selectedGroup === "ALL" || !selectedGroup) && (!selectedTeam || selectedTeam === "ALL");
  const showMvpCard = isGlobalMode && !isSearching && playersWithDiff.length >= 1;
  const top1 = showMvpCard ? playersWithDiff[0] : null;

  const tablePlayers = useMemo(() => {
    let list = showMvpCard ? playersWithDiff.slice(1) : playersWithDiff;
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      list = playersWithDiff.filter(
        (p) => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [playersWithDiff, showMvpCard, isSearching, searchQuery]);

  return (
    <div className="w-full space-y-3">
      {/* ── MVP #1 CARD DINAMIS DENGAN WARNA TIM ── */}
      {showMvpCard && (
        <PowerRankingPodium
          top1={top1}
          teamLogoMap={teamLogoMap}
          teamColorMap={teamColorMap}
        />
      )}

      {/* ── SEARCH BAR ── */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari pemain atau tim..."
          className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── TABEL POWER RANKING ── */}
      <PowerRankingTable
        players={tablePlayers}
        isTeamView={isTeamView}
        grandTotal={grandTotal}
        teamLogoMap={teamLogoMap}
      />
    </div>
  );
  }
        
