"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";
import { ChevronRight, Trophy, Calendar, BookOpen } from "lucide-react";

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

  // Standardisasi schedule
  const schedulesWithWeek = useMemo(() => {
    return schedules.map((m) => ({
      ...m,
      weekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));
  }, [schedules]);

  // Klasemen Top 2 Per Group
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

  // Pisahkan match Hari Ini & Upcoming berdasarkan waktu server
  const { todayMatches, upcomingMatches } = useMemo(() => {
    const now = new Date();
    // Konversi tanggal hari ini format YYYY-MM-DD lokal
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const sortedByDate = [...schedulesWithWeek]
      .filter((m) => m.matchDate)
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    const todayList = sortedByDate.filter((m) => {
      const d = new Date(m.matchDate);
      const matchDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return matchDayStr === todayStr;
    });

    const upcomingList = sortedByDate
      .filter((m) => {
        const matchTime = new Date(m.matchDate).getTime();
        const isFuture = matchTime > now.getTime();
        const d = new Date(m.matchDate);
        const matchDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        // Ambil yang di masa depan dan bukan hari ini
        return isFuture && matchDayStr !== todayStr && !m.isFinished;
      })
      .slice(0, 3); // Ambil Top 3 match terdekat

    return { todayMatches: todayList, upcomingMatches: upcomingList };
  }, [schedulesWithWeek]);

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

  const renderMatchCard = (m: MatchScheduleItem) => (
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
        <span className="truncate font-bold text-[11px]">{m.teamAName}</span>
      </div>

      <div className="px-2 text-center shrink-0 min-w-[75px]">
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
  );

  const renderStandingTable = (items: any[], groupColor: "GROUP_A" | "GROUP_B") => {
    const isGroupA = groupColor === "GROUP_A";

    return (
      <table className="w-full text-left text-[11px] table-fixed">
        <tbody className="space-y-1.5">
          {items.map((item, idx) => (
            <tr
              key={item.teamId || item.teamName || idx}
              className={`rounded-xl border transition flex items-center mb-1.5 px-2.5 py-1.5 ${
                isGroupA
                  ? "bg-sky-500/10 border-sky-500/30 border-l-4 border-l-sky-500"
                  : "bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500"
              }`}
            >
              {/* RANK + LOGO + NAMA TIM */}
              <td className="w-[52%] flex items-center gap-2 min-w-0 pr-1">
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
              </td>

              {/* MATCH W-L */}
              <td className="w-[16%] text-center font-bold text-muted-foreground text-[10.5px]">
                {item.matchWins}-{item.matchLosses}
              </td>

              {/* RD */}
              <td className="w-[11%] text-center font-bold text-[10.5px]">
                <span
                  className={
                    item.roundDifference > 0
                      ? "text-emerald-500"
                      : item.roundDifference < 0
                      ? "text-rose-500"
                      : "text-muted-foreground"
                  }
                >
                  {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                </span>
              </td>

              {/* SET */}
              <td className="w-[10%] text-center font-extrabold text-foreground text-[10.5px]">
                {item.setWins}
              </td>

              {/* PTS */}
              <td className="w-[11%] text-right font-black text-primary text-xs pr-1">
                {item.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* 1. QUICK ACTION GRID (3 MENU) */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link
          href="/tournament?tab=schedule"
          className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Jadwal Match</span>
            <span className="text-[9.5px] text-muted-foreground">Week {currentWeek}</span>
          </div>
        </Link>

        <Link
          href="/tournament?tab=standing"
          className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Klasemen</span>
            <span className="text-[9.5px] text-muted-foreground">Group & Playoff</span>
          </div>
        </Link>

        <Link
          href="/rules"
          className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-muted/30 shadow-xs"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">Rulebook</span>
            <span className="text-[9.5px] text-muted-foreground">Regulasi Resmi</span>
          </div>
        </Link>
      </div>

      {/* 2. MATCH & STANDING HIGHLIGHTS */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        
        {/* WIDGET: JADWAL MATCH (HARI INI & UPCOMING) */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                Jadwal Pertandingan
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
              Memuat jadwal tanding...
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* MATCH HARI INI */}
              {todayMatches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Sedang / Main Hari Ini
                  </span>
                  <div className="space-y-2">
                    {todayMatches.map((m) => renderMatchCard(m))}
                  </div>
                </div>
              )}

              {/* UPCOMING MATCHES (TOP 3) */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pertandingan Berikutnya
                </span>
                {upcomingMatches.length === 0 && todayMatches.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Tidak ada jadwal pertandingan terdekat.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingMatches.map((m) => renderMatchCard(m))}
                  </div>
                )}
              </div>
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
            <div className="space-y-4">
              {/* GROUP A */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <span className="w-[52%] text-sky-500 font-black text-[10px]">
                    {DIVISION_MAP.GROUP_A}
                  </span>
                  <span className="w-[16%] text-center">W-L</span>
                  <span className="w-[11%] text-center">RD</span>
                  <span className="w-[10%] text-center">SET</span>
                  <span className="w-[11%] text-right text-primary pr-1">PTS</span>
                </div>
                {renderStandingTable(topGroupA, "GROUP_A")}
              </div>

              {/* GROUP B */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <span className="w-[52%] text-amber-500 font-black text-[10px]">
                    {DIVISION_MAP.GROUP_B}
                  </span>
                  <span className="w-[16%] text-center">W-L</span>
                  <span className="w-[11%] text-center">RD</span>
                  <span className="w-[10%] text-center">SET</span>
                  <span className="w-[11%] text-right text-primary pr-1">PTS</span>
                </div>
                {renderStandingTable(topGroupB, "GROUP_B")}
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
