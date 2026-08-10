"use client";

import { useState, useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"GROUPS" | "GLOBAL">("GROUPS");

  // Dapatkan jumlah week maksimal
  const maxWeek = useMemo(() => {
    if (!schedules.length) return 1;
    return Math.max(...schedules.map((s) => s.weekNumber || 1));
  }, [schedules]);

  // Hitung Standing Akumulatif berdasarkan Week
  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams, selectedWeek);
  }, [schedules, masterTeams, selectedWeek]);

  // Split per Divisi/Grup
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

  // Kalkulasi Standing Global & Playoff Qualifiers
  const globalStandings = useMemo(() => {
    const list = [...standings];
    // Ambil Top 2 dari Group A & Group B
    const top2GroupANames = new Set(groupAStandings.slice(0, 2).map((t) => t.teamName));
    const top2GroupBNames = new Set(groupBStandings.slice(0, 2).map((t) => t.teamName));

    return list.map((item) => {
      const isTopGroup = top2GroupANames.has(item.teamName) || top2GroupBNames.has(item.teamName);
      return { ...item, isTopGroup };
    });
  }, [standings, groupAStandings, groupBStandings]);

  // Helper Icon Trend
  const renderTrendIcon = (trend?: "up" | "down" | "stay") => {
    if (trend === "up") return <span className="text-emerald-400 font-bold text-xs" title="Naik Rank">▲</span>;
    if (trend === "down") return <span className="text-rose-500 font-bold text-xs" title="Turun Rank">▼</span>;
    return <span className="text-muted-foreground/60 font-bold text-xs" title="Peringkat Tetap">➖</span>;
  };

  // Render Table
  const renderTable = (items: ExtendedStandingItem[], title: string, isGlobal = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
          <span>🏆</span> {title}
        </h3>
        <span className="text-[11px] font-bold text-muted-foreground">
          Akumulasi S/D Week {selectedWeek}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            <tr>
              <th className="py-3 px-3 text-center">RANK</th>
              <th className="py-3 px-3">TEAMS</th>
              <th className="py-3 px-2 text-center">MATCH W-L</th>
              <th className="py-3 px-2 text-center">RD</th>
              <th className="py-3 px-2 text-center">SET WINS</th>
              <th className="py-3 px-3 text-center text-primary">POINTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-bold">
            {items.map((item, idx) => {
              // Highlight untuk Standing Global
              let rowStyle = "hover:bg-muted/20 transition";
              let badgeLabel = null;

              if (isGlobal) {
                if (item.isTopGroup) {
                  rowStyle = "bg-amber-500/10 hover:bg-amber-500/20 transition border-l-4 border-l-amber-500";
                  badgeLabel = <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">TOP 2 GROUP</span>;
                } else {
                  // Cari peringkat non-top group untuk slot Playoff (Top 8 Global tersisa)
                  const nonTopGroupList = items.filter((i) => !i.isTopGroup);
                  const wildcardRank = nonTopGroupList.findIndex((i) => i.teamName === item.teamName) + 1;
                  if (wildcardRank <= 8) {
                    rowStyle = "bg-primary/10 hover:bg-primary/20 transition border-l-4 border-l-primary";
                    badgeLabel = <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-black">PLAYOFF # {wildcardRank}</span>;
                  }
                }
              }

              return (
                <tr key={item.teamId || idx} className={rowStyle}>
                  {/* RANK & TREND */}
                  <td className="py-2.5 px-3 text-center font-black">
                    <div className="flex items-center justify-center gap-1.5">
                      {renderTrendIcon(item.rankTrend)}
                      <span className="text-foreground text-sm">{item.rank}</span>
                    </div>
                  </td>

                  {/* TEAMS */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <img src={item.teamLogo} alt="" className="h-6 w-6 object-contain" />
                      <span className="font-extrabold text-foreground">{item.teamName}</span>
                      {badgeLabel}
                    </div>
                  </td>

                  {/* MATCH W-L */}
                  <td className="py-2.5 px-2 text-center font-bold text-foreground">
                    {item.matchWins}-{item.matchLosses}
                  </td>

                  {/* RD (Round Difference) */}
                  <td className="py-2.5 px-2 text-center">
                    <span className={item.roundDifference > 0 ? "text-emerald-400" : item.roundDifference < 0 ? "text-rose-500" : "text-muted-foreground"}>
                      {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                    </span>
                  </td>

                  {/* SET WINS */}
                  <td className="py-2.5 px-2 text-center text-muted-foreground">
                    {item.setWins}
                  </td>

                  {/* POINTS */}
                  <td className="py-2.5 px-3 text-center font-black text-primary text-sm">
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
    <div className="space-y-6">
      {/* CONTROLS HEADER (FILTER WEEK & TAB STANDING) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl shadow-sm">
        {/* TAB SWITCHER */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("GROUPS")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeTab === "GROUPS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Divisi Group
          </button>
          <button
            onClick={() => setActiveTab("GLOBAL")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeTab === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🌐 Standing Global (Playoff)
          </button>
        </div>

        {/* WEEK FILTER */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-bold text-muted-foreground">Filter Akumulasi:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-black text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KONTEN TABLE */}
      {activeTab === "GROUPS" ? (
        <div className="space-y-8">
          {renderTable(groupAStandings, `Divisi ${DIVISION_MAP.GROUP_A}`)}
          {renderTable(groupBStandings, `Divisi ${DIVISION_MAP.GROUP_B}`)}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs text-muted-foreground flex items-center justify-between">
            <span>
              💡 <b>Kualifikasi Playoff:</b> Top 2 dari tiap grup (kuning) lolos otomatis, ditambah Top 8 tersisa dari Standing Global (biru).
            </span>
          </div>
          {renderTable(globalStandings, "Standing Global Kualifikasi Playoff", true)}
        </div>
      )}
    </div>
  );
}