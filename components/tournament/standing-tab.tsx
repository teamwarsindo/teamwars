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

function buildGlobalStandings(
  standings: ExtendedStandingItem[]
): (ExtendedStandingItem & { globalRank: number; globalRankTrend?: "up" | "down" | "stay" })[] {
  const groupA = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  const groupB = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);

  const topGroupA = groupA.slice(0, 2).map((t, i) => ({
    ...t,
    isTopGroup: true,
    groupColor: "GROUP_A",
    customRankLabel: `Top ${i + 1}`,
  }));

  const topGroupB = groupB.slice(0, 2).map((t, i) => ({
    ...t,
    isTopGroup: true,
    groupColor: "GROUP_B",
    customRankLabel: `Top ${i + 1}`,
  }));

  const top4Combined = [...topGroupA, ...topGroupB];
  const top4Names = new Set(top4Combined.map((t) => t.teamName));

  const remainingTeams = standings
    .filter((t) => !top4Names.has(t.teamName))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      return b.roundDifference - a.roundDifference;
    })
    .map((t, idx) => ({
      ...t,
      rank: idx + 1,
      isTopGroup: false,
      groupColor: t.groupName === DIVISION_MAP.GROUP_A ? "GROUP_A" : "GROUP_B",
      customRankLabel: `${idx + 1}`,
    }));

  const fullCombined = [...top4Combined, ...remainingTeams];

  return fullCombined.map((item, index) => ({
    ...item,
    globalRank: index + 1,
  }));
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const currentWeek = useMemo(() => getCurrentCalendarWeek(), []);

  const availableWeeksUpToCurrent = useMemo(() => {
    const weeksInSchedules = Array.from(
      new Set(schedules.map((s) => s.weekNumber || 1))
    ).filter((w) => w <= currentWeek);

    const fullRange = Array.from(
      new Set([...weeksInSchedules, ...Array.from({ length: currentWeek }, (_, i) => i + 1)])
    ).sort((a, b) => a - b);

    return fullRange;
  }, [schedules, currentWeek]);

  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [activeTab, setActiveTab] = useState<"GROUPS" | "GLOBAL">("GROUPS");

  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams, selectedWeek);
  }, [schedules, masterTeams, selectedWeek]);

  const groupAStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  }, [standings]);

  const groupBStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);
  }, [standings]);

  const globalStandings = useMemo(() => {
    const currentGlobal = buildGlobalStandings(standings);

    if (selectedWeek > 1) {
      const prevStandings = calculateStandings(schedules, masterTeams, selectedWeek - 1);
      const prevGlobal = buildGlobalStandings(prevStandings);
      const prevGlobalRankMap = new Map<string, number>();

      prevGlobal.forEach((item) => {
        prevGlobalRankMap.set(item.teamName, item.globalRank);
      });

      return currentGlobal.map((item) => {
        const prevRank = prevGlobalRankMap.get(item.teamName);
        let trend: "up" | "down" | "stay" = "stay";

        if (typeof prevRank === "number") {
          if (item.globalRank < prevRank) trend = "up";
          else if (item.globalRank > prevRank) trend = "down";
        }

        return {
          ...item,
          globalRankTrend: trend,
        };
      });
    }

    return currentGlobal.map((item) => ({
      ...item,
      globalRankTrend: "stay" as const,
    }));
  }, [standings, schedules, masterTeams, selectedWeek]);

  const playoffQualifiedTeamNames = useMemo(() => {
    return new Set(
      globalStandings
        .filter((item) => !item.isTopGroup && item.rank <= 8)
        .map((item) => item.teamName.toLowerCase())
    );
  }, [globalStandings]);

  const renderTrendIcon = (trend?: "up" | "down" | "stay") => {
    if (trend === "up") return <span className="text-emerald-500 font-bold text-[9px]">▲</span>;
    if (trend === "down") return <span className="text-rose-500 font-bold text-[9px]">▼</span>;
    return <span className="text-muted-foreground/40 font-bold text-[9px]">➖</span>;
  };

  const renderTable = (items: any[], title: string, isGlobal = false) => (
    <div className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
        <span>🏆</span> {title}
      </h3>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-[11px] table-fixed">
          <thead className="bg-muted/60 border-b border-border text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider">
            <tr>
              <th className={`py-2 px-1 text-center ${isGlobal ? "w-[18%]" : "w-[12%]"}`}>RANK</th>
              <th className={`py-2 pl-1 pr-1 ${isGlobal ? "w-[32%]" : "w-[38%]"}`}>TEAMS</th>
              <th className="py-2 px-0.5 text-center w-[16%] leading-tight">
                MATCH<br />W-L
              </th>
              <th className="py-2 px-0.5 text-center w-[11%]">RD</th>
              <th className="py-2 px-0.5 text-center w-[11%]">SET WINS</th>
              <th className="py-2 pl-0.5 pr-2 text-center w-[12%] text-primary">POINTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-semibold text-foreground">
            {items.map((item: any, idx) => {
              let rowStyle = "hover:bg-muted/20 transition";

              if (isGlobal) {
                if (item.isTopGroup) {
                  rowStyle =
                    item.groupColor === "GROUP_A"
                      ? "bg-sky-500/15 hover:bg-sky-500/20 transition border-l-4 border-l-sky-500"
                      : "bg-amber-500/15 hover:bg-amber-500/20 transition border-l-4 border-l-amber-500";
                } else if (item.rank <= 8) {
                  rowStyle = "bg-emerald-500/15 hover:bg-emerald-500/20 transition border-l-4 border-l-emerald-500";
                } else {
                  rowStyle = "bg-rose-500/10 hover:bg-rose-500/15 transition border-l-4 border-l-rose-500/60";
                }
              } else {
                if (item.rank <= 2) {
                  rowStyle =
                    item.groupName === DIVISION_MAP.GROUP_A
                      ? "bg-sky-500/15 hover:bg-sky-500/20 transition border-l-4 border-l-sky-500"
                      : "bg-amber-500/15 hover:bg-amber-500/20 transition border-l-4 border-l-amber-500";
                } else if (playoffQualifiedTeamNames.has(item.teamName.toLowerCase())) {
                  rowStyle = "bg-emerald-500/10 hover:bg-emerald-500/15 transition border-l-4 border-l-emerald-500";
                } else {
                  rowStyle = "bg-rose-500/10 hover:bg-rose-500/15 transition border-l-4 border-l-rose-500/60";
                }
              }

              const trend = isGlobal ? item.globalRankTrend : item.rankTrend;
              const isEliminatedInGroup = !isGlobal && item.rank > 2 && !playoffQualifiedTeamNames.has(item.teamName.toLowerCase());
              const isEliminatedInGlobal = isGlobal && !item.isTopGroup && item.rank > 8;

              return (
                <tr key={item.teamId || item.teamName || idx} className={rowStyle}>
                  {/* RANK */}
                  <td className="py-2 px-1 text-center font-bold">
                    <div className="flex items-center justify-center gap-0.5">
                      {renderTrendIcon(trend)}
                      <span
                        className={
                          isGlobal && item.isTopGroup
                            ? item.groupColor === "GROUP_A"
                              ? "text-[10px] font-black text-sky-500"
                              : "text-[10px] font-black text-amber-500"
                            : isGlobal && item.rank <= 8
                            ? "text-[10px] font-black text-emerald-500"
                            : isEliminatedInGlobal
                            ? "text-[10px] font-black text-rose-500"
                            : !isGlobal && item.rank <= 2
                            ? item.groupName === DIVISION_MAP.GROUP_A
                              ? "text-[10px] font-black text-sky-500"
                              : "text-[10px] font-black text-amber-500"
                            : !isGlobal && playoffQualifiedTeamNames.has(item.teamName.toLowerCase())
                            ? "text-[10px] font-black text-emerald-500"
                            : isEliminatedInGroup
                            ? "text-[10px] font-black text-rose-500"
                            : ""
                        }
                      >
                        {isGlobal ? item.customRankLabel : item.rank}
                      </span>
                    </div>
                  </td>

                  {/* TEAMS */}
                  <td className="py-2 pl-1 pr-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={item.teamLogo || "/logo.webp"} alt="" className="h-4 w-4 shrink-0 object-contain" />
                      <span className="font-bold text-[10.5px] leading-snug break-words text-foreground">
                        {item.teamName}
                      </span>
                    </div>
                  </td>

                  {/* MATCH W-L */}
                  <td className="py-2 px-0.5 text-center font-bold text-[10.5px]">
                    {item.matchWins}-{item.matchLosses}
                  </td>

                  {/* RD */}
                  <td className="py-2 px-0.5 text-center font-bold text-[10.5px]">
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

                  {/* SET WINS */}
                  <td className="py-2 px-0.5 text-center font-extrabold text-foreground text-[10.5px]">
                    {item.setWins}
                  </td>

                  {/* POINTS */}
                  <td className="py-2 pl-0.5 pr-2 text-center font-black text-primary text-xs">
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
      {/* SWITCHER TAB */}
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

        {/* FILTER WEEK */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
          <label className="text-xs font-semibold text-muted-foreground">Filter:</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-background border border-input rounded-xl px-3 py-1 text-xs font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            {availableWeeksUpToCurrent.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeTab === "GROUPS" ? (
        <div className="space-y-6">
          {renderTable(groupAStandings, `Divisi ${DIVISION_MAP.GROUP_A}`)}
          {renderTable(groupBStandings, `Divisi ${DIVISION_MAP.GROUP_B}`)}
        </div>
      ) : (
        <div className="space-y-3">
          {/* ✅ KETERANGAN BERSIH TANPA TEKS NAMA WARNA */}
          <div className="p-3 bg-card border border-border rounded-xl text-[11px] space-y-1.5 shadow-sm">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              💡 <span>Ketentuan Kualifikasi Playoff:</span>
            </p>
            <div className="flex flex-col gap-1 pl-3 text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0"></span>
                <span>Lolos Otomatis (Top 2 {DIVISION_MAP.GROUP_A})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Lolos Otomatis (Top 2 {DIVISION_MAP.GROUP_B})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Wildcard Playoff (Rank 1-8 Global)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>Tidak Lolos Playoff (Rank 9+ Global)</span>
              </div>
            </div>
          </div>

          {renderTable(globalStandings, "Standing Global Kualifikasi Playoff", true)}
        </div>
      )}
    </div>
  );
                    }
