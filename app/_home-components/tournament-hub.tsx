"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/lib/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";
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

  const topGlobal = useMemo(() => {
    const top4Names = new Set([...topGroupA, ...topGroupB].map((t) => t.teamName));
    return standings
      .filter((t) => !top4Names.has(t.teamName))
      .slice(0, TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA);
  }, [standings, topGroupA, topGroupB]);

  // Ekstrak match untuk Match Center
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
    return schedules
      .filter((m) => !m.isFinished && (m.weekNumber || 1) === currentWeek)
      .slice(0, 4);
  }, [schedules, currentWeek]);

  const recentResults = useMemo(() => {
    return schedules
      .filter((m) => m.isFinished)
      .slice(-4)
      .reverse();
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* 1. TIMELINE FASE TURNAMEN */}
      <PhaseTimeline currentWeek={currentWeek} />

      {/* 2. MENU CEPAT & PENCARIAN PROFIL TIM */}
      <QuickActions
        currentWeek={currentWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allTeams={masterTeams.length > 0 ? masterTeams : standings}
        allSchedules={schedules}
      />

      {/* 3. GRID MATCH CENTER & STANDINGS SNAPSHOT */}
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