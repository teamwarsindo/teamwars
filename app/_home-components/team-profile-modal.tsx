"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamProfileStats,
} from "@/app/tournament/_library/calculator";
import { TeamStrategyView } from "./team-strategy-view";
import {
  X,
  Trophy,
  Activity,
} from "lucide-react";

interface TeamProfileModalProps {
  team: any;
  allTeams?: ExtendedStandingItem[];
  allSchedules: MatchScheduleItem[];
  onClose: () => void;
}

export function TeamProfileModal({
  team,
  allTeams = [],
  allSchedules = [],
  onClose,
}: TeamProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const teamData = useMemo(() => {
    if (!team) return null;
    return getTeamProfileStats(team, allTeams, allSchedules);
  }, [team, allTeams, allSchedules]);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted || !team || !teamData) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-5 md:p-6 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex max-h-[90vh] w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-5 md:px-6 md:py-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-background p-1 flex items-center justify-center">
              <img
                src={teamData.teamLogo}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-black truncate text-foreground">
                {teamData.teamName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span
                  className={`rounded-md border px-1.5 py-0.5 md:px-2 md:py-0.5 text-[9px] md:text-[10px] font-bold ${
                    teamData.isGroupA
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {teamData.qualification.rankLabel} • {teamData.groupName}
                </span>

                <span
                  className={`rounded-md border px-1.5 py-0.5 md:px-2 md:py-0.5 text-[9px] md:text-[10px] font-bold ${
                    teamData.qualification.isQualified
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {teamData.qualification.stageLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 md:p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 text-xs md:text-sm">
          
          {/* 1. STATISTIK PERFORMA */}
          <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="flex justify-between items-center text-[10px] md:text-xs text-muted-foreground">
              <span className="font-bold flex items-center gap-1 text-foreground uppercase tracking-wider text-[9.5px] md:text-xs">
                <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Performa Tim
              </span>
              <div className="flex items-center gap-1 md:gap-1.5">
                {teamData.streak.length > 0 ? (
                  teamData.streak.map((s, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 md:h-5 md:w-5 flex items-center justify-center rounded text-[8.5px] md:text-[9.5px] font-black ${
                        s === "W"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">0 Match</span>
                )}
              </div>
            </div>

            {/* 4 KOTAK STATISTIK */}
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  WINS
                </span>
                <span className="text-sm sm:text-base md:text-lg font-black text-primary">{teamData.matchWins}</span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  PTS DIFF
                </span>
                <span
                  className={`text-xs sm:text-sm md:text-base font-black ${
                    teamData.rawDiff > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : teamData.rawDiff < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {teamData.roundDifference}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  SCORED
                </span>
                <span className="text-xs sm:text-sm md:text-base font-black text-foreground">
                  {teamData.setWins}
                </span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-2 md:py-2.5">
                <span className="block text-[8px] sm:text-[8.5px] md:text-[9.5px] text-muted-foreground font-bold uppercase">
                  WIN RATE
                </span>
                <span className="text-xs sm:text-sm md:text-base font-black text-amber-500">{teamData.winRate}%</span>
              </div>
            </div>

            <div className="h-1.5 md:h-2 w-full rounded-full bg-rose-500/20 overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${teamData.winRate}%` }}
              />
            </div>
          </div>

          {/* 2. RIWAYAT PERTANDINGAN */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] md:text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-500" /> Riwayat Pertandingan
            </span>
            <div className="space-y-1.5 max-h-36 md:max-h-44 overflow-y-auto pr-1">
              {teamData.history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-3 py-2 md:px-4 md:py-2 text-[11px] md:text-xs"
                >
                  <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] md:text-[9.5px] font-black shrink-0 ${
                        m.isWin
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.isWin ? "WIN" : "LOSE"}
                    </span>
                    <span className="text-muted-foreground text-[10.5px] md:text-xs shrink-0 font-medium">
                      vs
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <img
                        src={m.oppLogo}
                        alt=""
                        className="h-4 w-4 md:h-5 md:w-5 object-contain shrink-0"
                      />
                      <span className="truncate font-bold text-foreground">{m.oppName}</span>
                    </div>
                  </div>

                  <div className="px-3 shrink-0 text-center">
                    <span className="rounded-md bg-card border border-border px-2 py-0.5 font-bold text-[9px] md:text-[10px] text-muted-foreground">
                      Week {m.week}
                    </span>
                  </div>

                  <div className="font-black text-xs md:text-sm min-w-[45px] text-right shrink-0">
                    <span className={m.isWin ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                      {m.myScore}
                    </span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={!m.isWin ? "text-rose-600 dark:text-rose-400" : "text-foreground"}>
                      {m.oppScore}
                    </span>
                  </div>
                </div>
              ))}
              {teamData.history.length === 0 && (
                <p className="rounded-xl border border-border bg-muted/10 p-3 text-center text-[10.5px] md:text-xs text-muted-foreground">
                  Belum ada pertandingan yang selesai.
                </p>
              )}
            </div>
          </div>

          {/* 3. MODUL STRATEGI & PELUANG PLAYOFF */}
          <TeamStrategyView
            teamName={teamData.teamName}
            allTeams={allTeams}
            allSchedules={allSchedules}
          />

        </div>
      </div>
    </div>,
    document.body
  );
            }
                
