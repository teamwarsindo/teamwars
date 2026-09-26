"use client";

import { useMemo } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  buildPlayoffBracket,
  PlayoffBracketMatchItem,
  PlayoffSlotTeam,
} from "@/app/tournament/_library/calculator";

interface PlayoffTabProps {
  schedules?: MatchScheduleItem[];
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
      <h4 className={`text-xs xl:text-sm font-black uppercase tracking-wider ${currentTheme.split(" ")[0]}`}>
        {title}
      </h4>
    </div>
  );
}

function TeamSlotDisplay({
  team,
  isFinished,
  nextStageLabel,
  nextBadgeColor,
}: {
  team: PlayoffSlotTeam;
  isFinished?: boolean;
  nextStageLabel: string;
  nextBadgeColor: "amber" | "emerald" | "purple" | "gold";
}) {
  if (team.isPlaceholder) {
    return (
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-muted/60 border border-border/50 shrink-0 flex items-center justify-center text-[10px] text-muted-foreground/60 font-black">
          ?
        </span>
        <span className="leading-tight text-xs xl:text-sm font-bold text-muted-foreground/70 truncate italic">
          {team.name}
        </span>
      </div>
    );
  }

  const badgeColorMap = {
    amber: "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30",
    emerald: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30",
    purple: "bg-purple-500/15 text-purple-500 dark:text-purple-400 border-purple-500/30",
    gold: "bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500/40",
  };

  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      {/* Logo Tim Diperbesar */}
      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0 overflow-hidden bg-muted/30 p-0.5 border border-border/70 flex items-center justify-center shadow-2xs">
        <img
          src={team.logo || "/logo.webp"}
          alt=""
          className="h-full w-full rounded-full object-contain"
        />
      </div>

      <div className="flex flex-col min-w-0 flex-1 justify-center">
        <span
          className={`leading-tight text-xs sm:text-sm font-bold truncate ${
            team.isWinner ? "text-primary font-black" : "text-foreground"
          }`}
        >
          {team.name}
        </span>

        {/* Badge Status Kelolosan / Gugur */}
        <div className="flex items-center mt-1">
          {isFinished ? (
            team.isWinner ? (
              <span
                className={`text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border leading-none ${badgeColorMap[nextBadgeColor]}`}
              >
                Advance to {nextStageLabel}
              </span>
            ) : (
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 leading-none">
                Eliminated
              </span>
            )
          ) : (
            <span className="text-[9.5px] sm:text-[10.5px] text-muted-foreground/80 font-medium truncate leading-none">
              {team.seedLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineMatchCard({
  match,
  colorTheme = "sky",
  isDirect = false,
  nextStageLabel = "Quarter-Finals",
  nextBadgeColor = "amber",
}: {
  match: PlayoffBracketMatchItem;
  colorTheme?: "sky" | "amber" | "emerald" | "purple";
  isDirect?: boolean;
  nextStageLabel?: string;
  nextBadgeColor?: "amber" | "emerald" | "purple" | "gold";
}) {
  const borderThemeMap = {
    sky: "border-sky-500/30 bg-background/90 hover:border-sky-500/70",
    amber: "border-amber-500/30 bg-background/90 hover:border-amber-500/70",
    emerald: "border-emerald-500/30 bg-background/90 hover:border-emerald-500/70",
    purple: "border-purple-500/30 bg-background/90 hover:border-purple-500/70",
  };

  return (
    <div
      className={`rounded-xl border p-3 xl:p-3.5 flex flex-col gap-2.5 shadow-xs transition relative z-10 ${
        borderThemeMap[colorTheme]
      } ${isDirect ? "bg-amber-500/5 border-amber-500/40" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[10px] xl:text-[11px] font-black text-primary uppercase tracking-wider">
          {match.label}
        </span>
      </div>

      {/* Tim A */}
      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <TeamSlotDisplay
          team={match.teamA}
          isFinished={match.isFinished}
          nextStageLabel={nextStageLabel}
          nextBadgeColor={nextBadgeColor}
        />
        <span
          className={`font-mono font-black text-xs xl:text-sm shrink-0 pl-1 ${
            match.teamA.isWinner ? "text-emerald-500" : "text-muted-foreground"
          }`}
        >
          {match.isFinished ? match.teamA.score : 0}
        </span>
      </div>

      <div className="border-t border-border/30" />

      {/* Tim B */}
      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <TeamSlotDisplay
          team={match.teamB}
          isFinished={match.isFinished}
          nextStageLabel={nextStageLabel}
          nextBadgeColor={nextBadgeColor}
        />
        <span
          className={`font-mono font-black text-xs xl:text-sm shrink-0 pl-1 ${
            match.teamB.isWinner ? "text-emerald-500" : "text-muted-foreground"
          }`}
        >
          {match.isFinished ? match.teamB.score : 0}
        </span>
      </div>
    </div>
  );
}

export function PlayoffTab({ schedules = [] }: PlayoffTabProps) {
  const bracket = useMemo(() => buildPlayoffBracket(schedules), [schedules]);

  return (
    <div className="w-full flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 xl:p-8 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-border pb-4 gap-4">
        <div className="text-center sm:text-left space-y-1">
          <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-primary tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
            <span>🏆</span> Playoff Stage Bracket
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold">
            Bagan babak gugur resmi Team Wars Indonesia Season 7.
          </p>
        </div>
      </div>

      {/* Grid Bagan 4 Babak Playoff */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 xl:gap-6 relative w-full">
        {/* ROUND 1 (PLAY-INS) -> Pemenang lanjut ke Quarter-Finals (Amber) */}
        <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="ROUND 1 (PLAY-INS)" colorTheme="sky" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            {bracket.playIns.map((m) => (
              <TimelineMatchCard
                key={m.id}
                match={m}
                colorTheme="sky"
                nextStageLabel="Quarter-Finals"
                nextBadgeColor="amber"
              />
            ))}
          </div>
        </div>

        {/* ROUND 2: QUARTER-FINAL -> Pemenang lanjut ke Semi-Finals (Emerald) */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="QUARTER-FINAL" colorTheme="amber" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            {bracket.quarterFinals.map((m) => (
              <TimelineMatchCard
                key={m.id}
                match={m}
                colorTheme="amber"
                isDirect
                nextStageLabel="Semi-Finals"
                nextBadgeColor="emerald"
              />
            ))}
          </div>
        </div>

        {/* ROUND 3: SEMI-FINAL -> Pemenang lanjut ke Grand Final (Purple) */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="SEMI-FINAL" colorTheme="emerald" />
          <div className="space-y-3 flex-1 flex flex-col justify-around my-auto">
            {bracket.semiFinals.map((m) => (
              <TimelineMatchCard
                key={m.id}
                match={m}
                colorTheme="emerald"
                nextStageLabel="Grand Final"
                nextBadgeColor="purple"
              />
            ))}
          </div>
        </div>

        {/* ROUND 4: GRAND FINAL -> Pemenang berstatus Champion (Gold) */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-4 xl:p-5 text-center shadow-lg flex flex-col justify-between space-y-3.5">
          <PhaseHeader title="GRAND FINAL" colorTheme="purple" />
          {bracket.grandFinal ? (
            <div className="my-auto">
              <TimelineMatchCard
                match={bracket.grandFinal}
                colorTheme="purple"
                nextStageLabel="Champion 🏆"
                nextBadgeColor="gold"
              />
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}            
