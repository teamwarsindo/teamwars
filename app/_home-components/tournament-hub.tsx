"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";
import { PhaseTimeline } from "./phase-timeline";
import { QuickActions } from "./quick-actions";
import { MatchCenter } from "./match-center";
import { StandingsSnapshot } from "./standings-snapshot";

function getMatchWeekNumber(dateString: string): number {
  if (!dateString) return 1;
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;
  return Math.max(1, Math.floor(Math.floor((matchDate - startDate) / 86400000) / 7) + 1);
}

function getCurrentCalendarWeek(): number {
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
  return Math.max(1, Math.floor(Math.floor((Date.now() - startDate) / 86400000) / 7) + 1);
}

export function TournamentHub() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const currentWeek = useMemo(() => getCurrentCalendarWeek(), []);

  useEffect(() => {
    fetch("/api/tournament")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSchedules(data.schedules || []);
          setMasterTeams(data.masterTeams || []);
        }
      })
      .catch((err) => console.error("Gagal load turnamen:", err))
      .finally(() => setLoading(false));
  }, []);

  const schedulesWithWeek = useMemo(() => {
    return schedules.map((m) => ({
      ...m,
      weekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));
  }, [schedules]);

  // Standings Data
  const { topGroupA, topGroupB, topGlobal, allStandings } = useMemo(() => {
    const standings = calculateStandings(schedulesWithWeek, masterTeams, currentWeek);
    const grpA = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_A)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const grpB = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_B)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const globalTop = [...standings]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
        return b.roundDifference - a.roundDifference;
      })
      .slice(0, 4)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return { topGroupA: grpA, topGroupB: grpB, topGlobal: globalTop, allStandings: standings };
  }, [schedulesWithWeek, masterTeams, currentWeek]);

  // Matches Categorization
  const { liveMatches, todayMatches, upcomingMatches, recentResults } = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const currentWeekOnly = schedulesWithWeek.filter(
      (m) => m.weekNumber === currentWeek && m.matchDate
    );

    const live = currentWeekOnly.filter((m) => Boolean(m.streamLink) && !m.isFinished);
    const sortedAsc = [...currentWeekOnly].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    const today = sortedAsc.filter((m) => {
      const d = new Date(m.matchDate);
      const matchDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return matchDay === todayStr && !m.isFinished && !m.streamLink;
    });

    const upcoming = sortedAsc
      .filter((m) => {
        const d = new Date(m.matchDate);
        const matchDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return d.getTime() > now.getTime() && matchDay !== todayStr && !m.isFinished;
      })
      .slice(0, 3);

    const results = [...schedulesWithWeek]
      .filter((m) => m.isFinished || (m.scoreA || 0) + (m.scoreB || 0) > 0)
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 4);

    return { liveMatches: live, todayMatches: today, upcomingMatches: upcoming, recentResults: results };
  }, [schedulesWithWeek, currentWeek]);

  // Quick Team Search Handler
  const searchResult = useMemo(() => {
    if (!teamSearchQuery.trim()) return null;
    const q = teamSearchQuery.toLowerCase();

    const matchedTeam = allStandings.find((t) => t.teamName.toLowerCase().includes(q));
    if (!matchedTeam) return "NOT_FOUND";

    const nextMatch = schedulesWithWeek.find(
      (m) =>
        (m.teamAName.toLowerCase().includes(q) || m.teamBName.toLowerCase().includes(q)) &&
        !m.isFinished
    );

    return { team: matchedTeam, nextMatch };
  }, [teamSearchQuery, allStandings, schedulesWithWeek]);

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    return isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d);
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* 1. TIMELINE PROGRES */}
      <PhaseTimeline currentWeek={currentWeek} />

      {/* 2. MENU & PENCARIAN */}
      <QuickActions
        currentWeek={currentWeek}
        searchQuery={teamSearchQuery}
        onSearchChange={setTeamSearchQuery}
        searchResult={searchResult}
        formatDate={formatDate}
      />

      {/* 3. GRID MATCH & STANDINGS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MatchCenter
          currentWeek={currentWeek}
          loading={loading}
          liveMatches={liveMatches}
          todayMatches={todayMatches}
          upcomingMatches={upcomingMatches}
          recentResults={recentResults}
          formatDate={formatDate}
        />

        <StandingsSnapshot
          loading={loading}
          topGroupA={topGroupA}
          topGroupB={topGroupB}
          topGlobal={topGlobal}
        />
      </div>

      {/* 4. DISCORD BANNER */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs">
        <div className="space-y-0.5">
          <p className="font-extrabold text-foreground">Gabung Komunitas Discord Resmi</p>
          <p className="text-[11px] text-muted-foreground">Kordinasi referee, update live streaming, dan room match.</p>
        </div>
        <Link
          href="/invite"
          className="rounded-xl bg-[#5865F2] px-3.5 py-2 font-bold text-white shadow-xs hover:bg-[#4752C4] transition text-[11px] whitespace-nowrap"
        >
          Join Discord
        </Link>
      </div>
    </div>
  );
}
