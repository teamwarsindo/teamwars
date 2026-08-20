"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import {
  calculateStandings,
  buildGlobalStandings,
} from "@/app/tournament/_library/calculator";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

function MatchFormGrid({ form = [] }: { form?: ("W" | "L")[] }) {
  const slots = Array.from({ length: 8 }, (_, i) => form[i] || null);

  return (
    <div className="grid grid-cols-4 gap-1 w-fit mx-auto justify-items-center">
      {slots.map((res, idx) => {
        if (!res) {
          return (
            <span
              key={idx}
              className="flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded bg-muted/40 text-muted-foreground/30 text-[7.5px] md:text-[8px] font-bold border border-dashed border-border/50"
            >
              -
            </span>
          );
        }

        return (
          <span
            key={idx}
            className={`flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded text-[7.5px] md:text-[8.5px] font-black shadow-2xs ${
              res === "W"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
            }`}
          >
            {res}
          </span>
        );
      })}
    </div>
  );
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const activeView = searchParams.get("view") === "global" ? "GLOBAL" : "GROUPS";

  const rawWeekParam = searchParams.get("week");
  const selectedWeek = rawWeekParam ? Number(rawWeekParam) : currentWeek;

  const availableWeeksUpToCurrent = useMemo(() => {
    const weeksInSchedules = Array.from(
      new Set(schedules.map((s) => s.weekNumber || 1))
    ).filter((w) => w <= currentWeek);

    return Array.from(
      new Set([...weeksInSchedules, ...Array.from({ length: currentWeek }, (_, i) => i + 1)])
    ).sort((a, b) => a - b);
  }, [schedules, currentWeek]);

  const updateRoute = (viewTarget: "groups" | "global", weekTarget?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");
    params.set("view", viewTarget);
    if (weekTarget && weekTarget !== currentWeek) {
      params.set("week", weekTarget.toString());
    } else {
      params.delete("week");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const standings = useMemo(() => {
    const current = calculateStandings(schedules, masterTeams, selectedWeek);

    if (selectedWeek > 1) {
      const prev = calculateStandings(schedules, masterTeams, selectedWeek - 1);
      const prevRankMap = new Map<string, number>();
      prev.forEach((t) => prevRankMap.set(t.teamName, t.rank));

      return current.map((item) => {
        const prevRank = prevRankMap.get(item.teamName);
        let trend: "up" | "down" | "stay" = "stay";
        if (typeof prevRank === "number") {
          if (item.rank < prevRank) trend = "up";
          else if (item.rank > prevRank) trend = "down";
        }
        return { ...item, rankTrend: trend };
      });
    }

    return current.map((item) => ({ ...item, rankTrend: "stay" as const }));
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

        return { ...item, globalRankTrend: trend };
      });
    }

    return currentGlobal.map((item) => ({ ...item, globalRankTrend: "stay" as const }));
  }, [standings, schedules, masterTeams, selectedWeek]);

  const playoffQualifiedTeamNames = useMemo(() => {
    return new Set(
      globalStandings
        .filter((item) => !item.isTopGroup && item.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA)
        .map((item) => item.teamName.toLowerCase())
    );
  }, [globalStandings]);

  const renderTrendIcon = (trend?: "up" | "down" | "stay") => {
    if (trend === "up") return <span className="text-emerald-500 font-bold text-[9px]">▲</span>;
    if (trend === "down") return <span className="text-rose-500 font-bold text-[9px]">▼</span>;
    return <span className="text-muted-foreground/40 font-bold text-[9px]">➖</span>;
  };

  const renderTable = (items: any[], title: string, isGlobal = false) => (
    <div className="space-y-2 w-full flex-1">
      <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 px-1">
        <span>🏆</span> {title}
      </h3>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <table className="w-full text-left text-xs md:text-sm table-fixed">
          <thead className="bg-muted/60 border-b border-border text-[8.5px] sm:text-[9.5px] md:text-[10.5px] font-extrabold uppercase text-muted-foreground tracking-wider">
            <tr>
              <th className={`py-2 px-1 text-center ${isGlobal ? "w-[15%]" : "w-[12%]"}`}>RANK</th>
              <th className={`py-2 pl-1 pr-1 ${isGlobal ? "w-[33%]" : "w-[36%]"}`}>TEAM</th>
              <th className="py-2 px-0.5 text-center w-[13%] text-primary leading-tight">W-L</th>
              <th className="py-2 px-0.5 text-center w-[11%] leading-tight">DIFF</th>
              <th className="py-2 px-0.5 text-center w-[11%] leading-tight">PTS</th>
              <th className="py-2 pl-0.5 pr-2 text-center w-[16%]">FORM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-semibold text-foreground">
            {items.map((item: any, idx) => {
              let rowStyle = "hover:bg-muted/20 transition";

              if (isGlobal) {
                if (item.isTopGroup) {
                  rowStyle =
                    item.groupColor === "GROUP_A"
                      ? "bg-sky-500/10 hover:bg-sky-500/15 transition border-l-4 border-l-sky-500"
                      : "bg-amber-500/10 hover:bg-amber-500/15 transition border-l-4 border-l-amber-500";
                } else if (item.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
                  rowStyle = "bg-emerald-500/10 hover:bg-emerald-500/15 transition border-l-4 border-l-emerald-500";
                } else {
                  rowStyle = "bg-rose-500/5 hover:bg-rose-500/10 transition border-l-4 border-l-rose-500/60";
                }
              } else {
                if (item.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
                  rowStyle =
                    item.groupName === DIVISION_MAP.GROUP_A
                      ? "bg-sky-500/10 hover:bg-sky-500/15 transition border-l-4 border-l-sky-500"
                      : "bg-amber-500/10 hover:bg-amber-500/15 transition border-l-4 border-l-amber-500";
                } else if (playoffQualifiedTeamNames.has((item.teamName || "").toLowerCase())) {
                  rowStyle = "bg-emerald-500/10 hover:bg-emerald-500/15 transition border-l-4 border-l-emerald-500";
                } else {
                  rowStyle = "bg-rose-500/5 hover:bg-rose-500/10 transition border-l-4 border-l-rose-500/60";
                }
              }

              const trend = isGlobal ? item.globalRankTrend : item.rankTrend;

              return (
                <tr key={item.teamId || item.teamName || idx} className={rowStyle}>
                  {/* RANK */}
                  <td className="py-2 px-1 text-center font-bold">
                    <div className="flex items-center justify-center gap-0.5">
                      {renderTrendIcon(trend)}
                      <span className="text-[10.5px] md:text-xs font-black">
                        {isGlobal ? item.customRankLabel : item.rank}
                      </span>
                    </div>
                  </td>

                  {/* TEAMS */}
                  <td className="py-2 pl-1 pr-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={item.teamLogo || "/logo.webp"} alt="" className="h-4 w-4 md:h-5 md:w-5 shrink-0 object-contain" />
                      <span className="font-bold text-[10.5px] sm:text-xs md:text-sm truncate text-foreground">
                        {item.teamName}
                      </span>
                    </div>
                  </td>

                  {/* MATCH W-L */}
                  <td className="py-2 px-0.5 text-center font-black text-primary text-[10.5px] sm:text-xs md:text-sm">
                    {item.matchWins}-{item.matchLosses}
                  </td>

                  {/* PTS DIFF */}
                  <td className="py-2 px-0.5 text-center font-bold text-[10.5px] sm:text-xs md:text-sm">
                    <span
                      className={
                        item.roundDifference > 0
                          ? "text-emerald-500 font-black"
                          : item.roundDifference < 0
                          ? "text-rose-500 font-black"
                          : "text-muted-foreground"
                      }
                    >
                      {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                    </span>
                  </td>

                  {/* SCORED */}
                  <td className="py-2 px-0.5 text-center font-black text-foreground text-[10.5px] sm:text-xs md:text-sm">
                    {item.setWins}
                  </td>

                  {/* FORM */}
                  <td className="py-1.5 pl-0.5 pr-2 text-center">
                    <MatchFormGrid form={item.form} />
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
    <div className="w-full space-y-4 md:space-y-5">
      {/* SUB-TAB & PEKAN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateRoute("groups")}
            className={`py-1.5 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeView === "GROUPS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40"
            }`}
          >
            📊 Divisi Group
          </button>
          <button
            type="button"
            onClick={() => updateRoute("global")}
            className={`py-1.5 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeView === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40"
            }`}
          >
            🌐 Standing Global Wildcard
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label className="text-xs md:text-sm font-bold text-muted-foreground">Pekan:</label>
          <select
            value={selectedWeek}
            onChange={(e) => updateRoute(activeView === "GLOBAL" ? "global" : "groups", Number(e.target.value))}
            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs md:text-sm font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer shadow-2xs"
          >
            {availableWeeksUpToCurrent.map((w) => (
              <option key={w} value={w}>
                Week {w} {w === currentWeek ? "(Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KETENTUAN KUALIFIKASI */}
      <div className="p-3 sm:p-3.5 bg-card border border-border rounded-2xl text-xs md:text-sm space-y-1.5 shadow-xs">
        <p className="font-bold text-foreground flex items-center gap-1.5 text-xs md:text-sm">
          💡 <span>Ketentuan Kualifikasi:</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground font-semibold text-[10.5px] md:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0"></span>
            <span><strong>Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} Div. A</strong>: Quarter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span><strong>Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} Div. B</strong>: Quarter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span><strong>Rank 1–{TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA} Wildcard</strong>: Play-Ins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
            <span><strong>Rank {TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA + 1}+ Wildcard</strong>: Eliminasi</span>
          </div>
        </div>
      </div>

      {/* TABEL: BERSEBELAHAN (SIDE BY SIDE) DI DESKTOP */}
      {activeView === "GROUPS" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
          {renderTable(groupAStandings, `Divisi ${DIVISION_MAP.GROUP_A}`)}
          {renderTable(groupBStandings, `Divisi ${DIVISION_MAP.GROUP_B}`)}
        </div>
      ) : (
        <div className="w-full">
          {renderTable(globalStandings, "Klasemen Standing Global Wildcard", true)}
        </div>
      )}
    </div>
  );
}