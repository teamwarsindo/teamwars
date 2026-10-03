"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MatchScheduleItem, TOURNAMENT_RULES } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  buildPlayoffBracket,
} from "@/app/tournament/_library/calculator";
import { ChevronRight, Trophy } from "lucide-react";
import { PlayoffMiniBracket } from "./playoff-mini-bracket";
import { GroupStandingsTable } from "./group-standings-table";

interface StandingsSnapshotProps {
  loading: boolean;
  topGroupA: ExtendedStandingItem[];
  topGroupB: ExtendedStandingItem[];
  topGlobal: ExtendedStandingItem[];
  currentWeek?: number;
  schedules?: MatchScheduleItem[];
}

export function StandingsSnapshot({
  loading,
  topGroupA,
  topGroupB,
  topGlobal,
  currentWeek,
  schedules = [],
}: StandingsSnapshotProps) {
  const [tab, setTab] = useState<"DIVISION" | "GLOBAL">("DIVISION");

  const isPlayoffStage = Boolean(
    currentWeek && currentWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK
  );

  const bracket = useMemo(() => buildPlayoffBracket(schedules), [schedules]);

  // Evaluasi 1 fase berikutnya dan tema warna berdasarkan pekan berjalan
  const playoffPhaseData = useMemo(() => {
    if (!isPlayoffStage) return null;
    const week = currentWeek || TOURNAMENT_RULES.PLAYOFF_START_WEEK;

    // Week 8 (Play-Ins) -> Babak berikutnya: Quarter-Finals
    if (week === TOURNAMENT_RULES.PLAYOFF_START_WEEK) {
      return {
        title: "Next Stage: Quarter-Finals",
        matches: bracket.quarterFinals,
        theme: "amber" as const,
      };
    }
    // Week 9 (Quarter-Finals) -> Babak berikutnya: Semi-Finals
    if (week === TOURNAMENT_RULES.PLAYOFF_START_WEEK + 1) {
      return {
        title: "Next Stage: Semi-Finals",
        matches: bracket.semiFinals,
        theme: "emerald" as const,
      };
    }
    // Week 10+ (Final) -> Grand Final
    return {
      title: "Championship Final",
      matches: bracket.grandFinal ? [bracket.grandFinal] : [],
      theme: "purple" as const,
    };
  }, [isPlayoffStage, currentWeek, bracket]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 md:p-5 shadow-xs flex flex-col justify-between">
      {/* HEADER & NAVIGASI */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5 md:pb-3">
        {isPlayoffStage ? (
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span>{playoffPhaseData?.title || "Bagan Playoff"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab("DIVISION")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                tab === "DIVISION"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Top Divisi
            </button>
            <button
              onClick={() => setTab("GLOBAL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                tab === "GLOBAL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Top Wildcard
            </button>
          </div>
        )}

        <Link
          href={isPlayoffStage ? "/tournament?tab=playoff" : "/tournament?tab=standings"}
          className="flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"
        >
          {isPlayoffStage ? "Full Bracket" : "Full Standings"}{" "}
          <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Link>
      </div>

      {/* KONTEN */}
      {loading ? (
        <div className="py-8 text-center text-xs md:text-sm text-muted-foreground animate-pulse font-semibold">
          Memuat snapshot...
        </div>
      ) : isPlayoffStage ? (
        <PlayoffMiniBracket
          matches={playoffPhaseData?.matches || []}
          grandFinal={bracket.grandFinal}
          theme={playoffPhaseData?.theme || "emerald"}
        />
      ) : (
        <GroupStandingsTable
          tab={tab}
          topGroupA={topGroupA}
          topGroupB={topGroupB}
          topGlobal={topGlobal}
        />
      )}
    </div>
  );
}
