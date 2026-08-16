"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { calculateStandings, ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { PhaseTimeline } from "./phase-timeline";
import { QuickActions } from "./quick-actions";
import { MatchCenter } from "./match-center";
import { StandingsSnapshot } from "./standings-snapshot";

export function TournamentHub() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);

  useEffect(() => {
    async function fetchTournament() {
      try {
        const res = await fetch("/api/tournament");
        const data = await res.json();
        if (data) {
          setSchedules(data.schedules || []);
          setMasterTeams(data.masterTeams || []);
        }
      } catch (err) {
        console.error("Error loading tournament hub:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTournament();
  }, []);

  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams, currentWeek);
  }, [schedules, masterTeams, currentWeek]);

  // Top 2 Divisi A & B (Lolos Quarter Finals)
  const topGroupA = useMemo(() => {
    return standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_A)
      .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP);
  }, [standings]);

  const topGroupB = useMemo(() => {
    return standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_B)
      .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP);
  }, [standings]);

  // Top 4 Wildcard (Murni dari tim di luar Top 2 masing-masing grup)
  const topGlobal = useMemo(() => {
    const topTeamNames = new Set([
      ...topGroupA.map((t) => t.teamName),
      ...topGroupB.map((t) => t.teamName),
    ]);

    return standings
      .filter((s) => !topTeamNames.has(s.teamName))
      .sort((a, b) => {
        const totalMatchA = a.matchWins + a.matchLosses;
        const totalMatchB = b.matchWins + b.matchLosses;
        if (totalMatchB !== totalMatchA) return totalMatchB - totalMatchA;
        if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
        if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
        return b.setWins - a.setWins;
      })
      .slice(0, 4);
  }, [standings, topGroupA, topGroupB]);

  // Live Matches
  const liveMatches = useMemo(() => {
    return schedules.filter((m) => Boolean(m.streamLink) && !m.isFinished);
  }, [schedules]);

  // Main Hari Ini
  const todayMatches = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return schedules.filter(
      (m) =>
        !m.isFinished &&
        Boolean(m.matchDate) &&
        m.matchDate.startsWith(todayStr)
    );
  }, [schedules]);

  // Pertandingan Berikutnya
  const upcomingMatches = useMemo(() => {
    const nowTime = Date.now();
    return schedules
      .filter((m) => {
        if (m.isFinished) return false;
        const mTime = new Date(m.matchDate).getTime();
        return !isNaN(mTime) && mTime >= nowTime;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      .slice(0, 3);
  }, [schedules]);

  // 3 Match Terakhir yang Selesai
  const recentResults = useMemo(() => {
    return schedules
      .filter((m) => m.isFinished)
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 3);
  }, [schedules]);

  return (
    <div className="space-y-6">
      <PhaseTimeline currentWeek={currentWeek} />

      <QuickActions
        currentWeek={currentWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allTeams={standings}
        allSchedules={schedules}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MatchCenter
          currentWeek={currentWeek}
          loading={loading}
          liveMatches={liveMatches}
          todayMatches={todayMatches}
          upcomingMatches={upcomingMatches}
          recentResults={recentResults}
        />

        <StandingsSnapshot
          loading={loading}
          topGroupA={topGroupA}
          topGroupB={topGroupB}
          topGlobal={topGlobal}
        />
      </div>
    </div>
  );
}
