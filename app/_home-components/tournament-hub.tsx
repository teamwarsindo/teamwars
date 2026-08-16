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

  // Baseline pekan server (Senin 08.00 WIB)
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

  // 1. Single Source of Truth: Standing dihitung berdasar currentWeek
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
    return globalData
      .filter((item) => !item.isTopGroup)
      .slice(0, 4);
  }, [standings]);

  // 2. Kunci seluruh match ke currentWeek
  const currentWeekSchedules = useMemo(() => {
    return schedules.filter((m) => (m.weekNumber || 1) === currentWeek);
  }, [schedules, currentWeek]);

  // 3. Live Matches di currentWeek
  const liveMatches = useMemo(() => {
    return currentWeekSchedules.filter((m) => Boolean(m.streamLink) && !m.isFinished);
  }, [currentWeekSchedules]);

  // Format tanggal hari ini dalam format WIB (YYYY-MM-DD)
  const todayDateStrWIB = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  // 4. Main Hari Ini di currentWeek
  const todayMatches = useMemo(() => {
    return currentWeekSchedules.filter(
      (m) =>
        !m.isFinished &&
        Boolean(m.matchDate) &&
        m.matchDate.startsWith(todayDateStrWIB)
    );
  }, [currentWeekSchedules, todayDateStrWIB]);

  // 5. Pertandingan Berikutnya: Khusus match di HARI SELANJUTNYA (> today) dalam currentWeek
  const upcomingMatches = useMemo(() => {
    return currentWeekSchedules
      .filter((m) => {
        if (m.isFinished) return false;
        if (!m.matchDate) return false;
        const matchDayStr = m.matchDate.slice(0, 10);
        // Hanya ambil match hari esok / selanjutnya di pekan ini
        return matchDayStr > todayDateStrWIB;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      .slice(0, 3);
  }, [currentWeekSchedules, todayDateStrWIB]);

  const recentResults = useMemo(() => {
    return currentWeekSchedules
      .filter((m) => m.isFinished)
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 3);
  }, [currentWeekSchedules]);

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
