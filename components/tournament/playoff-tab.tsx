"use client";

import { useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";
import { CircleCheckBig } from "lucide-react";

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
  groupAName?: string;
  groupBName?: string;
}

export function PlayoffTab({
  schedules = [],
  masterTeams = [],
  groupAName = "Anda Yakin?",
  groupBName = "Sakurasawa Fighters",
}: PlayoffTabProps) {
  // Hitung Standing Akumulatif
  const standings = useMemo(() => {
    if (!schedules.length || !masterTeams.length) return [];
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  // Kelompokkan Tim Per Divisi
  const groupAStandings = useMemo(
    () => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A || s.groupName === groupAName),
    [standings, groupAName]
  );
  const groupBStandings = useMemo(
    () => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B || s.groupName === groupBName),
    [standings, groupBName]
  );

  // Ekstrak Tim Lolos Otomatis ke Quarter-Final (Top 2 Group A & B)
  const top1GroupA = groupAStandings[0];
  const top2GroupA = groupAStandings[1];
  const top1GroupB = groupBStandings[0];
  const top2GroupB = groupBStandings[1];

  // Ekstrak Tim Wildcard Seed 1 s/d 8
  const wildcardSeeds = useMemo(() => {
    if (!standings.length) return [];
    const directNames = new Set(
      [top1GroupA?.teamName, top2GroupA?.teamName, top1GroupB?.teamName, top2GroupB?.teamName].filter(
        Boolean
      )
    );
    return standings.filter((t) => !directNames.has(t.teamName)).slice(0, 8);
  }, [standings, top1GroupA, top2GroupA, top1GroupB, top2GroupB]);

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xl relative">
      {/* HEADER PAGE */}
      <div className="border-b border-border pb-3 text-center sm:text-left space-y-1">
        <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
          <span>🏆</span> Playoff Stage Bracket
        </h3>
        <p className="text-[11px] text-muted-foreground font-semibold">
          Bagan bracket akan otomatis terisi tim kualifikasi setelah memasuki Fase Playoff.
        </p>
      </div>

      {/* GRID FASE DENGAN KOTAK BLOK PEMBUNGKUS KONSISTEN */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
        
        {/* ================= FASE 1: ROUND 1 (PLAY-INS) - TEMA BIRU ================= */}
        <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-950/10 p-4 space-y-4 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="ROUND 1 (PLAY-INS)" colorTheme="sky" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            <TimelineMatchCard team1={wildcardSeeds[0]} fallback1="Wildcard Seed 1" team2={wildcardSeeds[7]} fallback2="Wildcard Seed 8" label="Play-Ins #1" colorTheme="sky" />
            <TimelineMatchCard team1={wildcardSeeds[3]} fallback1="Wildcard Seed 4" team2={wildcardSeeds[4]} fallback2="Wildcard Seed 5" label="Play-Ins #2" colorTheme="sky" />
            <TimelineMatchCard team1={wildcardSeeds[1]} fallback1="Wildcard Seed 2" team2={wildcardSeeds[6]} fallback2="Wildcard Seed 7" label="Play-Ins #3" colorTheme="sky" />
            <TimelineMatchCard team1={wildcardSeeds[2]} fallback1="Wildcard Seed 3" team2={wildcardSeeds[5]} fallback2="Wildcard Seed 6" label="Play-Ins #4" colorTheme="sky" />
          </div>
        </div>

        {/* ================= FASE 2: QUARTER-FINAL - TEMA KUNING / AMBER ================= */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/10 p-4 space-y-4 shadow-sm flex flex-col justify-between">
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
              fallback1={`Top 2 ${groupBName}`}
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

        {/* ================= FASE 3: SEMI-FINAL - TEMA HIJAU / EMERALD ================= */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 p-4 space-y-4 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="SEMI-FINAL" colorTheme="emerald" />
          <div className="space-y-3 flex-1 flex flex-col justify-around my-auto">
            <TimelineMatchCard fallback1="Winner Quarter-Final #1" fallback2="Winner Quarter-Final #2" label="Semi-Final #1" colorTheme="emerald" />
            <TimelineMatchCard fallback1="Winner Quarter-Final #3" fallback2="Winner Quarter-Final #4" label="Semi-Final #2" colorTheme="emerald" />
          </div>
        </div>

        {/* ================= FASE 4: GRAND FINAL - TEMA UNGU / PURPLE ================= */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-5 text-center shadow-lg flex flex-col justify-between space-y-4">
          <PhaseHeader title="GRAND FINAL" colorTheme="purple" />
          <div className="p-4 rounded-xl border border-purple-500/40 bg-background/80 space-y-3 my-auto shadow-sm">
            <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1">
              👑 CHAMPIONSHIP FINAL
            </p>
            <div className="border-t border-purple-500/30 my-1" />
            <div className="space-y-2 py-1 text-[11px] font-bold text-muted-foreground/70">
              <p className="leading-tight">
                Winner Semi-Final #1
              </p>
              <p className="text-[10px] text-amber-500 font-black uppercase">VS</p>
              <p className="leading-tight">
                Winner Semi-Final #2
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function PhaseHeader({ title, colorTheme }: { title: string; colorTheme: "sky" | "amber" | "emerald" | "purple" }) {
  const colorMap = {
    sky: "text-sky-400 border-sky-500/30 bg-sky-500",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500",
  };

  const currentTheme = colorMap[colorTheme] || colorMap.sky;

  return (
    <div className={`flex items-center justify-center gap-2 pb-2.5 border-b ${currentTheme.split(" ")[1]}`}>
      <div className={`h-2.5 w-2.5 rounded-full ${currentTheme.split(" ")[2]}`}></div>
      <h4 className={`text-xs font-black uppercase tracking-widest ${currentTheme.split(" ")[0]}`}>{title}</h4>
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
    sky: "border-sky-500/30 bg-background/80 hover:border-sky-500/70",
    amber: "border-amber-500/30 bg-background/80 hover:border-amber-500/70",
    emerald: "border-emerald-500/30 bg-background/80 hover:border-emerald-500/70",
    purple: "border-purple-500/30 bg-background/80 hover:border-purple-500/70",
  };

  const getTeamDisplay = (teamData?: ExtendedStandingItem, fallbackName: string = "TBD") => {
    if (teamData) {
      const isWinner = teamData.teamName.includes("✓") || false;
      return (
        <div className="flex items-center gap-1.5 truncate">
          <img src={teamData.teamLogo} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
          <span className="truncate leading-tight text-[11px] font-extrabold text-foreground">
            {isWinner ? teamData.teamName.replace(" ✓", "") : teamData.teamName}
          </span>
          {isWinner && <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" />}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 truncate">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className="truncate leading-tight text-[11px] font-bold text-muted-foreground/70">
          {fallbackName}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 shadow-xs transition relative z-10 ${
        borderThemeMap[colorTheme]
      } ${isDirect ? "bg-amber-500/10 border-amber-500/50" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[9.5px] font-black text-primary uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between font-bold text-[11px] min-w-0 pr-1">
        {getTeamDisplay(team1, fallback1)}
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>

      <div className="border-t border-border/30" />

      <div className="flex items-center justify-between font-bold text-[11px] min-w-0 pr-1">
        {getTeamDisplay(team2, fallback2)}
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>
    </div>
  );
}
