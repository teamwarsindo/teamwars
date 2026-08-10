"use client";

import { useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings } from "@/lib/tournament/calculator";

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
}

export function PlayoffTab({ schedules = [], masterTeams = [] }: PlayoffTabProps) {
  // Hitung Standing Akumulatif dari mesin kalkulator terpusat
  const standings = useMemo(() => {
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  // Kelompokkan Tim Per Divisi
  const groupAStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A);
  }, [standings]);

  const groupBStandings = useMemo(() => {
    return standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B);
  }, [standings]);

  // 1. TIM LOLOS OTOMATIS KE QUARTER-FINAL (TOP 2 GROUP A & B)
  const top1GroupA = groupAStandings[0];
  const top2GroupA = groupAStandings[1];
  const top1GroupB = groupBStandings[0];
  const top2GroupB = groupBStandings[1];

  // 2. TIM WILDCARD SEED 1 S/D 8 (8 TIM GLOBAL TERSISA)
  const wildcardSeeds = useMemo(() => {
    const directNames = new Set(
      [top1GroupA?.teamName, top2GroupA?.teamName, top1GroupB?.teamName, top2GroupB?.teamName].filter(
        Boolean
      )
    );
    return standings.filter((t) => !directNames.has(t.teamName)).slice(0, 8);
  }, [standings, top1GroupA, top2GroupA, top1GroupB, top2GroupB]);

  const wSeed1 = wildcardSeeds[0];
  const wSeed2 = wildcardSeeds[1];
  const wSeed3 = wildcardSeeds[2];
  const wSeed4 = wildcardSeeds[3];
  const wSeed5 = wildcardSeeds[4];
  const wSeed6 = wildcardSeeds[5];
  const wSeed7 = wildcardSeeds[6];
  const wSeed8 = wildcardSeeds[7];

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xl">
      {/* HEADER PAGE */}
      <div className="border-b border-border pb-3 text-center sm:text-left">
        <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
          <span>🏆</span> Playoff Bracket Stage
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
          Top 2 Tiap Divisi (Kualifikasi Langsung QF) &amp; Top 8 Wildcard Global (Round 1 Play-Ins).
        </p>
      </div>

      {/* ========================================================
          1. TAMPILAN MOBILE (VERTICAL DUAL-BRACKET ATAS & BAWAH)
          ======================================================== */}
      <div className="flex lg:hidden flex-col gap-8 w-full">
        {/* UPPER BRACKET (TOP HALF) */}
        <div className="space-y-4 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
          <div className="flex items-center gap-2 border-b border-sky-500/30 pb-2">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-sky-400">
              UPPER BRACKET (QUALIFIER A)
            </h4>
          </div>

          <div className="space-y-3">
            {/* MATCH 1 & QF 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <BracketCard team1={wSeed1} fallback1="Wildcard Seed 1" team2={wSeed8} fallback2="Wildcard Seed 8" label="Play-Ins #1" />
              <BracketCard team1={top1GroupA} fallback1={`Top 1 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #1" label="QF #1" isDirect badge1Color="text-sky-400" />
            </div>

            {/* MATCH 2 & QF 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <BracketCard team1={wSeed4} fallback1="Wildcard Seed 4" team2={wSeed5} fallback2="Wildcard Seed 5" label="Play-Ins #2" />
              <BracketCard team1={top2GroupB} fallback1={`Top 2 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #2" label="QF #2" isDirect badge1Color="text-amber-400" />
            </div>

            {/* SEMI-FINAL 1 */}
            <div className="pt-2">
              <BracketCard fallback1="Winner QF #1" fallback2="Winner QF #2" label="SEMI-FINAL #1" />
            </div>
          </div>
        </div>

        {/* GRAND FINAL CENTER STAGE */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 p-4 text-center shadow-lg space-y-2 my-1">
          <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1">
            👑 GRAND FINAL CHAMPIONSHIP
          </p>
          <div className="border-t border-purple-500/30 my-1.5" />
          <div className="space-y-1">
            <p className="text-[11px] font-extrabold text-foreground">Winner SF #1</p>
            <p className="text-[10px] text-amber-400 font-black">VS</p>
            <p className="text-[11px] font-extrabold text-foreground">Winner SF #2</p>
          </div>
        </div>

        {/* LOWER BRACKET (BOTTOM HALF) */}
        <div className="space-y-4 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
          <div className="flex items-center gap-2 border-b border-amber-500/30 pb-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
              LOWER BRACKET (QUALIFIER B)
            </h4>
          </div>

          <div className="space-y-3">
            {/* MATCH 3 & QF 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <BracketCard team1={wSeed2} fallback1="Wildcard Seed 2" team2={wSeed7} fallback2="Wildcard Seed 7" label="Play-Ins #3" />
              <BracketCard team1={top1GroupB} fallback1={`Top 1 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #3" label="QF #3" isDirect badge1Color="text-amber-400" />
            </div>

            {/* MATCH 4 & QF 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              <BracketCard team1={wSeed3} fallback1="Wildcard Seed 3" team2={wSeed6} fallback2="Wildcard Seed 6" label="Play-Ins #4" />
              <BracketCard team1={top2GroupA} fallback1={`Top 2 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #4" label="QF #4" isDirect badge1Color="text-sky-400" />
            </div>

            {/* SEMI-FINAL 2 */}
            <div className="pt-2">
              <BracketCard fallback1="Winner QF #3" fallback2="Winner QF #4" label="SEMI-FINAL #2" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP (HORIZONTAL FLOW 4-KOLOM + GARIS CONNECTOR)
          ======================================================== */}
      <div className="hidden lg:grid grid-cols-4 gap-6 text-xs py-4 px-2 relative min-w-[900px]">
        {/* ROUND 1: PLAY-INS */}
        <div className="flex flex-col justify-around gap-6 relative">
          <span className="font-extrabold text-[10px] text-sky-400 uppercase tracking-widest border-b border-sky-500/30 pb-1 text-center">
            ROUND 1 (PLAY-INS)
          </span>

          <div className="relative">
            <BracketCard team1={wSeed1} fallback1="Wildcard Seed 1" team2={wSeed8} fallback2="Wildcard Seed 8" label="Play-Ins #1" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={wSeed4} fallback1="Wildcard Seed 4" team2={wSeed5} fallback2="Wildcard Seed 5" label="Play-Ins #2" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={wSeed2} fallback1="Wildcard Seed 2" team2={wSeed7} fallback2="Wildcard Seed 7" label="Play-Ins #3" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={wSeed3} fallback1="Wildcard Seed 3" team2={wSeed6} fallback2="Wildcard Seed 6" label="Play-Ins #4" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>
        </div>

        {/* QUARTER-FINAL */}
        <div className="flex flex-col justify-around gap-8 my-auto relative">
          <span className="font-extrabold text-[10px] text-amber-400 uppercase tracking-widest border-b border-amber-500/30 pb-1 text-center">
            QUARTER-FINAL
          </span>

          <div className="relative">
            <BracketCard team1={top1GroupA} fallback1={`Top 1 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #1" label="QF #1" isDirect badge1Color="text-sky-400" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={top2GroupB} fallback1={`Top 2 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #2" label="QF #2" isDirect badge1Color="text-amber-400" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={top1GroupB} fallback1={`Top 1 ${DIVISION_MAP.GROUP_B}`} fallback2="Winner Play-Ins #3" label="QF #3" isDirect badge1Color="text-amber-400" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard team1={top2GroupA} fallback1={`Top 2 ${DIVISION_MAP.GROUP_A}`} fallback2="Winner Play-Ins #4" label="QF #4" isDirect badge1Color="text-sky-400" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>
        </div>

        {/* SEMI-FINAL */}
        <div className="flex flex-col justify-around gap-16 my-auto relative">
          <span className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-widest border-b border-emerald-500/30 pb-1 text-center">
            SEMI-FINAL
          </span>

          <div className="relative">
            <BracketCard fallback1="Winner QF #1" fallback2="Winner QF #2" label="SF #1" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>

          <div className="relative">
            <BracketCard fallback1="Winner QF #3" fallback2="Winner QF #4" label="SF #2" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80"></div>
          </div>
        </div>

        {/* GRAND FINAL */}
        <div className="flex flex-col justify-center my-auto relative">
          <span className="font-extrabold text-[10px] text-purple-400 uppercase tracking-widest border-b border-purple-500/30 pb-1 mb-3 text-center">
            GRAND FINAL
          </span>

          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-4 text-center shadow-lg space-y-2 relative">
            <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1">
              👑 CHAMPIONSHIP
            </p>
            <div className="border-t border-purple-500/30 my-1" />
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold text-foreground">Winner SF #1</p>
              <p className="text-[10px] text-amber-400 font-black">VS</p>
              <p className="text-[11px] font-extrabold text-foreground">Winner SF #2</p>
            </div>
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
  badge1Color = "text-muted-foreground",
}: {
  team1?: any;
  fallback1: string;
  team2?: any;
  fallback2: string;
  label?: string;
  isDirect?: boolean;
  badge1Color?: string;
}) {
  const name1 = team1?.teamName || fallback1;
  const logo1 = team1?.teamLogo;

  const name2 = team2?.teamName || fallback2;
  const logo2 = team2?.teamLogo;

  return (
    <div
      className={`rounded-2xl border bg-background p-3 flex flex-col gap-2 shadow-xs transition relative ${
        isDirect ? "border-amber-500/50 bg-amber-500/5" : "border-border hover:border-primary/50"
      }`}
    >
      {label && (
        <div className="flex items-center justify-between border-b border-border/30 pb-1">
          <span className="text-[9px] font-black text-primary uppercase tracking-wider">
            {label}
          </span>
          {isDirect && (
            <span className="text-[8.5px] font-black text-amber-500 uppercase">
              DIRECT QF
            </span>
          )}
        </div>
      )}

      {/* TIM 1 */}
      <div className="flex items-center justify-between font-bold text-[11px] min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {logo1 ? (
            <img src={logo1} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
          )}
          <span
            className={`truncate leading-tight ${
              team1 ? "text-foreground font-extrabold" : `${badge1Color} font-bold`
            }`}
          >
            {name1}
          </span>
        </div>
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>

      <div className="border-t border-border/40" />

      {/* TIM 2 */}
      <div className="flex items-center justify-between font-bold text-[11px] min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {logo2 ? (
            <img src={logo2} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
          )}
          <span
            className={`truncate leading-tight ${
              team2 ? "text-foreground font-extrabold" : "text-muted-foreground font-medium"
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
