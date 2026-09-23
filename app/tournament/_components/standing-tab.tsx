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
  const maxRegularWeek = useMemo(
    () => TOURNAMENT_RULES.PLAYOFF_START_WEEK - 1,
    []
  );

  const defaultStandingWeek = useMemo(
    () => Math.min(currentWeek, maxRegularWeek),
    [currentWeek, maxRegularWeek]
  );

  const rawGroupParam = searchParams.get("group");
  const selectedGroup: DivisionFilterType =
    rawGroupParam === "group_a"
      ? DIVISION_MAP.GROUP_A
      : rawGroupParam === "group_b"
      ? DIVISION_MAP.GROUP_B
      : "ALL";

  const isWildcardActive = searchParams.get("wildcard") === "true";
  const rawWeekParam = searchParams.get("week");

  const selectedWeek =
    rawWeekParam && rawWeekParam !== "ALL"
      ? Math.min(Number(rawWeekParam), maxRegularWeek)
      : defaultStandingWeek;

  const weeksList = useMemo(() => {
    const fromSched = schedules.map((s: any) => s.weekNumber || s.week || s.matchWeek || 1);
    return Array.from(new Set([...fromSched, ...Array.from({ length: defaultStandingWeek }, (_, i) => i + 1)]))
      .filter((w) => w <= maxRegularWeek)
      .sort((a, b) => a - b);
  }, [schedules, defaultStandingWeek, maxRegularWeek]);

  const updateURL = (group: DivisionFilterType, wildcard: boolean, week: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");

    if (wildcard) {
      params.set("wildcard", "true");
      params.delete("group");
    } else {
      params.delete("wildcard");
      if (group === DIVISION_MAP.GROUP_A) params.set("group", "group_a");
      else if (group === DIVISION_MAP.GROUP_B) params.set("group", "group_b");
      else params.delete("group");
    }

    if (week !== defaultStandingWeek) params.set("week", week.toString());
    else params.delete("week");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleGroupChange = (newGroup: DivisionFilterType) => {
    updateURL(newGroup, false, selectedWeek);
  };

  const handleWildcardToggle = () => {
    updateURL("ALL", !isWildcardActive, selectedWeek);
  };

  const handleWeekChange = (week: number | "ALL") => {
    const targetWeek = typeof week === "number" ? Math.min(week, maxRegularWeek) : defaultStandingWeek;
    updateURL(selectedGroup, isWildcardActive, targetWeek);
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");
    params.delete("group");
    params.delete("week");
    params.delete("wildcard");
    params.delete("team");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isFilterActive =
    selectedGroup !== "ALL" ||
    isWildcardActive ||
    selectedWeek !== defaultStandingWeek;

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

  // Helper menandai status isTopGroup tanpa merusak urutan murni tie-breaker
  const attachTopGroupStatus = (items: ExtendedStandingItem[]): ExtendedStandingItem[] => {
    const topA = new Set(
      items
        .filter((t) => t.groupName === DIVISION_MAP.GROUP_A)
        .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
        .map((t) => t.teamName.toLowerCase())
    );
    const topB = new Set(
      items
        .filter((t) => t.groupName === DIVISION_MAP.GROUP_B)
        .slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP)
        .map((t) => t.teamName.toLowerCase())
    );

    return items.map((t) => {
      const clean = t.teamName.toLowerCase();
      return {
        ...t,
        isTopGroup: topA.has(clean) || topB.has(clean),
      };
    });
  };

  const displayedData = useMemo(() => {
    // 1. Saring jadwal hingga pekan yang dipilih
    const filteredCurrSchedules = schedules.filter((s: any) => {
      const matchWeek = Number(s.weekNumber || s.week || s.matchWeek || 1);
      return matchWeek <= selectedWeek;
    });

    const filteredPrevSchedules =
      selectedWeek > 1
        ? schedules.filter((s: any) => {
            const matchWeek = Number(s.weekNumber || s.week || s.matchWeek || 1);
            return matchWeek <= selectedWeek - 1;
          })
        : [];

    // Hitung klasemen murni berdasar tie-breaker
    const currRaw = attachTopGroupStatus(calculateStandings(filteredCurrSchedules as any, masterTeams));
    const prevRaw = filteredPrevSchedules.length
      ? attachTopGroupStatus(calculateStandings(filteredPrevSchedules as any, masterTeams))
      : [];

    // Filter Wildcard (seluruh tim non-Top Group)
    if (isWildcardActive) {
      const currWild = currRaw.filter((t) => !t.isTopGroup);
      const prevWild = prevRaw.filter((t) => !t.isTopGroup);
      return getListWithTrend(currWild, prevWild);
    }

    // Filter Divisi Grup A / B
    if (selectedGroup === DIVISION_MAP.GROUP_A || selectedGroup === DIVISION_MAP.GROUP_B) {
      return getListWithTrend(
        currRaw.filter((s) => s.groupName === selectedGroup),
        prevRaw.filter((s) => s.groupName === selectedGroup)
      );
    }

    // Standing Global: Urutan murni 1-16 sesuai tie-breaker calculateStandings
    return getListWithTrend(currRaw, prevRaw);
  }, [isWildcardActive, selectedGroup, schedules, masterTeams, selectedWeek]);

  const cleanA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="w-full space-y-3.5 md:space-y-4">
      {/* 1. TOURNAMENT FILTER SHARED */}
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
                  selectedWeek={selectedWeek}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
      }
