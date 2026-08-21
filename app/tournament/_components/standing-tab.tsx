"use client";

import { useMemo, useState } from "react";
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
  ExtendedStandingItem,
} from "@/app/tournament/_library/calculator";
import { Trophy } from "lucide-react";
import { TournamentFilter, DivisionFilterType } from "./tournament-filter";
import { StandingTableRow, StandingRowItem } from "./standing-table";

interface StandingTabProps {
  schedules: MatchScheduleItem[];
  masterTeams: any[];
}

export function StandingTab({ schedules = [], masterTeams = [] }: StandingTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const urlView = searchParams.get("view");

  const [selectedGroup, setSelectedGroup] = useState<DivisionFilterType>(
    urlView === "group_a"
      ? DIVISION_MAP.GROUP_A
      : urlView === "group_b"
      ? DIVISION_MAP.GROUP_B
      : "ALL"
  );
  const [isWildcardActive, setIsWildcardActive] = useState<boolean>(urlView === "wildcard");

  const selectedWeek = Number(searchParams.get("week")) || currentWeek;

  const weeksList = useMemo(() => {
    const fromSched = schedules.map((s) => s.weekNumber || 1);
    return Array.from(new Set([...fromSched, ...Array.from({ length: currentWeek }, (_, i) => i + 1)]))
      .filter((w) => w <= currentWeek)
      .sort((a, b) => a - b);
  }, [schedules, currentWeek]);

  const updateRoute = (group: DivisionFilterType, wildcard: boolean, week: number = selectedWeek) => {
    setSelectedGroup(group);
    setIsWildcardActive(wildcard);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");

    if (wildcard) params.set("view", "wildcard");
    else if (group === DIVISION_MAP.GROUP_A) params.set("view", "group_a");
    else if (group === DIVISION_MAP.GROUP_B) params.set("view", "group_b");
    else params.delete("view");

    if (week !== currentWeek) params.set("week", week.toString());
    else params.delete("week");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleGroupChange = (newGroup: DivisionFilterType) => {
    updateRoute(newGroup, false, selectedWeek);
  };

  const handleWildcardToggle = () => {
    updateRoute("ALL", !isWildcardActive, selectedWeek);
  };

  const handleWeekChange = (week: number | "ALL") => {
    const targetWeek = typeof week === "number" ? week : currentWeek;
    updateRoute(selectedGroup, isWildcardActive, targetWeek);
  };

  const handleReset = () => {
    updateRoute("ALL", false, currentWeek);
  };

  const isFilterActive = selectedGroup !== "ALL" || isWildcardActive || selectedWeek !== currentWeek;

  const activeView = isWildcardActive
    ? "WILDCARD"
    : selectedGroup === DIVISION_MAP.GROUP_A
    ? DIVISION_MAP.GROUP_A
    : selectedGroup === DIVISION_MAP.GROUP_B
    ? DIVISION_MAP.GROUP_B
    : "ALL_GLOBAL";

  const getListWithTrend = (curr: ExtendedStandingItem[], prev: ExtendedStandingItem[]): StandingRowItem[] => {
    const prevMap = new Map<string, number>(prev.map((t, idx) => [t.teamName.toLowerCase(), idx + 1]));
    return curr.map((t, idx) => {
      const pRank = prevMap.get(t.teamName.toLowerCase());
      const trend: "up" | "down" | "stay" = typeof pRank === "number" ? (idx + 1 < pRank ? "up" : idx + 1 > pRank ? "down" : "stay") : "stay";
      return { ...t, computedRank: idx + 1, rankLabel: `${idx + 1}`, trend };
    });
  };

  const displayedData = useMemo(() => {
    const currRaw = calculateStandings(schedules, masterTeams, selectedWeek);
    const prevRaw = selectedWeek > 1 ? calculateStandings(schedules, masterTeams, selectedWeek - 1) : [];

    const sortFn = (list: ExtendedStandingItem[]) =>
      [...list].sort((a, b) => b.points - a.points || b.matchWins - a.matchWins || b.roundDifference - a.roundDifference || b.setWins - a.setWins || a.teamName.localeCompare(b.teamName));

    if (isWildcardActive) {
      const currWild = buildGlobalStandings(currRaw).filter((t) => !t.isTopGroup);
      const prevWild = prevRaw.length ? buildGlobalStandings(prevRaw).filter((t) => !t.isTopGroup) : [];
      return getListWithTrend(currWild, prevWild);
    }

    if (selectedGroup === DIVISION_MAP.GROUP_A || selectedGroup === DIVISION_MAP.GROUP_B) {
      return getListWithTrend(currRaw.filter((s) => s.groupName === selectedGroup), prevRaw.filter((s) => s.groupName === selectedGroup));
    }

    return getListWithTrend(sortFn(currRaw), prevRaw.length ? sortFn(prevRaw) : []);
  }, [isWildcardActive, selectedGroup, schedules, masterTeams, selectedWeek]);

  const cleanA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="w-full space-y-3.5 md:space-y-4">
      {/* 1. TOURNAMENT FILTER BERSAMA */}
      <TournamentFilter
        mode="standing"
        selectedGroup={selectedGroup}
        onGroupChange={handleGroupChange}
        selectedWeek={selectedWeek}
        onWeekChange={handleWeekChange}
        availableWeeks={weeksList}
        isWildcardActive={isWildcardActive}
        onWildcardToggle={handleWildcardToggle}
        isFilterActive={isFilterActive}
        onReset={handleReset}
      />

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
          <span>
            {isWildcardActive
              ? "Global Wildcard"
              : selectedGroup === DIVISION_MAP.GROUP_A
              ? DIVISION_MAP.GROUP_A
              : selectedGroup === DIVISION_MAP.GROUP_B
              ? DIVISION_MAP.GROUP_B
              : "Standing Global"}
          </span>
        </h3>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs md:text-sm table-fixed">
            <thead className="bg-muted/60 border-b border-border text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-tight">
              <tr>
                <th className="py-2.5 px-1 text-center w-[11%]">RANK</th>
                <th className="py-2.5 pl-1.5 pr-1 w-[36%]">TEAM</th>
                <th className="py-2.5 px-0.5 text-center w-[11%] text-primary leading-tight">MATCH<br />W-L</th>
                <th className="py-2.5 px-0.5 text-center w-[11%] leading-tight">PTS<br />DIFF</th>
                <th className="py-2.5 px-0.5 text-center w-[14%] leading-tight">PTS<br />SCORED</th>
                <th className="py-2.5 pl-0.5 pr-1 text-center w-[17%] leading-tight">MATCH<br />FORM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground">
              {displayedData.map((item) => (
                <StandingTableRow
                  key={item.teamId || item.teamName}
                  item={item}
                  activeView={activeView}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
                                                                                     }
                             
