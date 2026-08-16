"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { calculateStandings, ExtendedStandingItem } from "@/app/tournament/_library/calculator";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

function MatchFormGrid({
  form = [],
  totalMatches = TOURNAMENT_RULES.TOTAL_TEAMS_PER_GROUP,
}: {
  form?: ("W" | "L")[];
  totalMatches?: number;
}) {
  const slots = Array.from({ length: totalMatches }, (_, i) => form[i] || null);

  return (
    <div className="grid grid-cols-4 gap-1 w-fit mx-auto">
      {slots.map((res, idx) => {
        if (!res) {
          return (
            <span
              key={idx}
              className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-sm bg-muted/40 text-muted-foreground/30 text-[8px] sm:text-[9px] font-bold border border-dashed border-border/50"
              title={`Match ${idx + 1}: Belum bertanding`}
            >
              ·
            </span>
          );
        }

        return (
          <span
            key={idx}
            className={`flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-sm text-[8px] sm:text-[9px] font-black ${
              res === "W"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
            }`}
            title={`Match ${idx + 1}: ${res === "W" ? "Win" : "Lose"}`}
          >
            {res}
          </span>
        );
      })}
    </div>
  );
}

function buildGlobalStandings(
  standings: ExtendedStandingItem[]
): (ExtendedStandingItem & { globalRank: number; globalRankTrend?: "up" | "down" | "stay" })[] {
  const groupA = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  const groupB = standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);

  const topGroupA = groupA
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_A" as const,
      customRankLabel: `Top ${i + 1}`,
    }));

  const topGroupB = groupB
    .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
    .map((t, i) => ({
      ...t,
      isTopGroup: true,
      groupColor: "GROUP_B" as const,
      customRankLabel: `Top ${i + 1}`,
    }));

  const top4Combined = [...topGroupA, ...topGroupB];
  const top4Names = new Set(top4Combined.map((t) => t.teamName));

  const remainingTeams = standings
    .filter((t) => !top4Names.has(t.teamName))
    .sort((a, b) => {
      const totalMatchA = a.matchWins + a.matchLosses;
      const totalMatchB = b.matchWins + b.matchLosses;
      if (totalMatchB !== totalMatchA) return totalMatchB - totalMatchA;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      if (b.roundDifference !== a.roundDifference) return b.roundDifference - a.roundDifference;
      return b.setWins - a.setWins;
    })
    .map((t, idx) => ({
      ...t,
      rank: idx + 1,
      isTopGroup: false,
      groupColor: (t.groupName === DIVISION_MAP.GROUP_A ? "GROUP_A" : "GROUP_B") as "GROUP_A" | "GROUP_B",
      customRankLabel: `${idx + 1}`,
    }));

  const fullCombined = [...top4Combined, ...remainingTeams];

  return fullCombined.map((item, index) => ({
    ...item,
    globalRank: index + 1,
  }));
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

    return current.map((item) => ({
      ...item,
      rankTrend: "stay" as const,
    }));
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

    return currentGlobal.map((item) => ({
      ...item,
      globalRankTrend: "stay" as const,
    }));
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
    <div className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
        <span>🏆</span> {title}
      </h3>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-[11px] table-fixed">
          <thead className="bg-muted/60 border-b border-border text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider">
            <tr>
              <th className={`py-2 px-1 text-center ${isGlobal ? "w-[15%]" : "w-[12%]"}`}>RANK</th>
              <th className={`py-2 pl-1 pr-1 ${isGlobal ? "w-[31%]" : "w-[34%]"}`}>TEAMS</th>
              <th className="py-2 px-0.5 text-center w-[14%] text-primary leading-tight">
                MATCH<br />W-L
              </th>
              <th className="py-2 px-0.5 text-center w-[11%] leading-tight">
                PTS<br />DIFF
              </th>
              <th className="py-2 px-0.5 text-center w-[11%] leading-tight">SCORED</th>
              <th className="py-2 pl-0.5 pr-2 text-center w-[18%]">FORM</th>
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
                } else if (item.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA) {
                  rowStyle = "bg-emerald-500/15 hover:bg-emerald-500/20 transition border-l-4 border-l-emerald-500";
                } else {
                  rowStyle = "bg-rose-500/10 hover:bg-rose-500/15 transition border-l-4 border-l-rose-500/60";
                }
              } else {
                if (item.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
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
              const isEliminatedInGroup =
                !isGlobal &&
                item.rank > TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP &&
                !playoffQualifiedTeamNames.has(item.teamName.toLowerCase());
              const isEliminatedInGlobal =
                isGlobal && !item.isTopGroup && item.rank > TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA;

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
                            : isGlobal && item.rank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
                            ? "text-[10px] font-black text-emerald-500"
                            : isEliminatedInGlobal
                            ? "text-[10px] font-black text-rose-500"
                            : !isGlobal && item.rank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP
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
                  <td className="py-2 px-0.5 text-center font-black text-primary text-[10.5px]">
                    {item.matchWins}-{item.matchLosses}
                  </td>

                  {/* PTS DIFF */}
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

                  {/* SCORED */}
                  <td className="py-2 px-0.5 text-center font-extrabold text-foreground text-[10.5px]">
                    {item.setWins}
                  </td>

                  {/* FORM */}
                  <td className="py-1.5 pl-0.5 pr-2 text-center">
                    <MatchFormGrid form={item.form} totalMatches={TOURNAMENT_RULES.TOTAL_TEAMS_PER_GROUP} />
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
      {/* SUB-TAB STANDINGS */}
      <div className="flex flex-col gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={() => updateRoute("groups")}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
              activeView === "GROUPS"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            📊 Divisi Group
          </button>
          <button
            onClick={() => updateRoute("global")}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
              activeView === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            🌐 Standing Global
          </button>
        </div>

        {/* FILTER PEKAN */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
          <label className="text-xs font-semibold text-muted-foreground">Pekan:</label>
          <select
            value={selectedWeek}
            onChange={(e) => updateRoute(activeView === "GLOBAL" ? "global" : "groups", Number(e.target.value))}
            className="bg-background border border-input rounded-xl px-3 py-1 text-xs font-bold text-primary focus:outline-none focus:border-primary transition cursor-pointer"
          >
            {availableWeeksUpToCurrent.map((w) => (
              <option key={w} value={w}>
                Week {w} {w === currentWeek ? "(Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KETENTUAN KUALIFIKASI BABAK LANJUTAN */}
      <div className="p-3 bg-card border border-border rounded-xl text-[11px] space-y-1.5 shadow-sm">
        <p className="font-bold text-foreground flex items-center gap-1.5">
          💡 <span>Ketentuan Kualifikasi Playoff:</span>
        </p>
        <div className="flex flex-col gap-1 pl-3 text-muted-foreground font-semibold">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0"></span>
            <span><strong>Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {DIVISION_MAP.GROUP_A}</strong>: Lolos ke Quarter Finals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span><strong>Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {DIVISION_MAP.GROUP_B}</strong>: Lolos ke Quarter Finals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span><strong>Rank 1–{TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA} Wildcard</strong>: Lolos Play-Ins (Round 1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0"></span>
            <span><strong>Rank {TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA + 1}+ Wildcard</strong>: Tereliminasi</span>
          </div>
        </div>
      </div>

      {/* TABEL DATA */}
      {activeView === "GROUPS" ? (
        <div className="space-y-6">
          {renderTable(groupAStandings, `Divisi ${DIVISION_MAP.GROUP_A}`)}
          {renderTable(groupBStandings, `Divisi ${DIVISION_MAP.GROUP_B}`)}
        </div>
      ) : (
        <div className="space-y-3">
          {renderTable(globalStandings, "Klasemen Standing Global Wildcard", true)}
        </div>
      )}
    </div>
  );
    }
