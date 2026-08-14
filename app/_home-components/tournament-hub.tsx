"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";
import { ChevronRight, Trophy, Calendar, BookOpen, Layers } from "lucide-react";

function getMatchWeekNumber(dateString: string): number {
  if (!dateString) return 1;
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function getCurrentCalendarWeek(): number {
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
  const now = new Date().getTime();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function TournamentHub() {
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentWeek = useMemo(() => getCurrentCalendarWeek(), []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/tournament");
        const data = await res.json();
        if (data) {
          setSchedules(data.schedules || []);
          setMasterTeams(data.masterTeams || []);
        }
      } catch (e) {
        console.error("Gagal memuat hub turnamen:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Standardisasi schedules dengan weekNumber yang presisi
  const schedulesWithWeek = useMemo(() => {
    return schedules.map((m) => ({
      ...m,
      weekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));
  }, [schedules]);

  // Standing dihitung konsisten sesuai currentWeek
  const { topGroupA, topGroupB } = useMemo(() => {
    const standings = calculateStandings(schedulesWithWeek, masterTeams, currentWeek);
    const grpA = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_A)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const grpB = standings
      .filter((s) => s.groupName === DIVISION_MAP.GROUP_B)
      .slice(0, 2)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return { topGroupA: grpA, topGroupB: grpB };
  }, [schedulesWithWeek, masterTeams, currentWeek]);

  // Match yang sesuai schedule week aktif
  const currentWeekMatches = useMemo(() => {
    return schedulesWithWeek.filter((m) => m.weekNumber === currentWeek);
  }, [schedulesWithWeek, currentWeek]);

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const renderLeaderRow = (
    item: any,
    idx: number,
    groupColor: "GROUP_A" | "GROUP_B"
  ) => {
    const isGroupA = groupColor === "GROUP_A";

    return (
      <div
        key={item.teamId || item.teamName || idx}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border transition ${
          isGroupA
            ? "bg-sky-500/10 border-sky-500/30 border-l-4 border-l-sky-500"
            : "bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500"
        }`}
      >
        {/* TIM & RANK */}
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          <span
            className={`font-black text-xs shrink-0 ${
              isGroupA ? "text-sky-500" : "text-amber-500"
            }`}
          >
            #{idx + 1}
          </span>
          <img
            src={item.teamLogo || "/logo.webp"}
            alt=""
            className="h-4 w-4 shrink-0 object-contain"
          />
          <span className="font-bold text-[11px] truncate text-foreground">
            {item.teamName}
          </span>
        </div>

        {/* STATS KONSISTEN DENGAN STANDING TAB */}
        <div className="flex items-center gap-2.5 text-[10.5px] font-bold shrink-0">
          <span className="text-muted-foreground w-11 text-center">
            {item.matchWins}-{item.matchLosses}
          </span>

          <span
            className={`w-6 text-center ${
              item.roundDifference > 0
                ? "text-emerald-500"
                : item.roundDifference < 0
                ? "text-rose-500"
                : "text-muted-foreground"
            }`}
          >
            {item.roundDifference > 0
              ? `+${item.roundDifference}`
              : item.roundDifference}
          </span>

          <span className="w-5 text-center text-foreground font-extrabold">
            {item.setWins}
          </span>

          <span className="w-8 text-right font-black text-primary text-xs">
            {item.points}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* 1. QUICK ACTION GRID */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Link
          href="/tournament?tab=schedule"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Jadwal Match</span>
            <span className="text-[10px] text-muted-foreground">Week {currentWeek} Active</span>
          </div>
        </Link>

        <Link
          href="/tournament?tab=standing"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Klasemen</span>
            <span className="text-[10px] text-muted-foreground">Group & Global</span>
          </div>
        </Link>

        <Link
          href="/tournament/decks"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Decklist Tim</span>
            <span className="text-[10px] text-muted-foreground">Meta & Lineup</span>
          </div>
        </Link>

        <Link
          href="/rules"
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Rulebook</span>
            <span className="text-[10px] text-muted-foreground">Regulasi Resmi</span>
          </div>
        </Link>
      </div>

      {/* 2. MATCH & STANDING HIGHLIGHTS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        
        {/* WIDGET: JADWAL MATCH SESUAI SCHEDULE */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                MATCH WEEK {currentWeek}
              </h2>
            </div>
            <Link
              href="/tournament?tab=schedule"
              className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
            >
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
              Memuat data pertandingan...
            </div>
          ) : currentWeekMatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada jadwal pertandingan untuk Week {currentWeek}.
            </div>
          ) : (
            <div className="space-y-2">
              {currentWeekMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs hover:border-primary/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={m.teamALogo || "/logo.webp"}
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="truncate font-bold text-[11px]">
                      {m.teamAName}
                    </span>
                  </div>

                  <div className="px-3 text-center shrink-0">
                    {m.isFinished || (m.scoreA || 0) + (m.scoreB || 0) > 0 ? (
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-black text-primary">
                        {m.scoreA} - {m.scoreB}
                      </span>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        VS
                      </span>
                    )}
                    <span className="block text-[9px] text-muted-foreground mt-0.5">
                      {formatDate(m.matchDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                    <span className="truncate font-bold text-[11px] text-right">
                      {m.teamBName}
                    </span>
                    <img
                      src={m.teamBLogo || "/logo.webp"}
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WIDGET: PUNCAK KLASEMEN */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                PUNCAK KLASEMEN
              </h2>
            </div>
            <Link
              href="/tournament?tab=standing"
              className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
            >
              Full Standings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
              Menghitung klasemen...
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Group A */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-500">
                    Divisi {DIVISION_MAP.GROUP_A}
                  </span>
                  <div className="flex items-center gap-2.5 text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider pr-1">
                    <span className="w-11 text-center">W-L</span>
                    <span className="w-6 text-center">RD</span>
                    <span className="w-5 text-center">SET</span>
                    <span className="w-8 text-right text-primary">PTS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {topGroupA.map((t, idx) => renderLeaderRow(t, idx, "GROUP_A"))}
                </div>
              </div>

              {/* Group B */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Divisi {DIVISION_MAP.GROUP_B}
                  </span>
                  <div className="flex items-center gap-2.5 text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider pr-1">
                    <span className="w-11 text-center">W-L</span>
                    <span className="w-6 text-center">RD</span>
                    <span className="w-5 text-center">SET</span>
                    <span className="w-8 text-right text-primary">PTS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {topGroupB.map((t, idx) => renderLeaderRow(t, idx, "GROUP_B"))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 3. DISCORD BANNER */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs">
        <div className="space-y-0.5">
          <p className="font-extrabold text-foreground">Gabung Komunitas Discord Resmi</p>
          <p className="text-[11px] text-muted-foreground">
            Kordinasi referee, update live streaming, dan room match.
          </p>
        </div>
        <a
          href="https://discord.gg/teamwarsindo"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-[#5865F2] px-3.5 py-2 font-bold text-white shadow-xs hover:bg-[#4752C4] transition text-[11px] whitespace-nowrap"
        >
          Join Discord
        </a>
      </div>
    </div>
  );
              }
