"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import { Lock, RefreshCw } from "lucide-react";

interface PlayoffTeamItem {
  slot?: string;
  seed?: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  teamColor: string;
}

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
  playoffData?: {
    lockedAt?: string;
    directQuarterFinals?: PlayoffTeamItem[];
    wildcardSeeds?: PlayoffTeamItem[];
  } | null;
  isAdmin?: boolean;
  onLockPlayoff?: () => void;
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

  const current = colorMap[colorTheme] || colorMap.sky;

  return (
    <div className={`flex items-center justify-center gap-2 pb-2.5 border-b ${current.split(" ")[1]}`}>
      <div className={`h-2.5 w-2.5 rounded-full ${current.split(" ")[2]}`} />
      <h4 className={`text-xs xl:text-sm font-black uppercase tracking-wider ${current.split(" ")[0]}`}>
        {title}
      </h4>
    </div>
  );
}

function TimelineMatchCard({
  team1,
  fallback1,
  team2,
  fallback2,
  label,
  isDirect,
  colorTheme = "sky",
}: {
  team1?: PlayoffTeamItem;
  fallback1: string;
  team2?: PlayoffTeamItem;
  fallback2: string;
  label?: string;
  isDirect?: boolean;
  colorTheme?: "sky" | "amber" | "emerald" | "purple";
}) {
  const borderThemeMap = {
    sky: "border-sky-500/30 bg-background/90 hover:border-sky-500/70",
    amber: "border-amber-500/30 bg-background/90 hover:border-amber-500/70",
    emerald: "border-emerald-500/30 bg-background/90 hover:border-emerald-500/70",
    purple: "border-purple-500/30 bg-background/90 hover:border-purple-500/70",
  };

  const renderTeam = (team?: PlayoffTeamItem, fallback: string = "TBD") => {
    if (team?.teamName) {
      return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={team.teamLogo || "/logo.webp"}
            alt=""
            className="h-5 w-5 xl:h-6 xl:w-6 rounded-full shrink-0 object-contain bg-muted/40 p-0.5 border border-border/60"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="leading-tight text-xs xl:text-sm font-bold text-foreground truncate">
              {team.teamName}
            </span>
            <span className="text-[9.5px] xl:text-[10.5px] text-muted-foreground/80 font-medium truncate leading-none mt-0.5">
              {fallback}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className="leading-tight text-xs xl:text-sm font-bold text-muted-foreground/70 truncate">
          {fallback}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl border p-3 xl:p-3.5 flex flex-col gap-2 shadow-xs transition relative z-10 ${
        borderThemeMap[colorTheme]
      } ${isDirect ? "bg-amber-500/5 border-amber-500/40" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[10px] xl:text-[11px] font-black text-primary uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        {renderTeam(team1, fallback1)}
        <span className="text-primary font-mono font-black text-xs xl:text-sm shrink-0 pl-1">0</span>
      </div>

      <div className="border-t border-border/30" />

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        {renderTeam(team2, fallback2)}
        <span className="text-primary font-mono font-black text-xs xl:text-sm shrink-0 pl-1">0</span>
      </div>
    </div>
  );
}

export function PlayoffTab({
  playoffData,
  isAdmin = false,
  onLockPlayoff,
}: PlayoffTabProps) {
  const isLocked = !!playoffData?.lockedAt;

  // Map slot Direct QF & Wildcard Seeds dari data inject KV
  const directMap = useMemo(() => {
    const map = new Map<string, PlayoffTeamItem>();
    (playoffData?.directQuarterFinals || []).forEach((d) => {
      if (d.slot) map.set(d.slot, d);
    });
    return map;
  }, [playoffData]);

  const wildcardMap = useMemo(() => {
    const map = new Map<number, PlayoffTeamItem>();
    (playoffData?.wildcardSeeds || []).forEach((w) => {
      if (w.seed) map.set(w.seed, w);
    });
    return map;
  }, [playoffData]);

  return (
    <div className="w-full flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 xl:p-8 shadow-xl">
      {/* Header Info & Tombol Admin */}
      <div className="flex items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
            <span>🏆</span> Playoff Stage Bracket
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold">
            Bagan babak gugur resmi Team Wars Indonesia Season 7.
          </p>
        </div>

        {/* Tombol Eksekusi (Hanya Tampil untuk Admin) */}
        {isAdmin && (
          <button
            type="button"
            onClick={onLockPlayoff}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              isLocked
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            {isLocked ? <RefreshCw className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>{isLocked ? "Sinkron Playoff" : "Kunci Playoff"}</span>
          </button>
        )}
      </div>

      {/* Grid 4 Babak Playoff */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6 relative w-full">
        {/* ROUND 1: PLAY-INS */}
        <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="ROUND 1 (PLAY-INS)" colorTheme="sky" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            <TimelineMatchCard
              team1={wildcardMap.get(1)}
              fallback1="Wildcard Seed 1"
              team2={wildcardMap.get(8)}
              fallback2="Wildcard Seed 8"
              label="Play-Ins #1"
              colorTheme="sky"
            />
            <TimelineMatchCard
              team1={wildcardMap.get(4)}
              fallback1="Wildcard Seed 4"
              team2={wildcardMap.get(5)}
              fallback2="Wildcard Seed 5"
              label="Play-Ins #2"
              colorTheme="sky"
            />
            <TimelineMatchCard
              team1={wildcardMap.get(2)}
              fallback1="Wildcard Seed 2"
              team2={wildcardMap.get(7)}
              fallback2="Wildcard Seed 7"
              label="Play-Ins #3"
              colorTheme="sky"
            />
            <TimelineMatchCard
              team1={wildcardMap.get(3)}
              fallback1="Wildcard Seed 3"
              team2={wildcardMap.get(6)}
              fallback2="Wildcard Seed 6"
              label="Play-Ins #4"
              colorTheme="sky"
            />
          </div>
        </div>

        {/* ROUND 2: QUARTER-FINAL */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="QUARTER-FINAL" colorTheme="amber" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            <TimelineMatchCard
              team1={directMap.get("TOP_1_GROUP_A")}
              fallback1="Top 1 Group A"
              fallback2="Winner Play-Ins #1"
              label="Quarter-Final #1"
              isDirect
              colorTheme="amber"
            />
            <TimelineMatchCard
              team1={directMap.get("TOP_2_GROUP_B")}
              fallback1="Top 2 Group B"
              fallback2="Winner Play-Ins #2"
              label="Quarter-Final #2"
              isDirect
              colorTheme="amber"
            />
            <TimelineMatchCard
              team1={directMap.get("TOP_1_GROUP_B")}
              fallback1="Top 1 Group B"
              fallback2="Winner Play-Ins #3"
              label="Quarter-Final #3"
              isDirect
              colorTheme="amber"
            />
            <TimelineMatchCard
              team1={directMap.get("TOP_2_GROUP_A")}
              fallback1="Top 2 Group A"
              fallback2="Winner Play-Ins #4"
              label="Quarter-Final #4"
              isDirect
              colorTheme="amber"
            />
          </div>
        </div>

        {/* ROUND 3: SEMI-FINAL */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
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

        {/* ROUND 4: GRAND FINAL */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-4 xl:p-5 text-center shadow-lg flex flex-col justify-between space-y-3.5">
          <PhaseHeader title="GRAND FINAL" colorTheme="purple" />
          <div className="p-4 rounded-2xl border border-purple-500/40 bg-background/90 space-y-3 my-auto shadow-sm">
            <p className="font-black text-purple-400 text-xs xl:text-sm uppercase tracking-widest flex items-center justify-center gap-1.5">
              👑 CHAMPIONSHIP FINAL
            </p>
            <div className="border-t border-purple-500/30 my-2" />
            <div className="space-y-2 py-1 text-xs xl:text-sm font-bold text-muted-foreground/80">
              <p className="leading-tight">Winner Semi-Final #1</p>
              <p className="text-xs text-amber-500 font-black uppercase">VS</p>
              <p className="leading-tight">Winner Semi-Final #2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
        }
