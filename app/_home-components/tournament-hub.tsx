"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { calculateStandings, buildGlobalStandings } from "@/app/tournament/_library/calculator";
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

  // 1. Top 2 Divisi A & B langsung dari data standing grup
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

  // 2. Ambil langsung dari Standing Global resmi (murni tim wildcard peringkat 1-4)
  const topGlobal = useMemo(() => {
    const globalStandingData = buildGlobalStandings(standings);
    return globalStandingData
      .filter((item) => !item.isTopGroup)
      .slice(0, 4);
  }, [standings]);

  const liveMatches = useMemo(() => {
    return schedules.filter((m) => Boolean(m.streamLink) && !m.isFinished);
  }, [schedules]);

  const todayMatches = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return schedules.filter(
      (m) =>
        !m.isFinished &&
        Boolean(m.matchDate) &&
        m.matchDate.startsWith(todayStr)
    );
  }, [schedules]);

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
