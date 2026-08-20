"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
  getWibDateKey,
  getTeamSlug,
} from "@/app/tournament/_library";
import {
  calculateStandings,
  buildGlobalStandings,
  getNextDateMatches,
} from "@/app/tournament/_library/calculator";
import { PhaseTimeline } from "./phase-timeline";
import { QuickActions } from "./quick-actions";
import { MatchCenter } from "./match-center";
import { StandingsSnapshot } from "./standings-snapshot";

export function TournamentHub() {
  const [rawSchedules, setRawSchedules] = useState<MatchScheduleItem[]>([]);
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
          setRawSchedules(data.schedules || []);
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

  const schedules: MatchScheduleItem[] = useMemo(() => {
    const colorMap = new Map<string, string>();
    masterTeams.forEach((t) => {
      const slugKey = `teams:${getTeamSlug(t.name || t.teamName || "")}`;
      const hexColor = t.color || t.primaryColor || t.teamColor || t[slugKey]?.color;
      if (hexColor) {
        colorMap.set((t.name || t.teamName).toLowerCase(), hexColor);
      }
    });

    return rawSchedules.map((m) => ({
      ...m,
      teamAColor: m.teamAColor || colorMap.get(m.teamAName.toLowerCase()),
      teamBColor: m.teamBColor || colorMap.get(m.teamBName.toLowerCase()),
    }));
  }, [rawSchedules, masterTeams]);

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
    const globalData = buildGlobalStandings(standings);
    return globalData.filter((item) => !item.isTopGroup).slice(0, 4);
  }, [standings]);

  const currentWeekSchedules = useMemo(() => {
    return schedules.filter((m) => (m.weekNumber || 1) === currentWeek);
  }, [schedules, currentWeek]);

  const liveMatches = useMemo(() => {
    return currentWeekSchedules.filter((m) => Boolean(m.streamLink) && !m.isFinished);
  }, [currentWeekSchedules]);

  const todayDateStrWIB = useMemo(() => getWibDateKey(), []);

  // DIKECUALIKAN MATCH LIVE AGAR TIDAK GANDA DENGAN BAGIAN SEDANG BERLANGSUNG
  const todayMatches = useMemo(() => {
    return currentWeekSchedules.filter(
      (m) =>
        !m.isFinished &&
        !m.streamLink &&
        Boolean(m.matchDate) &&
        getWibDateKey(new Date(m.matchDate)) === todayDateStrWIB
    );
  }, [currentWeekSchedules, todayDateStrWIB]);

  const upcomingMatches = useMemo(() => {
    return getNextDateMatches(currentWeekSchedules, todayDateStrWIB);
  }, [currentWeekSchedules, todayDateStrWIB]);

  const recentResults = useMemo(() => {
    return currentWeekSchedules
      .filter((m) => m.isFinished)
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 3);
  }, [currentWeekSchedules]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
          standings={standings}
          allSchedules={schedules}
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
