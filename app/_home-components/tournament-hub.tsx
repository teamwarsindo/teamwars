"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  getWibDateKey,
} from "@/app/tournament/_library";
import {
  calculateStandings,
  buildGlobalStandings,
  ExtendedStandingItem,
} from "@/app/tournament/_library/calculator";
import { PhaseTimeline } from "./phase-timeline";
import { QuickActions } from "./quick-actions";
import { MatchCenter } from "./match-center";
import { Trophy, ChevronRight } from "lucide-react";

interface TournamentHubProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
  loading?: boolean;
}

export function TournamentHub({
  schedules = [],
  masterTeams = [],
  loading = false,
}: TournamentHubProps) {
  const currentWeek = useMemo(() => getCurrentServerWeek(), []);

  // 1. HITUNG STANDINGS (DIVISI & GLOBAL WILDCARD)
  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  const globalStandings = useMemo(() => {
    return buildGlobalStandings(standings);
  }, [standings]);

  // 2. KLASIFIKASI MATCH CENTER (LIVE GUARD 5 JAM, MAIN HARI INI, BERIKUTNYA)
  const { liveMatches, todayMatches, upcomingMatches, recentResults } = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    const todayDateStrWIB = getWibDateKey(now);
    const fiveHoursInMs = 5 * 60 * 60 * 1000;

    // Filter seluruh match pekan berjalan
    const weekSchedules = schedules.filter((m) => (m.weekNumber || 1) === currentWeek);

    // A. LIVE MATCH: Memiliki streamLink, belum selesai, dan durasi <= 5 jam dari matchDate
    const live = weekSchedules.filter((m) => {
      if (m.isFinished) return false;
      if (!m.streamLink || !m.matchDate) return false;

      const matchTime = new Date(m.matchDate).getTime();
      return nowTime <= matchTime + fiveHoursInMs;
    });

    const liveIds = new Set(live.map((m) => m.id));

    // B. MAIN HARI INI: Tanggal hari ini (WIB), belum selesai, dan tidak sedang aktif di blok live
    const today = weekSchedules.filter((m) => {
      if (m.isFinished || liveIds.has(m.id) || !m.matchDate) return false;
      return getWibDateKey(new Date(m.matchDate)) === todayDateStrWIB;
    });

    const todayIds = new Set(today.map((m) => m.id));

    // C. PERTANDINGAN BERIKUTNYA: Tanggal masa depan dalam pekan ini
    const upcoming = weekSchedules
      .filter((m) => {
        if (m.isFinished || liveIds.has(m.id) || todayIds.has(m.id) || !m.matchDate) return false;
        return getWibDateKey(new Date(m.matchDate)) > todayDateStrWIB;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      .slice(0, 3);

    // D. HASIL TERBARU: Match pekan ini yang sudah selesai
    const finished = weekSchedules
      .filter((m) => {
        const sA = Number(m.scoreA) || 0;
        const sB = Number(m.scoreB) || 0;
        return Boolean(m.isFinished) || sA + sB > 0;
      })
      .sort((a, b) => new Date(b.matchDate || 0).getTime() - new Date(a.matchDate || 0).getTime())
      .slice(0, 5);

    return {
      liveMatches: live,
      todayMatches: today,
      upcomingMatches: upcoming,
      recentResults: finished,
    };
  }, [schedules, currentWeek]);

  // Ambil Top 5 Klasemen Divisi A & Divisi B untuk Mini Standing Home
  const topGroupA = useMemo(
    () => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A).slice(0, 5),
    [standings]
  );
  const topGroupB = useMemo(
    () => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B).slice(0, 5),
    [standings]
  );

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* TIMELINE FASE TURNAMEN */}
      <PhaseTimeline currentWeek={currentWeek} />

      {/* SHORTCUT ACTIONS */}
      <QuickActions />

      {/* GRID UTAMA: MATCH CENTER & MINI STANDINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* KOLOM KIRI: MATCH CENTER (JADWAL & HASIL) */}
        <div className="lg:col-span-7 xl:col-span-8">
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
        </div>

        {/* KOLOM KANAN: MINI STANDINGS (KONSISTENSI UKURAN & LABEL PTS) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 text-card-foreground shadow-xs space-y-3">
            {/* HEADER MINI STANDING */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5 font-black text-xs md:text-sm text-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                <span>Klasemen Sementara</span>
              </div>
              <Link
                href="/tournament?tab=standings"
                className="inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"
              >
                Full <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* TABEL PREVIEW: DIVISI A */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 px-1">
                {DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "")}
              </span>
              <MiniStandingTable items={topGroupA} />
            </div>

            {/* TABEL PREVIEW: DIVISI B */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 px-1">
                {DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "")}
              </span>
              <MiniStandingTable items={topGroupB} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen Mini Table dengan struktur kolom dan label konsisten (PTS, +/-, W-L)
 */
function MiniStandingTable({ items = [] }: { items: ExtendedStandingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground italic">
        Belum ada data pertandingan.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      {/* HEADER TABEL */}
      <div className="flex items-center px-2.5 py-1.5 bg-muted/40 border-b border-border/50 text-[9px] sm:text-[10px] font-bold text-muted-foreground">
        <span className="w-6 text-center shrink-0">#</span>
        <span className="flex-1 min-w-0 pr-1">TIM</span>
        <span className="w-10 text-center shrink-0">W-L</span>
        <span className="w-9 text-center shrink-0">DIFF</span>
        <span className="w-8 text-center shrink-0 font-black text-primary">PTS</span>
      </div>

      {/* ROWS */}
      <div className="divide-y divide-border/40 text-[11px] sm:text-xs">
        {items.map((t, idx) => {
          const rawDiff = Number(t.roundDifference) || 0;
          const diffSign = rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`;

          return (
            <div
              key={t.teamName || idx}
              className="flex items-center px-2.5 py-1.5 hover:bg-muted/30 transition"
            >
              <span className="w-6 text-center font-bold text-muted-foreground shrink-0 text-[10px]">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-1.5 pr-1">
                <img
                  src={t.teamLogo || "/logo.webp"}
                  alt=""
                  className="h-4 w-4 object-contain shrink-0"
                />
                <span className="truncate font-semibold text-foreground">
                  {t.teamName}
                </span>
              </div>
              <span className="w-10 text-center font-bold text-foreground shrink-0 text-[10.5px]">
                {t.matchWins}-{t.matchLosses}
              </span>
              <span
                className={`w-9 text-center font-bold shrink-0 text-[10.5px] ${
                  rawDiff > 0
                    ? "text-emerald-500"
                    : rawDiff < 0
                    ? "text-rose-500"
                    : "text-muted-foreground"
                }`}
              >
                {diffSign}
              </span>
              <span className="w-8 text-center font-black text-primary shrink-0 text-[11px]">
                {t.points ?? t.matchWins}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
                                           }
              
