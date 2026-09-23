"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MatchScheduleItem, DIVISION_MAP, getCurrentServerWeek, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { calculateStandings, buildGlobalStandings, ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { Trophy } from "lucide-react";
import { TournamentFilter, DivisionFilterType } from "./tournament-filter";
import { StandingTableRow, StandingRowItem } from "./standing-table";

export function StandingTab({ schedules = [], masterTeams = [] }: { schedules: MatchScheduleItem[]; masterTeams: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentWeek = useMemo(() => getCurrentServerWeek(), []);
  const maxRegularWeek = useMemo(() => TOURNAMENT_RULES.PLAYOFF_START_WEEK - 1, []);
  const defaultStandingWeek = useMemo(() => Math.min(currentWeek, maxRegularWeek), [currentWeek, maxRegularWeek]);

  const rawGroupParam = searchParams.get("group");
  const selectedGroup: DivisionFilterType =
    rawGroupParam === "group_a" ? DIVISION_MAP.GROUP_A : rawGroupParam === "group_b" ? DIVISION_MAP.GROUP_B : "ALL";
  const isWildcardActive = searchParams.get("wildcard") === "true";
  const rawWeekParam = searchParams.get("week");
  const selectedWeek = rawWeekParam && rawWeekParam !== "ALL" ? Math.min(Number(rawWeekParam), maxRegularWeek) : defaultStandingWeek;

  const weeksList = useMemo(() => {
    const fromSched = schedules.map((s: any) => s.weekNumber || s.week || s.matchWeek || 1);
    return Array.from(new Set([...fromSched, ...Array.from({ length: defaultStandingWeek }, (_, i) => i + 1)]))
      .filter((w) => w <= maxRegularWeek).sort((a, b) => a - b);
  }, [schedules, defaultStandingWeek, maxRegularWeek]);

  const updateURL = (group: DivisionFilterType, wildcard: boolean, week: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "standings");
    if (wildcard) { params.set("wildcard", "true"); params.delete("group"); }
    else {
      params.delete("wildcard");
      if (group === DIVISION_MAP.GROUP_A) params.set("group", "group_a");
      else if (group === DIVISION_MAP.GROUP_B) params.set("group", "group_b");
      else params.delete("group");
    }
    if (week !== defaultStandingWeek) params.set("week", week.toString()); else params.delete("week");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isFilterActive = selectedGroup !== "ALL" || isWildcardActive || selectedWeek !== defaultStandingWeek;
  const activeView = isWildcardActive ? "WILDCARD" : selectedGroup === DIVISION_MAP.GROUP_A ? DIVISION_MAP.GROUP_A : selectedGroup === DIVISION_MAP.GROUP_B ? DIVISION_MAP.GROUP_B : "ALL_GLOBAL";

  const getListWithTrend = (curr: ExtendedStandingItem[], prev: ExtendedStandingItem[]): StandingRowItem[] => {
    const prevMap = new Map(prev.map((t, idx) => [t.teamName.toLowerCase(), idx + 1]));
    return curr.map((t, idx) => {
      const p = prevMap.get(t.teamName.toLowerCase());
      return { ...t, computedRank: idx + 1, rankLabel: `${idx + 1}`, trend: typeof p === "number" ? (idx + 1 < p ? "up" : idx + 1 > p ? "down" : "stay") : "stay" };
    });
  };

  const displayedData = useMemo(() => {
    const currSched = schedules.filter((s: any) => Number(s.weekNumber || s.week || s.matchWeek || 1) <= selectedWeek);
    const prevSched = selectedWeek > 1 ? schedules.filter((s: any) => Number(s.weekNumber || s.week || s.matchWeek || 1) <= selectedWeek - 1) : [];

    const currRaw = calculateStandings(currSched as any, masterTeams);
    const prevRaw = prevSched.length ? calculateStandings(prevSched as any, masterTeams) : [];
    const sortTie = (list: ExtendedStandingItem[]) => [...list].sort((a, b) => b.points - a.points || b.matchWins - a.matchWins || b.roundDifference - a.roundDifference || b.setWins - a.setWins || a.teamName.localeCompare(b.teamName));

    if (isWildcardActive) {
      return getListWithTrend(buildGlobalStandings(currRaw).filter((t) => !t.isTopGroup), prevRaw.length ? buildGlobalStandings(prevRaw).filter((t) => !t.isTopGroup) : []);
    }
    if (selectedGroup === DIVISION_MAP.GROUP_A || selectedGroup === DIVISION_MAP.GROUP_B) {
      return getListWithTrend(currRaw.filter((s) => s.groupName === selectedGroup), prevRaw.filter((s) => s.groupName === selectedGroup));
    }

    // Default Global: Tag status Top Grup untuk warna border, namun diurutkan murni tie-breaker
    const markTop = (list: ExtendedStandingItem[]) => {
      const topA = sortTie(list.filter((t) => t.groupName === DIVISION_MAP.GROUP_A)).slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP).map((t) => t.teamName.toLowerCase());
      const topB = sortTie(list.filter((t) => t.groupName === DIVISION_MAP.GROUP_B)).slice(0, TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP).map((t) => t.teamName.toLowerCase());
      const topSet = new Set([...topA, ...topB]);
      return list.map((t) => ({ ...t, isTopGroup: topSet.has(t.teamName.toLowerCase()) }));
    };

    return getListWithTrend(sortTie(markTop(currRaw)), prevRaw.length ? sortTie(markTop(prevRaw)) : []);
  }, [isWildcardActive, selectedGroup, schedules, masterTeams, selectedWeek]);

  const cleanA = DIVISION_MAP.GROUP_A.replace(/^Div(isi|\.)\s*/i, "");
  const cleanB = DIVISION_MAP.GROUP_B.replace(/^Div(isi|\.)\s*/i, "");

  return (
    <div className="w-full space-y-3.5 md:space-y-4">
      <TournamentFilter
        mode="standing"
        selectedGroup={selectedGroup}
        onGroupChange={(g) => updateURL(g, false, selectedWeek)}
        selectedWeek={selectedWeek}
        onWeekChange={(w) => updateURL(selectedGroup, isWildcardActive, typeof w === "number" ? Math.min(w, maxRegularWeek) : defaultStandingWeek)}
        availableWeeks={weeksList}
        isWildcardActive={isWildcardActive}
        onWildcardToggle={() => updateURL("ALL", !isWildcardActive, selectedWeek)}
        isFilterActive={isFilterActive}
        onReset={() => {
          const p = new URLSearchParams(searchParams.toString());
          ["group", "week", "wildcard", "team"].forEach((k) => p.delete(k));
          p.set("tab", "standings");
          router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        }}
      />

      <div className="p-3 bg-card border border-border rounded-2xl text-xs md:text-sm space-y-1.5 shadow-xs">
        <p className="font-bold text-foreground flex items-center gap-1.5 text-xs md:text-sm">💡 <span>Ketentuan Kualifikasi:</span></p>
        <div className="flex flex-col gap-1 text-muted-foreground font-semibold text-[11px] md:text-xs">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-500 shrink-0"></span><span><strong className="text-foreground">Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {cleanA}</strong>: Lolos Quarter Finals</span></div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span><span><strong className="text-foreground">Top {TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP} {cleanB}</strong>: Lolos Quarter Finals</span></div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span><span><strong className="text-foreground">Rank 1–{TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA} Wildcard</strong>: Masuk Babak Play-Ins</span></div>
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span><span><strong className="text-foreground">Rank {TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA + 1}+ Wildcard</strong>: Tereliminasi</span></div>
        </div>
      </div>

      <div className="space-y-2 w-full">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 px-1">
          <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>{isWildcardActive ? "Global Wildcard" : selectedGroup === DIVISION_MAP.GROUP_A ? DIVISION_MAP.GROUP_A : selectedGroup === DIVISION_MAP.GROUP_B ? DIVISION_MAP.GROUP_B : "Standing Global"}</span>
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
                <StandingTableRow key={item.teamId || item.teamName} item={item} activeView={activeView} selectedWeek={selectedWeek} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
    }
                
