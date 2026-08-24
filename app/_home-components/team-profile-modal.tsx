"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MatchScheduleItem } from "@/app/tournament/_library";
import {
  ExtendedStandingItem,
  getTeamProfileStats,
} from "@/app/tournament/_library/calculator";
import { TeamStrategyView } from "./team-strategy-view";
import { X, Trophy, Activity, Sparkles } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"ANALISIS" | "RIWAYAT">("ANALISIS");
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        ref={modalContentRef}
        className="relative flex w-full max-w-sm sm:max-w-md md:max-w-lg flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* HEADER PROFIL */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-xl border border-border bg-background p-1 flex items-center justify-center">
              <img
                src={teamData.teamLogo}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black truncate text-foreground">
                {teamData.teamName}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`rounded border px-1.5 py-0.2 text-[8.5px] font-bold ${
                    teamData.isGroupA
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {teamData.qualification.rankLabel} • {teamData.groupName}
                </span>

                <span
                  className={`rounded border px-1.5 py-0.2 text-[8.5px] font-bold ${
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
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BODY KONTEN */}
        <div className="p-3 sm:p-3.5 space-y-2.5 text-xs">
          {/* 1. STATISTIK PERFORMA */}
          <div className="space-y-1.5 rounded-2xl border border-border bg-muted/20 p-2.5">
            <div className="flex justify-between items-center text-[9px] text-muted-foreground">
              <span className="font-bold flex items-center gap-1 text-foreground uppercase tracking-wider">
                <Activity className="h-3 w-3 text-primary" /> Performa Tim
              </span>
              <div className="flex items-center gap-1">
                {teamData.streak.length > 0 ? (
                  teamData.streak.map((s, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 flex items-center justify-center rounded text-[8px] font-black ${
                        s === "W"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[8.5px]">0 Match</span>
                )}
              </div>
            </div>

            {/* 4 KOTAK STATISTIK */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-xl bg-primary/10 border border-primary/20 py-1">
                <span className="block text-[7.5px] text-muted-foreground font-bold uppercase">WINS</span>
                <span className="text-xs sm:text-sm font-black text-primary">{teamData.matchWins}</span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-1">
                <span className="block text-[7.5px] text-muted-foreground font-bold uppercase">PTS DIFF</span>
                <span
                  className={`text-xs sm:text-sm font-black ${
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
              <div className="rounded-xl bg-muted/40 border border-border py-1">
                <span className="block text-[7.5px] text-muted-foreground font-bold uppercase">SCORED</span>
                <span className="text-xs sm:text-sm font-black text-foreground">{teamData.setWins}</span>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border py-1">
                <span className="block text-[7.5px] text-muted-foreground font-bold uppercase">WIN RATE</span>
                <span className="text-xs sm:text-sm font-black text-amber-500">{teamData.winRate}%</span>
              </div>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40">
            <button
              onClick={() => setActiveTab("ANALISIS")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === "ANALISIS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Analisis & Target</span>
            </button>
            <button
              onClick={() => setActiveTab("RIWAYAT")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === "RIWAYAT"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-3 w-3" />
              <span>Riwayat Match</span>
            </button>
          </div>

          {/* ISI KONTEN TAB */}
          {activeTab === "ANALISIS" ? (
            <TeamStrategyView
              teamName={teamData.teamName}
              allTeams={allTeams}
              allSchedules={allSchedules}
            />
          ) : (
            /* TAB RIWAYAT */
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {teamData.history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-2.5 py-1.5 text-[10.5px]"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span
                      className={`px-1 py-0.2 rounded text-[8px] font-black shrink-0 ${
                        m.isWin
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.isWin ? "WIN" : "LOSE"}
                    </span>
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <img
                        src={m.oppLogo}
                        alt=""
                        className="h-3.5 w-3.5 object-contain shrink-0"
                      />
                      <span className="truncate font-bold text-foreground">{m.oppName}</span>
                    </div>
                  </div>

                  <div className="font-black text-xs min-w-[40px] text-right shrink-0">
                    <span className={m.isWin ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                      {m.myScore}
                    </span>
                    <span className="text-muted-foreground mx-0.5">-</span>
                    <span className={!m.isWin ? "text-rose-600 dark:text-rose-400" : "text-foreground"}>
                      {m.oppScore}
                    </span>
                  </div>
                </div>
              ))}
              {teamData.history.length === 0 && (
                <p className="rounded-xl border border-border bg-muted/10 p-2.5 text-center text-[10px] text-muted-foreground">
                  Belum ada pertandingan yang selesai.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}