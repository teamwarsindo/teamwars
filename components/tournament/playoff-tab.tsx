"use client";

import { useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";

interface PlayoffTabProps {
  // Data ini hanya akan dikirim dari Parent jika (key=admin OR week >= 8)
  schedules?: MatchScheduleItem[];
  masterTeams?: any[];
}

export function PlayoffTab({ schedules = [], masterTeams = [] }: PlayoffTabProps) {
  // Hitung Standing Akumulatif (Hanya jalan jika data dikirim dari parent)
  const standings = useMemo(() => {
    // Jika parent tidak kirim data (karena diproteksi), calculator return array kosong
    if (!schedules.length || !masterTeams.length) return [];
    return calculateStandings(schedules, masterTeams);
  }, [schedules, masterTeams]);

  // Kelompokkan Tim Per Divisi (Hanya jika data tersedia)
  const groupAStandings = useMemo(() => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_A), [standings]);
  const groupBStandings = useMemo(() => standings.filter((s) => s.groupName === DIVISION_MAP.GROUP_B), [standings]);

  // Ekstrak Tim Lolos Otomatis ke QF (Top 2 Group A & B)
  const top1GroupA = groupAStandings[0];
  const top2GroupA = groupAStandings[1];
  const top1GroupB = groupBStandings[0];
  const top2GroupB = groupBStandings[1];

  // Ekstrak Tim Wildcard Seed 1 s/d 8 (8 Tim Global Tersisa)
  const wildcardSeeds = useMemo(() => {
    if (!standings.length) return [];
    const directNames = new Set(
      [top1GroupA?.teamName, top2GroupA?.teamName, top1GroupB?.teamName, top2GroupB?.teamName].filter(
        Boolean
      )
    );
    return standings.filter((t) => !directNames.has(t.teamName)).slice(0, 8);
  }, [standings, top1GroupA, top2GroupA, top1GroupB, top2GroupB]);

  // Helper untuk merender Teks Placeholder vs Data Asli
  const getTeamDisplay = (teamData?: ExtendedStandingItem, fallbackName: string = "TBD") => {
    // Jika parent kirim data (Week>=8 or Key=Admin), tampilkan nama asli
    if (teamData) {
      return (
        <div className="flex items-center gap-1.5 truncate">
          <img src={teamData.teamLogo} alt="" className="h-4 w-4 shrink-0 object-contain" />
          <span className="truncate font-black text-foreground text-[11px] leading-tight">
            {teamData.teamName}
          </span>
        </div>
      );
    }
    // Jika tidak ada data, tampilkan teks placeholder samar
    return (
      <div className="flex items-center gap-1.5 truncate">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className="truncate font-bold text-muted-foreground/60 text-[11px] leading-tight">
          {fallbackName}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xl relative">
      {/* HEADER PAGE */}
      <div className="border-b border-border pb-3 text-center sm:text-left space-y-1">
        <h3 className="text-xs font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
          <span>🏆</span> Playoff Stacked Flow Stage
        </h3>
        <p className="text-[11px] text-muted-foreground font-semibold">
          Data tim otomatis diisi berdasarkan Klasemen Grup &amp; Global Standing. Data hanya muncul jika Week Playoff dimulai atau menggunakan Key Admin.
        </p>
      </div>

      {/* ========================================================
          1. TAMPILAN MOBILE & TABLET (VERTICAL DUAL-BRACKET FLOW)
             HP & MD: Menumpuk Vertikal ke Bawah.
          ======================================================== */}
      <div className="flex lg:hidden flex-col gap-10 w-full relative">
        
        {/* === UPPER BRACKET (QUALIFIER A) === */}
        <div className="space-y-6 bg-sky-500/5 p-4 rounded-2xl border border-sky-500/20 relative">
          <div className="flex items-center gap-2.5 border-b border-sky-500/30 pb-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-sky-400">
              UPPER BRACKET (QUALIFIER A)
            </h4>
          </div>

          <div className="space-y-5 relative">
            {/* MATCH 1 PI & QF 1 DENGAN BOX FASE KONSISTEN SEPERTI GRAND FINAL */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-4">
              <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[0], "Wildcard Seed 1")} team2Display={getTeamDisplay(wildcardSeeds[7], "Wildcard Seed 8")} label="Play-Ins #1" />
              <TimelineMatchCard team1Display={getTeamDisplay(top1GroupA, `Top 1 ${DIVISION_MAP.GROUP_A}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #1")} label="QF #1" badgeText="Qual. Langsung" isDirect />
            </div>

            {/* MATCH 2 PI & QF 2 DENGAN BOX FASE KONSISTEN */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-4">
              <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[3], "Wildcard Seed 4")} team2Display={getTeamDisplay(wildcardSeeds[4], "Wildcard Seed 5")} label="Play-Ins #2" />
              <TimelineMatchCard team1Display={getTeamDisplay(top2GroupB, `Top 2 ${DIVISION_MAP.GROUP_B}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #2")} label="QF #2" badgeText="Qual. Langsung" isDirect />
            </div>

            {/* SF 1 */}
            <div className="pt-2 relative">
              <TimelineMatchCard team1Display={getTeamDisplay(undefined, "Winner QF #1")} team2Display={getTeamDisplay(undefined, "Winner QF #2")} label="SEMI-FINAL #1" />
            </div>
          </div>
        </div>

        {/* === GRAND FINAL CENTER STAGE === */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-5 text-center shadow-lg space-y-2 relative my-2 z-10">
          <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
            👑 GRAND FINAL CHAMPIONSHIP
          </p>
          <div className="border-t border-purple-500/30 my-1.5" />
          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold text-slate-200">Winner SF #1</p>
            <p className="text-[10px] text-amber-400 font-black">VS</p>
            <p className="text-[11px] font-extrabold text-slate-200">Winner SF #2</p>
          </div>
        </div>

        {/* === LOWER BRACKET (QUALIFIER B) === */}
        <div className="space-y-6 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 relative">
          <div className="flex items-center gap-2.5 border-b border-amber-500/30 pb-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              LOWER BRACKET (QUALIFIER B)
            </h4>
          </div>

          <div className="space-y-5 relative">
            {/* MATCH 3 PI & QF 3 DENGAN BOX FASE KONSISTEN */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-4">
              <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[1], "Wildcard Seed 2")} team2Display={getTeamDisplay(wildcardSeeds[6], "Wildcard Seed 7")} label="Play-Ins #3" />
              <TimelineMatchCard team1Display={getTeamDisplay(top1GroupB, `Top 1 ${DIVISION_MAP.GROUP_B}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #3")} label="QF #3" badgeText="Qual. Langsung" isDirect />
            </div>

            {/* MATCH 4 PI & QF 4 DENGAN BOX FASE KONSISTEN */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-4">
              <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[2], "Wildcard Seed 3")} team2Display={getTeamDisplay(wildcardSeeds[5], "Wildcard Seed 6")} label="Play-Ins #4" />
              <TimelineMatchCard team1Display={getTeamDisplay(top2GroupA, `Top 2 ${DIVISION_MAP.GROUP_A}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #4")} label="QF #4" badgeText="Qual. Langsung" isDirect />
            </div>

            {/* SF 2 */}
            <div className="pt-2 relative">
              <TimelineMatchCard team1Display={getTeamDisplay(undefined, "Winner QF #3")} team2Display={getTeamDisplay(undefined, "Winner QF #4")} label="SEMI-FINAL #2" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP (HORIZONTAL FLOW 4-KOLOM + GARIS CONNECTOR)
          ======================================================== */}
      <div className="hidden lg:grid grid-cols-4 gap-6 text-xs py-4 px-2 relative min-w-[950px]">
        {/* ROUND 1: PLAY-INS */}
        <div className="flex flex-col justify-around gap-6 relative">
          <span className="font-extrabold text-[10px] text-sky-400 uppercase tracking-widest border-b border-sky-500/30 pb-1 text-center">
            ROUND 1 (PLAY-INS)
          </span>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[0], "Wildcard Seed 1")} team2Display={getTeamDisplay(wildcardSeeds[7], "Wildcard Seed 8")} label="Play-Ins #1" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80 z-0"></div>
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[3], "Wildcard Seed 4")} team2Display={getTeamDisplay(wildcardSeeds[4], "Wildcard Seed 5")} label="Play-Ins #2" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80 z-0"></div>
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[1], "Wildcard Seed 2")} team2Display={getTeamDisplay(wildcardSeeds[6], "Wildcard Seed 7")} label="Play-Ins #3" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80 z-0"></div>
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(wildcardSeeds[2], "Wildcard Seed 3")} team2Display={getTeamDisplay(wildcardSeeds[5], "Wildcard Seed 6")} label="Play-Ins #4" />
            <div className="absolute right-[-24px] top-1/2 w-6 h-[2px] bg-border/80 z-0"></div>
          </div>
        </div>

        {/* QUARTER-FINAL */}
        <div className="flex flex-col justify-around gap-8 my-auto relative pl-4">
          <span className="font-extrabold text-[10px] text-amber-400 uppercase tracking-widest border-b border-amber-500/30 pb-1 text-center">
            QUARTER-FINAL
          </span>

          {/* Garis Siku menghubungkan QF ke SF */}
          <svg className="absolute left-full top-0 h-full w-6 z-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 110 L 12 110 L 12 170 L 24 170" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
            <path d="M 0 230 L 12 230 L 12 170 L 24 170" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
            <path d="M 0 350 L 12 350 L 12 410 L 24 410" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
            <path d="M 0 470 L 12 470 L 12 410 L 24 410" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
          </svg>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(top1GroupA, `Top 1 ${DIVISION_MAP.GROUP_A}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #1")} label="QF #1" isDirect badge1Color="text-sky-400" />
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(top2GroupB, `Top 2 ${DIVISION_MAP.GROUP_B}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #2")} label="QF #2" isDirect badge1Color="text-amber-400" />
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(top1GroupB, `Top 1 ${DIVISION_MAP.GROUP_B}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #3")} label="QF #3" isDirect badge1Color="text-amber-400" />
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(top2GroupA, `Top 2 ${DIVISION_MAP.GROUP_A}`)} team2Display={getTeamDisplay(undefined, "Winner Play-Ins #4")} label="QF #4" isDirect badge1Color="text-sky-400" />
          </div>
        </div>

        {/* SEMI-FINAL */}
        <div className="flex flex-col justify-around gap-16 my-auto relative pl-4">
          <span className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-widest border-b border-emerald-500/30 pb-1 text-center">
            SEMI-FINAL
          </span>

          {/* Garis Siku menghubungkan SF ke GF */}
          <svg className="absolute left-full top-0 h-full w-6 z-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 170 L 12 170 L 12 290 L 24 290" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
            <path d="M 0 410 L 12 410 L 12 290 L 24 290" stroke="currentColor" strokeWidth="2" fill="none" className="text-border/60" />
          </svg>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(undefined, "Winner QF #1")} team2Display={getTeamDisplay(undefined, "Winner QF #2")} label="SF #1" />
          </div>

          <div className="relative">
            <TimelineMatchCard team1Display={getTeamDisplay(undefined, "Winner QF #3")} team2Display={getTeamDisplay(undefined, "Winner QF #4")} label="SF #2" />
          </div>
        </div>

        {/* GRAND FINAL */}
        <div className="flex flex-col justify-center my-auto relative pl-4">
          <span className="font-extrabold text-[10px] text-purple-400 uppercase tracking-widest border-b border-purple-500/30 pb-1 mb-3 text-center">
            GRAND FINAL
          </span>

          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-5 text-center shadow-lg space-y-2 relative z-10">
            <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
              👑 CHAMPIONSHIP
            </p>
            <div className="border-t border-purple-500/30 my-1.5" />
            <div className="space-y-1.5">
              <p className="text-[11px] font-extrabold text-slate-200">Winner SF #1</p>
              <p className="text-[10px] text-amber-400 font-black">VS</p>
              <p className="text-[11px] font-extrabold text-slate-200">Winner SF #2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Kartu Match Fase dengan Kotak Konsisten
function TimelineMatchCard({
  team1Display,
  team2Display,
  label,
  badgeText,
  isDirect,
}: {
  team1Display: React.ReactNode;
  team2Display: React.ReactNode;
  label?: string;
  badgeText?: string;
  isDirect?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-background/60 hover:border-primary/50 p-3 flex flex-col gap-2.5 shadow-sm transition relative z-10 ${
        isDirect ? "border-amber-500/50 bg-amber-500/5" : "border-border"
      }`}
    >
      {/* Header Match */}
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[9.5px] font-black text-primary uppercase tracking-wider">
          {label}
        </span>
        {badgeText && (
          <span className="text-[8.5px] font-black text-amber-500 uppercase px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 whitespace-nowrap">
            {badgeText}
          </span>
        )}
      </div>

      {/* TEAM 1 */}
      <div className="flex items-center justify-between font-bold text-[11px] min-w-0 pr-1">
        {team1Display}
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>

      <div className="border-t border-border/40" />

      {/* TEAM 2 */}
      <div className="flex items-center justify-between font-bold text-[11px] min-w-0 pr-1">
        {team2Display}
        <span className="text-primary font-black text-xs pl-1">0</span>
      </div>
    </div>
  );
    }
                            
