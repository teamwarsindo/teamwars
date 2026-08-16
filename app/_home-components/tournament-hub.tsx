"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MatchScheduleItem, DIVISION_MAP, getCurrentServerWeek, TOURNAMENT_RULES } from "@/lib/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";
import { PhaseTimeline } from "./phase-timeline";
import { QuickActions } from "./quick-actions";
import { MatchCenter } from "./match-center";
import { StandingsSnapshot } from "./standings-snapshot";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

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

  // Standings: Top Divisi vs Top 8 Playoff (Kecuali Top Divisi)
  const { topGroupA, topGroupB, topGlobal, allStandings } = useMemo(() => {
    const standings = calculateStandings(schedulesWithWeek, masterTeams, currentWeek);

    // 1. Ambil 2 Teratas dari Masing-Masing Grup (Top Divisi)
    const grpA = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_A)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const grpB = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_B)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // 2. Kumpulkan seluruh tim Top Divisi agar dikecualikan dari Top Playoff
    const topDivisionTeamNames = new Set([
      ...grpA.map((t) => t.teamName.toLowerCase()),
      ...grpB.map((t) => t.teamName.toLowerCase()),
    ]);

    // 3. Ambil 8 Tim Terbaik DI LUAR Top Divisi
    const playoffCandidatesTop8 = standings
      .filter((t) => !topDivisionTeamNames.has(t.teamName.toLowerCase()))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
        return b.roundDifference - a.roundDifference;
      })
      .slice(0, 8)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return {
      topGroupA: grpA,
      topGroupB: grpB,
      topGlobal: playoffCandidatesTop8,
      allStandings: standings,
    };
  }, [schedulesWithWeek, masterTeams, currentWeek]);

  // Matches Categorization: Dengan Batasan 5 Jam (Auto-Expiry)
  const { liveMatches, todayMatches, upcomingMatches, recentResults } = useMemo(() => {
    const nowTime = Date.now();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const currentWeekOnly = schedulesWithWeek.filter(
      (m) => m.weekNumber === currentWeek && m.matchDate
    );

    // 1. LIVE MATCH: Harus ada streamLink, belum finish, mulai 30 menit sebelum s.d. maksimal 5 jam setelah tanding
    const live = currentWeekOnly.filter((m) => {
      if (!m.streamLink || m.isFinished) return false;
      const mTime = new Date(m.matchDate).getTime();
      return nowTime >= mTime - THIRTY_MINUTES_MS && nowTime <= mTime + FIVE_HOURS_MS;
    });

    const sortedAsc = [...currentWeekOnly].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    // 2. MAIN HARI INI: Tanggal hari ini, belum finish, belum lewat 5 jam, dan bukan yang sedang live
    const liveIds = new Set(live.map((l) => l.id));
    const today = sortedAsc.filter((m) => {
      const d = new Date(m.matchDate);
      const mTime = d.getTime();
      const matchDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const isWithin5Hours = nowTime <= mTime + FIVE_HOURS_MS;

      return matchDay === todayStr && !m.isFinished && isWithin5Hours && !liveIds.has(m.id);
    });

    // 3. PERTANDINGAN BERIKUTNYA (UPCOMING): Belum lewat batas waktu dan bukan hari ini
    const upcoming = sortedAsc
      .filter((m) => {
        const d = new Date(m.matchDate);
        const mTime = d.getTime();
        const matchDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return mTime > nowTime && matchDay !== todayStr && !m.isFinished;
      })
      .slice(0, 3);

    // 4. HASIL TERBARU (Maksimal 3 Match)
    const results = [...schedulesWithWeek]
      .filter((m) => m.isFinished)
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 3);

    return {
      liveMatches: live,
      todayMatches: today,
      upcomingMatches: upcoming,
      recentResults: results,
    };
  }, [schedulesWithWeek, currentWeek]);

  // Quick Team Search: Akurat Berdasarkan Target Tim
  const searchResult = useMemo(() => {
    if (!teamSearchQuery.trim()) return null;
    const q = teamSearchQuery.toLowerCase().trim();

    // Prioritaskan tim yang berawalan kata pencarian (starts-with), baru kemudian contains
    const matchedTeams = allStandings
      .filter((t) => t.teamName.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.teamName.toLowerCase().startsWith(q);
        const bStarts = b.teamName.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });

    const matchedTeam = matchedTeams[0];
    if (!matchedTeam) return "NOT_FOUND";

    // Kunci pencarian nextMatch secara presisi ke targetTeamName
    const targetTeamName = matchedTeam.teamName.toLowerCase();
    const nextMatch = schedulesWithWeek
      .filter((m) => {
        const isTeamPlaying =
          m.teamAName.toLowerCase() === targetTeamName ||
          m.teamBName.toLowerCase() === targetTeamName;
        return isTeamPlaying && !m.isFinished;
      })
      .sort(
        (a, b) =>
          new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
      )[0];

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

      {/* 2. MENU & PENCARIAN DENGAN TEAM PROFILE MODAL */}
      <QuickActions
        currentWeek={currentWeek}
        searchQuery={teamSearchQuery}
        onSearchChange={setTeamSearchQuery}
        searchResult={searchResult}
        allSchedules={schedulesWithWeek}
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
          <p className="font-extrabold text-foreground">
            Gabung Komunitas Discord Resmi
          </p>
          <p className="text-[11px] text-muted-foreground">
            Kordinasi referee, update live streaming, dan room match.
          </p>
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
