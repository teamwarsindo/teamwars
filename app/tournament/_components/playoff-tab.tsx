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

function TeamSlotDisplay({ team }: { team: PlayoffSlotTeam }) {
  if (team.isPlaceholder) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="h-2 w-2 rounded-full bg-muted shrink-0" />
        <span className="leading-tight text-xs xl:text-sm font-bold text-muted-foreground/70 truncate italic">
          {team.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <img
        src={team.logo || "/logo.webp"}
        alt=""
        className="h-5 w-5 xl:h-6 xl:w-6 rounded-full shrink-0 object-contain bg-muted/40 p-0.5 border border-border/60"
      />
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`leading-tight text-xs xl:text-sm font-bold truncate ${
            team.isWinner ? "text-primary font-black" : "text-foreground"
          }`}
        >
          {team.name}
        </span>
        <span className="text-[9.5px] xl:text-[10.5px] text-muted-foreground/80 font-medium truncate leading-none mt-0.5">
          {team.seedLabel}
        </span>
      </div>
    </div>
  );
}

function TimelineMatchCard({
  match,
  colorTheme = "sky",
  isDirect = false,
}: {
  match: PlayoffBracketMatchItem;
  colorTheme?: "sky" | "amber" | "emerald" | "purple";
  isDirect?: boolean;
}) {
  const borderThemeMap = {
    sky: "border-sky-500/30 bg-background/90 hover:border-sky-500/70",
    amber: "border-amber-500/30 bg-background/90 hover:border-amber-500/70",
    emerald: "border-emerald-500/30 bg-background/90 hover:border-emerald-500/70",
    purple: "border-purple-500/30 bg-background/90 hover:border-purple-500/70",
  };

  return (
    <div
      className={`rounded-xl border p-3 xl:p-3.5 flex flex-col gap-2 shadow-xs transition relative z-10 ${
        borderThemeMap[colorTheme]
      } ${isDirect ? "bg-amber-500/5 border-amber-500/40" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border/30 pb-1.5 gap-2">
        <span className="text-[10px] xl:text-[11px] font-black text-primary uppercase tracking-wider">
          {match.label}
        </span>
        {match.isFinished && (
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
            FINAL
          </span>
        )}
      </div>

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <TeamSlotDisplay team={match.teamA} />
        <span
          className={`font-mono font-black text-xs xl:text-sm shrink-0 pl-1 ${
            match.teamA.isWinner ? "text-emerald-500" : "text-primary"
          }`}
        >
          {match.isFinished ? match.teamA.score : 0}
        </span>
      </div>

      <div className="border-t border-border/30" />

      <div className="flex items-center justify-between font-bold text-xs min-w-0 gap-2">
        <TeamSlotDisplay team={match.teamB} />
        <span
          className={`font-mono font-black text-xs xl:text-sm shrink-0 pl-1 ${
            match.teamB.isWinner ? "text-emerald-500" : "text-primary"
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
        {/* ROUND 1 (PLAY-INS) */}
        <div className="rounded-2xl border-2 border-sky-500/40 bg-sky-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="ROUND 1 (PLAY-INS)" colorTheme="sky" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            {bracket.playIns.map((m) => (
              <TimelineMatchCard key={m.id} match={m} colorTheme="sky" />
            ))}
          </div>
        </div>

        {/* ROUND 2: QUARTER-FINAL */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="QUARTER-FINAL" colorTheme="amber" />
          <div className="space-y-3 flex-1 flex flex-col justify-around">
            {bracket.quarterFinals.map((m) => (
              <TimelineMatchCard key={m.id} match={m} colorTheme="amber" isDirect />
            ))}
          </div>
        </div>

        {/* ROUND 3: SEMI-FINAL */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 p-3.5 xl:p-4 space-y-3.5 shadow-sm flex flex-col justify-between">
          <PhaseHeader title="SEMI-FINAL" colorTheme="emerald" />
          <div className="space-y-3 flex-1 flex flex-col justify-around my-auto">
            {bracket.semiFinals.map((m) => (
              <TimelineMatchCard key={m.id} match={m} colorTheme="emerald" />
            ))}
          </div>
        </div>

        {/* ROUND 4: GRAND FINAL */}
        <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/20 p-4 xl:p-5 text-center shadow-lg flex flex-col justify-between space-y-3.5">
          <PhaseHeader title="GRAND FINAL" colorTheme="purple" />
          {bracket.grandFinal ? (
            <div className="my-auto">
              <TimelineMatchCard match={bracket.grandFinal} colorTheme="purple" />
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
