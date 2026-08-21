"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  getCurrentServerWeek,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import { calculateStandings, buildGlobalStandings, ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { Trophy, Minus, ChevronUp, ChevronDown, Shield, Swords, Globe, RotateCcw } from "lucide-react";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

type StandingFilterView = "ALL_GLOBAL" | "GROUP_A" | "GROUP_B" | "WILDCARD";

function MatchFormGrid({ form = [] }: { form?: ("W" | "L")[] }) {
  const slots = Array.from({ length: 8 }, (_, i) => form[i] || null);
  return (
    <div className="grid grid-cols-4 gap-0.5 sm:gap-1 w-fit mx-auto justify-items-center">
      {slots.map((res, idx) => (
        <span
          key={idx}
          className={`flex h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 items-center justify-center rounded text-[7px] sm:text-[7.5px] md:text-[8.5px] font-black ${
            !res
              ? "bg-muted/30 text-muted-foreground/30 border border-dashed border-border/40"
              : res === "W"
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
          }`}
        >
          {res || "-"}
        </span>
      ))}
    </div>
  );
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const urlView = searchParams.get("view");
  const [activeFilter, setActiveFilter] = useState<StandingFilterView>(
    urlView === "group_a" ? "GROUP_A" : urlView === "group_b" ? "GROUP_B" : urlView === "wildcard" ? "WILDCARD" : "ALL_GLOBAL"
  );

  const selectedWeek = Number(searchParams.get("week")) || currentWeek;

  const weeksList = useMemo(() => {
    const fromSched = schedules.map((s) => s.weekNumber || 1);
    return Array.from(new Set([...fromSched, ...Array.from({ length: currentWeek }, (_, i) => i + 1)]))
      .filter((w) => w <= currentWeek)
      .sort((a, b) => a - b);
  }, [schedules, currentWeek]);

  const updateRoute = (viewTarget: StandingFilterView, weekTarget: number = selectedWeek) => {
    setActiveFilter(viewTarget);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");
    if (viewTarget === "GROUP_A") params.set("view", "group_a");
    else if (viewTarget === "GROUP_B") params.set("view", "group_b");
    else if (viewTarget === "WILDCARD") params.set("view", "wildcard");
    else params.delete("view");

    if (weekTarget !== currentWeek) params.set("week", weekTarget.toString());
    else params.delete("week");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Helper Trend Generator
  const getListWithTrend = (curr: ExtendedStandingItem[], prev: ExtendedStandingItem[]) => {
    const prevMap = new Map<string, number>(prev.map((t, idx) => [t.teamName.toLowerCase(), idx + 1]));
    return curr.map((t, idx) => {
      const pRank = prevMap.get(t.teamName.toLowerCase());
      const trend: "up" | "down" | "stay" = typeof pRank === "number" ? (idx + 1 < pRank ? "up" : idx + 1 > pRank ? "down" : "stay") : "stay";
      return { ...t, computedRank: idx + 1, rankLabel: `#${idx + 1}`, trend };
    });
  };

  const displayedData = useMemo(() => {
    const currRaw = calculateStandings(schedules, masterTeams, selectedWeek);
    const prevRaw = selectedWeek > 1 ? calculateStandings(schedules, masterTeams, selectedWeek - 1) : [];

    const sortFn = (list: ExtendedStandingItem[]) =>
      [...list].sort((a, b) => b.points - a.points || b.matchWins - a.matchWins || b.roundDifference - a.roundDifference || b.setWins - a.setWins || a.teamName.localeCompare(b.teamName));

    if (activeFilter === "GROUP_A" || activeFilter === "GROUP_B") {
      const targetDiv = activeFilter === "GROUP_A" ? DIVISION_MAP.GROUP_A : DIVISION_MAP.GROUP_B;
      return getListWithTrend(currRaw.filter((s) => s.groupName === targetDiv), prevRaw.filter((s) => s.groupName === targetDiv));
    }

    if (activeFilter === "WILDCARD") {
      const currWild = buildGlobalStandings(currRaw).filter((t) => !t.isTopGroup);
      const prevWild = prevRaw.length ? buildGlobalStandings(prevRaw).filter((t) => !t.isTopGroup) : [];
      return getListWithTrend(currWild, prevWild);
    }

    // ALL_GLOBAL
    return getListWithTrend(sortFn(currRaw), prevRaw.length ? sortFn(prevRaw) : []);
  }, [activeFilter, schedules, masterTeams, selectedWeek]);

  const cleanA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="w-full space-y-3.5 md:space-y-4">
      {/* 1. FILTER CARD */}
      <div className="bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateRoute(activeFilter === "GROUP_A" ? "ALL_GLOBAL" : "GROUP_A")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeFilter === "GROUP_A" ? "bg-sky-500 text-white shadow-xs" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
            <span className="truncate">{cleanA}</span>
          </button>
          <button
            type="button"
            onClick={() => updateRoute(activeFilter === "GROUP_B" ? "ALL_GLOBAL" : "GROUP_B")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeFilter === "GROUP_B" ? "bg-amber-500 text-slate-950 shadow-xs" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            <Swords className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span className="truncate">{cleanB}</span>
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
          <button
            type="button"
            onClick={() => updateRoute(activeFilter === "WILDCARD" ? "ALL_GLOBAL" : "WILDCARD")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeFilter === "WILDCARD" ? "bg-emerald-500 text-white shadow-xs" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border/40"
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Global Wildcard</span>
          </button>

          <select
            value={selectedWeek}
            onChange={(e) => updateRoute(activeFilter, Number(e.target.value))}
            className="w-[120px] sm:w-[135px] bg-background border border-input rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-primary cursor-pointer shadow-2xs"
          >
            {weeksList.map((w) => (
              <option key={w} value={w}>
                Week {w} {w === currentWeek ? "(Aktif)" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => updateRoute("ALL_GLOBAL", currentWeek)}
            title="Reset"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. KETENTUAN KUALIFIKASI */}
      <div className="p-3 bg-card border border-border rounded-2xl text-xs md:text-sm space-y-1.5 shadow-xs">
        <p className="font-bold text-foreground flex items-center gap-1.5 text-xs md:text-sm">
          💡 <span>Ketentuan Kualifikasi:</span>
        </p>
        <div className="flex flex-col gap-1 text-muted-foreground font-semibold text-[11px] md:text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0"></span>
            <span><strong className="text-foreground">Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {cleanA}</strong>: Lolos Quarter Finals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
            <span><strong className="text-foreground">Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {cleanB}</strong>: Lolos Quarter Finals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span><strong className="text-foreground">Rank 1–{TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA} Wildcard</strong>: Masuk Babak Play-Ins</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
            <span><strong className="text-foreground">Rank {TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA + 1}+ Wildcard</strong>: Tereliminasi</span>
          </div>
        </div>
      </div>

      {/* 3. TABEL STANDING */}
      <div className="space-y-2 w-full">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 px-1">
          <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>{activeFilter === "ALL_GLOBAL" ? "Standing Global" : activeFilter === "GROUP_A" ? DIVISION_MAP.GROUP_A : activeFilter === "GROUP_B" ? DIVISION_MAP.GROUP_B : "Global Wildcard"}</span>
        </h3>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs md:text-sm table-fixed">
            <thead className="bg-muted/60 border-b border-border text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-tight">
              <tr>
                <th className="py-2.5 px-1 text-center w-[14%]">RANK</th>
                <th className="py-2.5 pl-1.5 pr-1 w-[32%]">TEAM</th>
                <th className="py-2.5 px-0.5 text-center w-[14%] text-primary leading-tight">MATCH<br />W-L</th>
                <th className="py-2.5 px-0.5 text-center w-[13%] leading-tight">PTS<br />DIFF</th>
                <th className="py-2.5 px-0.5 text-center w-[13%] leading-tight">PTS<br />SCORED</th>
                <th className="py-2.5 pl-0.5 pr-2 text-center w-[14%] leading-tight">MATCH<br />FORM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-semibold text-foreground">
              {displayedData.map((item: any, idx) => {
                const isGroupA = item.groupName === DIVISION_MAP.GROUP_A;
                const rowBorder =
                  activeFilter === "ALL_GLOBAL"
                    ? isGroupA ? "border-l-4 border-l-sky-500/80" : "border-l-4 border-l-amber-500/80"
                    : activeFilter === "WILDCARD"
                    ? item.computedRank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA ? "bg-emerald-500/10 border-l-4 border-l-emerald-500" : "bg-rose-500/5 border-l-4 border-l-rose-500/60"
                    : item.computedRank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP
                    ? isGroupA ? "bg-sky-500/10 border-l-4 border-l-sky-500" : "bg-amber-500/10 border-l-4 border-l-amber-500"
                    : "";

                return (
                  <tr key={item.teamId || item.teamName || idx} className={`hover:bg-muted/20 transition ${rowBorder}`}>
                    <td className="py-2.5 px-1 text-center font-bold">
                      <div className="flex items-center justify-center gap-0.5">
                        {item.trend === "up" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                        ) : item.trend === "down" ? (
                          <ChevronDown className="h-3.5 w-3.5 text-rose-500 stroke-[3]" />
                        ) : (
                          <Minus className="h-2.5 w-2.5 text-muted-foreground/40 stroke-[3]" />
                        )}
                        <span className="text-[10px] sm:text-[11px] md:text-xs font-black truncate">{item.rankLabel}</span>
                      </div>
                    </td>

                    <td className="py-2.5 pl-1.5 pr-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img src={item.teamLogo || "/logo.webp"} alt="" className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 shrink-0 object-contain" />
                        <span className="font-bold text-[10px] sm:text-xs md:text-sm truncate text-foreground">{item.teamName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-0.5 text-center font-black text-primary text-[10px] sm:text-xs md:text-sm">
                      {item.matchWins}-{item.matchLosses}
                    </td>

                    <td className="py-2.5 px-0.5 text-center font-bold text-[10px] sm:text-xs md:text-sm">
                      <span className={item.roundDifference > 0 ? "text-emerald-500 font-black" : item.roundDifference < 0 ? "text-rose-500 font-black" : "text-muted-foreground"}>
                        {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
                      </span>
                    </td>

                    <td className="py-2.5 px-0.5 text-center font-black text-foreground text-[10px] sm:text-xs md:text-sm">
                      {item.setWins}
                    </td>

                    <td className="py-2 pl-0.5 pr-2 text-center">
                      <MatchFormGrid form={item.form} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
              }
      
