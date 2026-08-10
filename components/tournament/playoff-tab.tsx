"use client";

import { useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
}

export function PlayoffTab({ schedules = [], masterTeams = [] }: PlayoffTabProps) {
  // Hitung Standing otomatis s/d minggu berjalan
  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  // Kelompokkan Top 2 per Divisi
  const groupAStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  }, [standings]);

  const groupBStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);
  }, [standings]);

  // Ekstrak Tim Lolos Otomatis (Top 2 Group A & B)
  const top1GroupA = groupAStandings[0];
  const top2GroupA = groupAStandings[1];
  const top1GroupB = groupBStandings[0];
  const top2GroupB = groupBStandings[1];

  // Ekstrak Top 8 Wildcard Tersisa untuk Play-Ins
  const wildcardSeeds = useMemo(() => {
    const directNames = new Set([
      top1GroupA?.teamName,
      top2GroupA?.teamName,
      top1GroupB?.teamName,
      top2GroupB?.teamName,
    ].filter(Boolean));

    return standings.filter((t) => !directNames.has(t.teamName)).slice(0, 8);
  }, [standings, top1GroupA, top2GroupA, top1GroupB, top2GroupB]);

  // Seeds 1 s/d 8
  const wSeed1 = wildcardSeeds[0];
  const wSeed2 = wildcardSeeds[1];
  const wSeed3 = wildcardSeeds[2];
  const wSeed4 = wildcardSeeds[3];
  const wSeed5 = wildcardSeeds[4];
  const wSeed6 = wildcardSeeds[5];
  const wSeed7 = wildcardSeeds[6];
  const wSeed8 = wildcardSeeds[7];

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 overflow-x-auto shadow-xl">
      <div className="border-b border-border pb-3 text-center sm:text-left">
        <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
          <span>🏆</span> Playoff Bracket Stage
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
          Kualifikasi otomatis diisi dari Top 2 Tiap Divisi &amp; Top 8 Wildcard Global Standing.
        </p>
      </div>

      <div className="min-w-[780px] grid grid-cols-4 gap-4 text-xs py-2 px-1">
        {/* ROUND 1: PLAY-INS */}
        <div className="flex flex-col justify-around gap-5">
          <span className="font-extrabold text-[10px] text-sky-400 uppercase tracking-widest border-b border-sky-500/30 pb-1 text-center">
            ROUND 1 (PLAY-INS)
          </span>
          <BracketCard team1={wSeed1} fallback1="Wildcard Seed 1" team2={wSeed8} fallback2="Wildcard Seed 8" label="Play-Ins #1" />
          <BracketCard team1={wSeed4} fallback1="Wildcard Seed 4" team2={wSeed5} fallback2="Wildcard Seed 5" label="Play-Ins #2" />
          <BracketCard team1={wSeed2} fallback1="Wildcard Seed 2" team2={wSeed7} fallback2="Wildcard Seed 7" label="Play-Ins #3" />
          <BracketCard team1={wSeed3} fallback1="Wildcard Seed 3" team2={wSeed6} fallback2="Wildcard Seed 6" label="Play-Ins #4" />
        </div>

        {/* QUARTER-FINAL */}
        <div className="flex flex-col justify-around gap-6 my-auto">
          <span className="font-extrabold text-[10px] text-amber-400 uppercase tracking-widest border-b border-amber-500/30 pb-1 text-center">
            QUARTER-FINAL
          </span>
          <BracketCard team1={top1GroupA} fallback1={`Top 1 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #1" label="QF #1" isDirect />
          <BracketCard team1={top2GroupB} fallback1={`Top 2 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #2" label="QF #2" isDirect />
          <BracketCard team1={top1GroupB} fallback1={`Top 1 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #3" label="QF #3" isDirect />
          <BracketCard team1={top2GroupA} fallback1={`Top 2 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #4" label="QF #4" isDirect />
        </div>

        {/* SEMI-FINAL */}
        <div className="flex flex-col justify-around gap-16 my-auto">
          <span className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-widest border-b border-emerald-500/30 pb-1 text-center">
            SEMI-FINAL
          </span>
          <BracketCard fallback1="Winner QF #1" fallback2="Winner QF #2" label="SF #1" />
          <BracketCard fallback1="Winner QF #3" fallback2="Winner QF #4" label="SF #2" />
        </div>

        {/* GRAND FINAL */}
        <div className="flex flex-col justify-center my-auto">
          <span className="font-extrabold text-[10px] text-purple-400 uppercase tracking-widest border-b border-purple-500/30 pb-1 mb-3 text-center">
            GRAND FINAL
          </span>
          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 p-4 text-center shadow-lg space-y-2">
            <p className="font-black text-purple-300 text-xs uppercase tracking-widest">
              CHAMPIONSHIP
            </p>
            <div className="border-t border-purple-500/30 my-1" />
            <p className="text-[11px] font-bold text-slate-200">Winner SF #1</p>
            <p className="text-[10px] text-amber-400 font-black">VS</p>
            <p className="text-[11px] font-bold text-slate-200">Winner SF #2</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketCard({
  team1,
  fallback1,
  team2,
  fallback2,
  label,
  isDirect,
}: {
  team1?: any;
  fallback1: string;
  team2?: any;
  fallback2: string;
  label?: string;
  isDirect?: boolean;
}) {
  const name1 = team1?.teamName || fallback1;
  const logo1 = team1?.teamLogo;

  const name2 = team2?.teamName || fallback2;
  const logo2 = team2?.teamLogo;

  return (
    <div
      className={`rounded-xl border bg-background p-2.5 flex flex-col gap-1.5 shadow-sm transition ${
        isDirect ? "border-amber-500/40 bg-amber-500/5" : "border-border"
      }`}
    >
      {label && (
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}

      {/* TEAM 1 */}
      <div className="flex items-center justify-between font-bold text-[10.5px] min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          {logo1 ? (
            <img src={logo1} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
          )}
          <span
            className={`truncate ${
              team1 ? "text-foreground font-black" : "text-muted-foreground font-semibold"
            }`}
          >
            {name1}
          </span>
        </div>
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>

      <div className="border-t border-border/40" />

      {/* TEAM 2 */}
      <div className="flex items-center justify-between font-bold text-[10.5px] min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          {logo2 ? (
            <img src={logo2} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
          )}
          <span
            className={`truncate ${
              team2 ? "text-foreground font-black" : "text-muted-foreground font-semibold"
            }`}
          >
            {name2}
          </span>
        </div>
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>
    </div>
  );
      }
