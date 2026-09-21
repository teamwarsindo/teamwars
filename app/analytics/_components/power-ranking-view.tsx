"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  calculatePowerRanking,
  MatchReportData,
  TeamRosterData,
  PowerRankingPlayer,
  FreeDuelistRecord,
} from "../_library/power-ranking";
import { calculateStandings } from "@/app/tournament/_library/calculator";
import { PowerRankingPodium } from "./power-ranking-podium";
import { PowerRankingTeamCard } from "./power-ranking-team-card";
import { PowerRankingTable, RankedPlayerWithDiff } from "./power-ranking-table";
import { ScheduleItem } from "./match-reports-view";

interface PowerRankingViewProps {
  reports: MatchReportData[];
  teams: TeamRosterData[];
  schedules?: ScheduleItem[];
  freeDuelists?: FreeDuelistRecord[];
  maxActiveWeek: number;
  selectedGroup: string;
  selectedTeam: string;
  selectedWeek: number | "";
}

const normalizeKey = (str?: string) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

// Multi-tier Sorting: Prioritas Pemain Main (played > 0) -> Win -> WPM -> AGG -> Abjad Nama Pemain
function sortPowerRankings(data: PowerRankingPlayer[]): PowerRankingPlayer[] {
  return [...data].sort((a, b) => {
    const aPlayed = a.played > 0 ? 1 : 0;
    const bPlayed = b.played > 0 ? 1 : 0;
    if (bPlayed !== aPlayed) {
      return bPlayed - aPlayed;
    }

    if (b.won !== a.won) return b.won - a.won;
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.agg !== a.agg) return b.agg - a.agg;
    return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
  });
}

export function PowerRankingView({
  reports = [],
  teams = [],
  schedules = [],
  freeDuelists = [],
  maxActiveWeek = 1,
  selectedGroup,
  selectedTeam,
  selectedWeek,
}: PowerRankingViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const matchedTeamSlug = useMemo(() => {
    if (!selectedTeam || selectedTeam === "ALL") return undefined;
    const normTarget = normalizeKey(selectedTeam);
    const found = teams.find(
      (t) =>
        normalizeKey(t.name) === normTarget ||
        (t.slug && normalizeKey(t.slug) === normTarget)
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
    const res = calculatePowerRanking({
      reports,
      targetWeek,
      teams,
      freeDuelists,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    });

    const sorted = sortPowerRankings(res.players);
    const reindexed = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));

    return { players: reindexed, grandTotal: res.grandTotal };
  }, [reports, targetWeek, teams, freeDuelists, filterScope, matchedTeamSlug]);

  // 2. Ranking Pekan Sebelumnya (Delta +/-)
  const prevPlayers = useMemo(() => {
    if (targetWeek <= 1) return [];
    const res = calculatePowerRanking({
      reports,
      targetWeek: targetWeek - 1,
      teams,
      freeDuelists,
      filterScope,
      selectedTeamSlug: matchedTeamSlug,
    });

    const sorted = sortPowerRankings(res.players);
    return sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [reports, targetWeek, teams, freeDuelists, filterScope, matchedTeamSlug]);

  // Map logo tim & Map warna aksen tim (Diambil dari teams & schedules)
  const { teamLogoMap, teamColorMap } = useMemo(() => {
    const lMap = new Map<string, string>();
    const cMap = new Map<string, string>();

    teams.forEach((t) => {
      if (t.logo) {
        lMap.set(t.name.toLowerCase(), t.logo);
        if (t.slug) lMap.set(t.slug.toLowerCase(), t.logo);
        lMap.set(normalizeKey(t.name), t.logo);
        if (t.slug) lMap.set(normalizeKey(t.slug), t.logo);
      }
    });

    schedules.forEach((s: any) => {
      if (s.teamAName) {
        const keyA = s.teamAName.toLowerCase();
        const normA = normalizeKey(s.teamAName);
        const colorA = s.teamAColor || s.teamAWarna || s.colorA || s.warnaA;
        if (colorA) {
          cMap.set(keyA, colorA);
          cMap.set(normA, colorA);
        }
        if (s.teamALogo) {
          lMap.set(keyA, s.teamALogo);
          lMap.set(normA, s.teamALogo);
        }
      }

      if (s.teamBName) {
        const keyB = s.teamBName.toLowerCase();
        const normB = normalizeKey(s.teamBName);
        const colorB = s.teamBColor || s.teamBWarna || s.colorB || s.warnaB;
        if (colorB) {
          cMap.set(keyB, colorB);
          cMap.set(normB, colorB);
        }
        if (s.teamBLogo) {
          lMap.set(keyB, s.teamBLogo);
          lMap.set(normB, s.teamBLogo);
        }
      }
    });

    return { teamLogoMap: lMap, teamColorMap: cMap };
  }, [teams, schedules]);

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

  // 4. Hitung Standing Tim Resmi & Kualifikasi Playoff Akurat
  const selectedTeamStanding = useMemo(() => {
    if (!selectedTeam || selectedTeam === "ALL" || !schedules.length || !teams.length) {
      return undefined;
    }

    const filteredSchedules = schedules.filter((s: any) => {
      const matchWeek = Number(s.weekNumber || s.week || s.matchWeek || 1);
      return matchWeek <= targetWeek;
    });

    const standings = calculateStandings(filteredSchedules as any, teams as any);
    const normTarget = normalizeKey(selectedTeam);

    // Pisahkan per grup
    const groupMap = new Map<string, any[]>();
    standings.forEach((st: any) => {
      const g = st.groupName || "Regular Division";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(st);
    });

    const wildcardCandidates: any[] = [];

    // Tentukan rank grup: Top 2 lolos Quarter Finals, rank 3+ jadi kandidat Wildcard[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span)
    groupMap.forEach((teamList) => {
      teamList.forEach((t, idx) => {
        t.groupRank = idx + 1;
        if (t.groupRank > 2) {
          wildcardCandidates.push(t);
        }
      });
    });

    // Urutkan kandidat Wildcard (hanya tim dari Rank 3 ke bawah)[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span)
    wildcardCandidates.sort((a, b) => {
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      const diffA = Number(String(a.roundDifference ?? a.pointsDifference ?? 0).replace(/^\+/, ""));
      const diffB = Number(String(b.roundDifference ?? b.pointsDifference ?? 0).replace(/^\+/, ""));
      if (diffB !== diffA) return diffB - diffA;
      const scoredA = a.setWins ?? a.pointsScored ?? 0;
      const scoredB = b.setWins ?? b.pointsScored ?? 0;
      return scoredB - scoredA;
    });

    wildcardCandidates.forEach((t, idx) => {
      t.wildcardRank = idx + 1;
    });

    // Temukan tim yang sedang dipilih
    const targetTeam = standings.find((s: any) => {
      const nName = normalizeKey(s.teamName);
      const nSlug = s.teamSlug ? normalizeKey(s.teamSlug) : "";
      return nName === normTarget || nSlug === normTarget;
    });

    if (!targetTeam) return undefined;

    let rankLabel = `#${targetTeam.groupRank} Group`;
    let stageLabel = "Tereliminasi";
    let isQualified = false;

    if (targetTeam.groupRank <= 2) {
      rankLabel = `#${targetTeam.groupRank} Group`;
      stageLabel = "QUARTER FINALS";
      isQualified = true;
    } else {
      rankLabel = `#${targetTeam.wildcardRank} Wildcard`;
      if (targetTeam.wildcardRank <= 8) {
        stageLabel = "PLAY-INS";
        isQualified = true;
      } else {
        stageLabel = "TERELIMINASI";
        isQualified = false;
      }
    }

    return {
      ...targetTeam,
      rawDiff: Number(
        String(targetTeam.roundDifference ?? targetTeam.pointsDifference ?? 0).replace(/^\+/, "")
      ),
      qualification: {
        rankLabel,
        stageLabel,
        isQualified,
      },
    };
  }, [selectedTeam, schedules, teams, targetWeek]);

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
      {/* MVP #1 CARD */}
      {showMvpCard && (
        <PowerRankingPodium
          top1={top1}
          teamLogoMap={teamLogoMap}
          teamColorMap={teamColorMap}
        />
      )}

      {/* TEAM RECORD CARD */}
      {isTeamView && !isSearching && (
        <PowerRankingTeamCard
          teamName={selectedTeam}
          standing={selectedTeamStanding}
          teamLogoMap={teamLogoMap}
          teamColorMap={teamColorMap}
          totalRosterCount={currentPlayers.length}
          currentWeek={targetWeek}
        />
      )}

      {/* SEARCH BAR */}
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

      {/* TABEL POWER RANKING */}
      <PowerRankingTable
        players={tablePlayers}
        isTeamView={isTeamView}
        grandTotal={grandTotal}
        teamLogoMap={teamLogoMap}
        standing={selectedTeamStanding}
      />
    </div>
  );
                                 }
        
