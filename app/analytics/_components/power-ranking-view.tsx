"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Temukan slug tim yang cocok dari nama tim yang dipilih
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

  // 1. Ranking Pekan Aktif
  const { players: currentPlayers, grandTotal } = useMemo(() => {
    return calculatePowerRanking({
      reports,
      targetWeek,
      teams,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    });
  }, [reports, targetWeek, teams, filterScope, matchedTeamSlug]);

  // 2. Ranking Pekan Sebelumnya (untuk Delta +/-)
  const prevPlayers = useMemo(() => {
    if (targetWeek <= 1) return [];
    return calculatePowerRanking({
      reports,
      targetWeek: targetWeek - 1,
      teams,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    }).players;
  }, [reports, targetWeek, teams, filterScope, matchedTeamSlug]);

  // Map logo tim
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      if (t.logo) {
        map.set(t.name.toLowerCase(), t.logo);
        if (t.slug) map.set(t.slug.toLowerCase(), t.logo);
      }
    });
    return map;
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

  // MVP HANYA muncul di mode GLOBAL penuh (tanpa filter divisi dan tanpa filter tim)
  const isGlobalMode =
    (selectedGroup === "ALL" || !selectedGroup) && (!selectedTeam || selectedTeam === "ALL");
  const showMvpCard = isGlobalMode && !isSearching && playersWithDiff.length >= 1;
  const top1 = showMvpCard ? playersWithDiff[0] : null;

  // Tabel: jika MVP card tampil, mulai dari index 1. Jika divisi/tim dipilih, tampilkan semua mulai dari rank 1.
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
      {/* ── MVP #1 CARD (HANYA MUNCUL DI MODE GLOBAL) ── */}
      {showMvpCard && (
        <PowerRankingPodium
          top1={top1}
          teamLogoMap={teamLogoMap}
        />
      )}

      {/* ── SEARCH BAR PEMAIN ── */}
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

      {/* ── TABEL RANKING LEGA & PROPORSIONAL ── */}
      <PowerRankingTable
        players={tablePlayers}
        isTeamView={isTeamView}
        grandTotal={grandTotal}
        teamLogoMap={teamLogoMap}
      />
    </div>
  );
}
