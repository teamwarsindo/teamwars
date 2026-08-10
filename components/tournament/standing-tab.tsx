"use client";

import { useState, useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

function getCurrentCalendarWeek(): number {
  const startDate = new Date("2026-08-03T00:00:00+07:00").getTime();
  const now = new Date().getTime();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const currentWeek = useMemo(() => getCurrentCalendarWeek(), []);

  // 🟢 1. SINKRONISASI DAFTAR WEEK DENGAN JADWAL
  const availableWeeks = useMemo(() => {
    if (!schedules.length) return [1];
    const weeksInSchedules = Array.from(
      new Set(schedules.map((s) => s.weekNumber || 1))
    ).sort((a, b) => a - b);

    // Pastikan minimal week berjalan ikut masuk jika jadwal sudah ada
    if (!weeksInSchedules.includes(currentWeek)) {
      weeksInSchedules.push(currentWeek);
      weeksInSchedules.sort((a, b) => a - b);
    }
    return weeksInSchedules;
  }, [schedules, currentWeek]);

  // Default filter ke minggu berjalan (atau minggu terbesar yang tersedia)
  const initialSelectedWeek = useMemo(() => {
    return availableWeeks.includes(currentWeek)
      ? currentWeek
      : availableWeeks[availableWeeks.length - 1] || 1;
  }, [availableWeeks, currentWeek]);

  const [selectedWeek, setSelectedWeek] = useState<number>(initialSelectedWeek);
  const [activeTab, setActiveTab] = useState<"GROUPS" | "GLOBAL">("GROUPS");

  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams, selectedWeek);
  }, [schedules, masterTeams, selectedWeek]);

  const groupAStandings = useMemo(() => {
    const list = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
    list.forEach((item, idx) => (item.rank = idx + 1));
    return list;
  }, [standings]);

  const groupBStandings = useMemo(() => {
    const list = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);
    list.forEach((item, idx) => (item.rank = idx + 1));
    return list;
  }, [standings]);

  const globalStandings = useMemo(() => {
    const topGroupA = groupAStandings.slice(0, 2);
    const topGroupB = groupBStandings.slice(0, 2);

    const top4Combined = [...topGroupA, ...topGroupB].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      return b.roundDifference - a.roundDifference;
    });

    const top4Names = new Set(top4Combined.map((t) => t.teamName));
    const remainingTeams = standings
      .filter((t) => !top4Names.has(t.teamName))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
        return b.roundDifference - a.roundDifference;
      });

    const combinedList = [...top4Combined, ...remainingTeams];

    return combinedList.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isTopGroup: idx < 4,
    }));
  }, [standings, groupAStandings, groupBStandings]);

  const renderTrendIcon = (trend?: "up" | "down" | "stay") => {
    if (trend === "up") return <span className="text-emerald-500 font-bold text-[9px]">▲</span>;
    if (trend === "down") return <span className="text-rose-500 font-bold text-[9px]">▼</span>;
    return <span className="text-muted-foreground/40 font-bold text-[9px]">➖</span>;
  };

  // 🟢 2. ADJUSTMENT LEBAR KOLOM & PADDING TABEL UNTUK HP
  const renderTable = (items: ExtendedStandingItem[], title: string, isGlobal = false) => (
    <div className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
        <span>🏆</span> {title}
      </h3>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-[11px] table-fixed">
          <thead className="bg-muted/60 border-b border-border text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider">
            <tr>
              <th className="py-2.5 pl-2 pr-1 text-center w-[12%]">RANK</th>
              <th className="py-2.5 pl-1 pr-1 w-[35%]">TEAMS</th>
              <th className="py-2.5 px-1 text-center w-[18%]">MATCH W-L</th>
              <th className="py-2.5 px-1 text-center w-[11%]">RD</th>
              <th className="py-2.5 px-1 text-center w-[11%]">SET WINS</th>
              <th className="py-2.5 pl-1 pr-3 text-center w-[13%] text-primary">POINTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-semibold text-foreground">
            {items.map((item) => {
              let rowStyle = "hover:bg-muted/20 transition";

              if (isGlobal) {
                if (item.rank <= 4) {
                  rowStyle = "bg-amber-500/10 hover:bg-amber-500/15 transition border-l-2 border-l-amber-500";
                } else if (item.rank <= 12) {
                  rowStyle = "bg-sky-500/10 hover:bg-sky-500/15 transition border-l-2 border-l-sky-500";
                }
              }

              return (
                <tr key={item.teamId || item.teamName} className={rowStyle}>
                  {/* RANK */}
                  <td className="py-2 pl-2 pr-1 text-center font-bold">
                    <div className="flex items-center justify-center gap-0.5">
                      {renderTrendIcon(item.rankTrend)}
                      <span>{item.rank}</span>
                    </div>
                  </td>

                  {/* TEAMS */}
                  <td className="py-2 pl-1 pr-1 truncate">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={item.teamLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                      <span className="font-bold text-foreground truncate text-[10.5px]">{item.teamName}</span>
                    </div>
                  </td>

                  {/* MATCH W-L */}
                  <td className="py-2 px-1 text-center font-bold text-[10.5px]">
                    {item.matchWins}-{item.matchLosses}
                  </td>

                  {/* RD */}
                  <td className="py-2 px-1 text-center font-bold text-[10.5px]">
                    <span className={item.roundDifference > 0 ? "text-emerald-500" : item.roundDifference < 0 ? "text-rose-500" : "text-muted-foreground"}>
                      {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                    </span>
                  </td>

                  {/* SET WINS */}
                  <td className="py-2 px-1 text-center font-extrabold text-foreground text-[10.5px]">
                    {item.setWins}
                  </td>

                  {/* POINTS (Memberikan Padding Kanan Lebih) */}
                  <td className="py-2 pl-1 pr-3 text-center font-black text-primary text-xs">
                    {item.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KOTAK SWITCHER TAB DENGAN UKURAN KOTAK SAMA BESAR */}
      <div className="flex flex-col gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={() => setActiveTab("GROUPS")}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
              activeTab === "GROUPS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            📊 Divisi Group
          </button>
          <button
            onClick={() => setActiveTab("GLOBAL")}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
              activeTab === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            🌐 Standing Global (Playoff)
          </button>
        </div>

        {/* FILTER WEEK DENGAN PILIHAN SINKRON */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
          <label className="text-xs font-semibold text-muted-foreground">Filter:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-background border border-input rounded-xl px-3 py-1 text-xs font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KONTEN TAB */}
      {activeTab === "GROUPS" ? (
        <div className="space-y-6">
          {renderTable(groupAStandings, `Divisi ${DIVISION_MAP.GROUP_A}`)}
          {renderTable(groupBStandings, `Divisi ${DIVISION_MAP.GROUP_B}`)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-card border border-border rounded-xl text-[11px] space-y-1">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              💡 <span>Ketentuan Kualifikasi Playoff:</span>
            </p>
            <div className="flex flex-col gap-1 pl-4 text-muted-foreground font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>
                  <strong className="text-amber-500 font-bold">Warna Kuning (Rank 1-4):</strong> Lolos Otomatis (Top 2 Group A & Group B).
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0"></span>
                <span>
                  <strong className="text-sky-400 font-bold">Warna Biru (Rank 5-12):</strong> Lolos Playoff Wildcard (Top 8 Global tersisa).
                </span>
              </div>
            </div>
          </div>

          {renderTable(globalStandings, "Standing Global Kualifikasi Playoff", true)}
        </div>
      )}
    </div>
  );
}
