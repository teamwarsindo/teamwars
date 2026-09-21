"use client";

import { useMemo } from "react";
import {
  MatchScheduleItem,
  DIVISION_MAP,
  TOURNAMENT_RULES,
} from "@/app/tournament/_library";
import {
  calculateStandings,
  buildGlobalStandings,
  ExtendedStandingItem,
} from "@/app/tournament/_library/calculator";
import { CircleCheckBig } from "lucide-react";

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
  groupAName?: string;
  groupBName?: string;
}

function PhaseHeader({
  title,
  colorTheme,
}: {
  title: string;
  colorTheme: "sky" | "amber" | "emerald" | "purple";
}) {
  const colorMap = {
    sky: "text-sky-400 border-sky-500/30 bg-sky-500",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500",
  };

  const currentTheme = colorMap[colorTheme] || colorMap.sky;

  return (
    <div className={`flex items-center justify-center gap-2 pb-2.5 border-b ${currentTheme.split(" ")[1]}`}>
      <div className={`h-2.5 w-2.5 rounded-full ${currentTheme.split(" ")[2]}`} />
      <h4 className={`text-xs md:text-sm font-black uppercase tracking-wider ${currentTheme.split(" ")[0]}`}>
        {title}
      </h4>
    </div>
  );
}

interface TimelineMatchCardProps {
  team1?: ExtendedStandingItem;
  fallback1: string;
  team2?: ExtendedStandingItem;
  fallback2: string;
  label?: string;
  isDirect?: boolean;
  colorTheme?: "sky" | "amber" | "emerald" | "purple";
}

function TimelineMatchCard({
  team1,
  fallback1,
  team2,
  fallback2,
  label,
  isDirect,
  colorTheme = "sky",
}: TimelineMatchCardProps) {
  const borderThemeMap = {
    sky: "border-sky-500/30 bg-background/90 hover:border-sky-500/70",
    amber: "border-amber-500/30 bg-background/90 hover:border-amber-500/70",
    emerald: "border-emerald-500/30 bg-background/90 hover:border-emerald-500/70",
    purple: "border-purple-500/30 bg-background/90 hover:border-purple-500/70",
  };

  const getTeamDisplay = (teamData?: ExtendedStandingItem, fallbackName: string = "TBD") => {
    if (teamData) {
      const isWinner = teamData.teamName.includes("✓");
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={teamData.teamLogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 rounded-full shrink-0 object-contain bg-muted/40 p-0.5 border border-border/60"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate leading-tight text-xs font-bold text-foreground flex items-center gap-1">
              {isWinner ? teamData.teamName.replace(" ✓", "") : teamData.teamName}
              {isWinner && <CircleCheckBig className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            </span>
            <span className="text-[9.5px] text-muted-foreground/80 font-medium truncate leading-none mt-0.5">
              {fallbackName}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className="truncate leading-tight text-xs font-bold text-muted-foreground/70">
          {fallbackName}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 shadow-xs transition relative z-10 ${
        borderThemeMap[colorTheme]
      } ${isDirect ? "bg-amber-500/5 border-amber-500/40" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[10px] font-black text-primary uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        {getTeamDisplay(team1, fallback1)}
        <span className="text-primary font-mono font-black text-xs shrink-0 pl-1">0</span>
      </div>

      <div className="border-t border-border/30" />

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        {getTeamDisplay(team2, fallback2)}
        <span className="text-primary font-mono font-black text-xs shrink-0 pl-1">0</span>
      </div>
    </div>
  );
}

export function PlayoffTab({
  schedules = [],
  masterTeams = [],
  groupAName = DIVISION_MAP.GROUP_A,
  groupBName = DIVISION_MAP.GROUP_B,
}: PlayoffTabProps) {
  const standings = useMemo(() => {
    if (!schedules.length || !masterTeams.length) return [];
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  const groupAStandings = useMemo(
    () => standings.filter((s) => s.groupName === groupAName || s.groupName === DIVISION_MAP.GROUP_A),
    [standings, groupAName]
  );
  const groupBStandings = useMemo(
    () => standings.filter((s) => s.groupName === groupBName || s.groupName === DIVISION_MAP.GROUP_B),
    [standings, groupBName]
  );

  const top1GroupA = groupAStandings[0];
  const top2GroupA = groupAStandings[1];
  const top1GroupB = groupBStandings[0];
  const top2GroupB = groupBStandings[1];

  const wildcardSeeds = useMemo(() => {
    if (!standings.length) return [];
    return buildGlobalStandings(standings)
      .filter((t) => !t.isTopGroup)
      .slice(0, TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA);
  }, [standings]);

  return (
    <div className="w-full flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-7 shadow-xl">
      {/* Header Info (Tanpa tombol sembunyikan tim) */}
      <div className="border-b border-border pb-3 text-center sm:text-left space-y-1">
        <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
          <span>🏆</span> Playoff Stage Bracket
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground font-semibold">
          Bagan babak gugur resmi Team Wars Indonesia Season 7.
        </p>
      </div>

      {/* Bracket Area (Lebar maksimal & scrollable di layar kecil agar tidak terhimpit) */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="min-w-[960px] lg:min-w-0 grid grid-cols-4 gap-4 sm:gap-5 relative">
          {/* ROUND 1 (PLAY-INS) */}
          <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-950/10 p-3.5 space-y-3.5 shadow-sm flex flex-col justify-between">
            <PhaseHeader title="ROUND 1 (PLAY-INS)" colorTheme="sky" />
            <div className="space-y-3 flex-1 flex flex-col justify-around">
              <TimelineMatchCard
                team1={wildcardSeeds[0]}
                fallback1="Wildcard Seed 1"
                team2={wildcardSeeds[7]}
                fallback2="Wildcard Seed 8"
                label="Play-Ins #1"
                colorTheme="sky"
              />
              <TimelineMatchCard
                team1={wildcardSeeds[3]}
                fallback1="Wildcard Seed 4"
                team2={wildcardSeeds[4]}
                fallback2="Wildcard Seed 5"
                label="Play-Ins #2"
                colorTheme="sky"
              />
              <TimelineMatchCard
                team1={wildcardSeeds[1]}
                fallback1="Wildcard Seed 2"
                team2={wildcardSeeds[6]}
                fallback2="Wildcard Seed 7"
                label="Play-Ins #3"
                colorTheme="sky"
              />
              <TimelineMatchCard
                team1={wildcardSeeds[2]}
                fallback1="Wildcard Seed 3"
                team2={wildcardSeeds[5]}
                fallback2="Wildcard Seed 6"
                label="Play-Ins #4"
                colorTheme="sky"
              />
            </div>
          </div>

          {/* QUARTER-FINAL */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/10 p-3.5 space-y-3.5 shadow-sm flex flex-col justify-between">
            <PhaseHeader title="QUARTER-FINAL" colorTheme="amber" />
            <div className="space-y-3 flex-1 flex flex-col justify-around">
              <TimelineMatchCard
                team1={top1GroupA}
                fallback1={`Top 1 ${groupAName}`}
                fallback2="Winner Play-Ins #1"
                label="Quarter-Final #1"
                isDirect
                colorTheme="amber"
              />
              <TimelineMatchCard
                team1={top2GroupB}
                fallback1={`Top 2 ${groupBName}`}
                fallback2="Winner Play-Ins #2"
                label="Quarter-Final #2"
                isDirect
                colorTheme="amber"
              />
              <TimelineMatchCard
                team1={top1GroupB}
                fallback1={`Top 1 ${groupBName}`}
                fallback2="Winner Play-Ins #3"
                label="Quarter-Final #3"
                isDirect
                colorTheme="amber"
              />
              <TimelineMatchCard
                team1={top2GroupA}
                fallback1={`Top 2 ${groupAName}`}
                fallback2="Winner Play-Ins #4"
                label="Quarter-Final #4"
                isDirect
                colorTheme="amber"
              />
            </div>
          </div>

          {/* SEMI-FINAL */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 p-3.5 space-y-3.5 shadow-sm flex flex-col justify-between">
            <PhaseHeader title="SEMI-FINAL" colorTheme="emerald" />
            <div className="space-y-3 flex-1 flex flex-col justify-around my-auto">
              <TimelineMatchCard
                fallback1="Winner Quarter-Final #1"
                fallback2="Winner Quarter-Final #2"
                label="Semi-Final #1"
                colorTheme="emerald"
              />
              <TimelineMatchCard
                fallback1="Winner Quarter-Final #3"
                fallback2="Winner Quarter-Final #4"
                label="Semi-Final #2"
                colorTheme="emerald"
              />
            </div>
          </div>

          {/* GRAND FINAL */}
          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-4 text-center shadow-lg flex flex-col justify-between space-y-3.5">
            <PhaseHeader title="GRAND FINAL" colorTheme="purple" />
            <div className="p-4 rounded-2xl border border-purple-500/40 bg-background/90 space-y-3 my-auto shadow-sm">
              <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
                👑 CHAMPIONSHIP FINAL
              </p>
              <div className="border-t border-purple-500/30 my-2" />
              <div className="space-y-2 py-1 text-xs font-bold text-muted-foreground/80">
                <p className="leading-tight">Winner Semi-Final #1</p>
                <p className="text-xs text-amber-500 font-black uppercase">VS</p>
                <p className="leading-tight">Winner Semi-Final #2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
