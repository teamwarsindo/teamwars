"use client";

import { useMemo } from "react";
import { MatchScheduleItem, DIVISION_MAP } from "@/lib/types/tournament";
import { calculateStandings, ExtendedStandingItem } from "@/lib/tournament/calculator";
import { CircleCheckBig } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-xl relative">
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
          LAYOUT: STACKED LIST FLOW (RESPONSIF NO-LINES)
          HP: Menumpuk Vertikal ke Bawah.
          Desktop: 4 Kolom List Menyamping.
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-10 relative">
        {/* --- ROUND 1: PLAY-INS --- */}
        <div className="space-y-4">
          <TimelineHeader color="text-sky-400" label="ROUND 1 (PLAY-INS)" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 🟢 FIXED: Gunakan properti team1/team2, bukan fallback1/fallback2 */}
            <TimelineMatchCard team1={wildcardSeeds[0]} fallback1="Wildcard Seed 1" team2={wildcardSeeds[7]} fallback2="Wildcard Seed 8" label="Play-Ins #1" />
            <TimelineMatchCard team1={wildcardSeeds[3]} fallback1="Wildcard Seed 4" team2={wildcardSeeds[4]} fallback2="Wildcard Seed 5" label="Play-Ins #2" />
            <TimelineMatchCard team1={wildcardSeeds[1]} fallback1="Wildcard Seed 2" team2={wildcardSeeds[6]} fallback2="Wildcard Seed 7" label="Play-Ins #3" />
            <TimelineMatchCard team1={wildcardSeeds[2]} fallback1="Wildcard Seed 3" team2={wildcardSeeds[5]} fallback2="Wildcard Seed 6" label="Play-Ins #4" />
          </div>
        </div>

        {/* --- QUARTER-FINAL --- */}
        <div className="space-y-4">
          <TimelineHeader color="text-amber-400" label="QUARTER-FINAL" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 🟢 FIXED: Gunakan properti team1/team2, bukan fallback1/fallback2 */}
            <TimelineMatchCard
              team1={top1GroupA}
              fallback1={`Top 1 ${DIVISION_MAP.GROUP_A} ✓`}
              team2={undefined} // 🟢 FIXED: Berikan undefined jika belum ada data tim
              fallback2="Winner Play-Ins #1"
              label="QF #1"
              badgeText="Qual. Langsung"
              isDirect
              badge1Color="text-sky-400"
            />
            <TimelineMatchCard
              team1={top2GroupB}
              fallback1={`Top 2 ${DIVISION_MAP.GROUP_B} ✓`}
              team2={undefined} // 🟢 FIXED
              fallback2="Winner Play-Ins #2"
              label="QF #2"
              badgeText="Qual. Langsung"
              isDirect
              badge1Color="text-amber-400"
            />
            <TimelineMatchCard
              team1={top1GroupB}
              fallback1={`Top 1 ${DIVISION_MAP.GROUP_B} ✓`}
              team2={undefined} // 🟢 FIXED
              fallback2="Winner Play-Ins #3"
              label="QF #3"
              badgeText="Qual. Langsung"
              isDirect
              badge1Color="text-amber-400"
            />
            <TimelineMatchCard
              team1={top2GroupA}
              fallback1={`Top 2 ${DIVISION_MAP.GROUP_A} ✓`}
              team2={undefined} // 🟢 FIXED
              fallback2="Winner Play-Ins #4"
              label="QF #4"
              badgeText="Qual. Langsung"
              isDirect
              badge1Color="text-sky-400"
            />
          </div>
        </div>

        {/* --- SEMI-FINAL --- */}
        <div className="space-y-4">
          <TimelineHeader color="text-emerald-400" label="SEMI-FINAL" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 🟢 FIXED: Gunakan properti team1/team2, berikan undefined jika data belum ada */}
            <TimelineMatchCard team1={undefined} fallback1="Winner QF #1" team2={undefined} fallback2="Winner QF #2" label="SEMI-FINAL #1" />
            <TimelineMatchCard team1={undefined} fallback1="Winner QF #3" team2={undefined} fallback2="Winner QF #4" label="SEMI-FINAL #2" />
          </div>
        </div>

        {/* --- GRAND FINAL CHAMPIONSHIP FINAL --- */}
        <div className="space-y-4">
          <TimelineHeader color="text-purple-400" label="GRAND FINAL" />
          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 p-5 text-center shadow-lg space-y-2.5 relative">
            <p className="font-black text-purple-400 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
              👑 CHAMPIONSHIP FINAL
            </p>
            <div className="border-t border-purple-500/30 my-1" />
            <div className="space-y-1.5">
              <p className="text-[11px] font-extrabold text-slate-200">Winner SEMI-FINAL #1</p>
              <p className="text-[10px] text-amber-400 font-black">VS</p>
              <p className="text-[11px] font-extrabold text-slate-200">Winner SEMI-FINAL #2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Judul Header Timeline
function TimelineHeader({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center justify-center lg:justify-start gap-2.5 pb-2 border-b border-border/60">
      <div className={`h-2.5 w-2.5 rounded-full ${color.replace("text-", "bg-")}`}></div>
      <h4 className={`text-xs font-black uppercase tracking-widest ${color}`}>{label}</h4>
    </div>
  );
}

// BEST PRACTICE: Definisikan Interface untuk mencantumkan properti opsional 'badge1Color'
interface TimelineMatchCardProps {
  team1?: ExtendedStandingItem; // 🟢 FIXED: Ubah tipe ke ExtendedStandingItem dan opsional
  fallback1: string;
  team2?: ExtendedStandingItem; // 🟢 FIXED: Ubah tipe ke ExtendedStandingItem dan opsional
  fallback2: string;
  label?: string;
  badgeText?: string;
  isDirect?: boolean;
  badge1Color?: string;
}

// BEST PRACTICE: Gunakan Interface tersebut sebagai tipe parameter komponen
function TimelineMatchCard({
  team1,
  fallback1,
  team2,
  fallback2,
  label,
  badgeText,
  isDirect,
  badge1Color,
}: TimelineMatchCardProps) {

  // 🟢 FIXED: Logika render Team Display dipindah ke dalam komponen TimelineMatchCard
  const getTeamDisplay = (teamData?: ExtendedStandingItem, fallbackName: string = "TBD") => {
    // Jika data tim tersedia, tampilkan nama asli
    if (teamData) {
      // Placeholder pemenang (✓)
      const isWinner = teamData.teamName.includes("✓") || false; 

      return (
        <div className="flex items-center gap-1.5 truncate">
          <img src={teamData.teamLogo} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
          <span className={`truncate leading-tight text-[11px] font-bold text-foreground`}>
            {isWinner ? teamData.teamName.replace(" ✓", "") : teamData.teamName}
          </span>
          {isWinner && <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" />}
        </div>
      );
    }
    // Jika tidak ada data, tampilkan teks placeholder samar
    return (
      <div className="flex items-center gap-1.5 truncate">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className={`truncate leading-tight text-[11px] font-medium text-muted-foreground`}>
          {fallbackName}
        </span>
      </div>
    );
  };

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
      <div className={`flex items-center justify-between font-bold text-[11px] min-w-0 pr-1`}>
        {/* 🟢 FIXED: Panggil helper display dengan opsional teamNumber1Color */}
        {getTeamDisplay(team1, fallback1)}
        <span className={`text-primary font-black text-xs pl-1`}>0</span>
      </div>

      <div className="border-t border-border/40" />

      {/* TEAM 2 */}
      <div className={`flex items-center justify-between font-bold text-[11px] min-w-0 pr-1`}>
        {/* 🟢 FIXED: Panggil helper display */}
        {getTeamDisplay(team2, fallback2)}
        <span className={`text-primary font-black text-xs pl-1`}>0</span>
      </div>
    </div>
  );
}
