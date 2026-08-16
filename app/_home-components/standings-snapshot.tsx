"use client";

import { useState } from "react";
import Link from "next/link";
import { DIVISION_MAP } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { ChevronRight } from "lucide-react";

interface StandingsSnapshotProps {
  loading: boolean;
  topGroupA: ExtendedStandingItem[];
  topGroupB: ExtendedStandingItem[];
  topGlobal: ExtendedStandingItem[];
}

export function StandingsSnapshot({
  loading,
  topGroupA,
  topGroupB,
  topGlobal,
}: StandingsSnapshotProps) {
  const [tab, setTab] = useState<"DIVISION" | "GLOBAL">("DIVISION");

  const renderTeamRow = (
    item: ExtendedStandingItem,
    rowBgColor: string,
    badgeBgColor: string,
    rankText: string
  ) => (
    <div
      key={item.teamName}
      className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${rowBgColor}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-black text-[10px] ${badgeBgColor}`}
        >
          {rankText}
        </span>
        <img
          src={item.teamLogo || "/logo.webp"}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
        />
        <span className="truncate font-bold text-[11px] text-foreground">
          {item.teamName}
        </span>
      </div>

      <div className="flex items-center gap-2.5 text-right shrink-0">
        <span className="text-[10.5px] font-black text-primary w-9 text-center">
          {item.matchWins}-{item.matchLosses}
        </span>
        <span
          className={`text-[10.5px] font-bold w-7 text-center ${
            item.roundDifference > 0
              ? "text-emerald-500"
              : item.roundDifference < 0
              ? "text-rose-500"
              : "text-muted-foreground"
          }`}
        >
          {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
        </span>
        <span className="text-[10.5px] font-extrabold text-foreground w-6 text-center">
          {item.setWins}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* TAB SWITCHER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("DIVISION")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              tab === "DIVISION"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Divisi
          </button>
          <button
            onClick={() => setTab("GLOBAL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              tab === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview Wildcard
          </button>
        </div>

        <Link
          href={
            tab === "DIVISION"
              ? "/tournament?tab=standings&view=groups"
              : "/tournament?tab=standings&view=global"
          }
          className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
        >
          Full Standings <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
          Memuat klasemen...
        </div>
      ) : tab === "DIVISION" ? (
        <div className="space-y-4">
          {/* GRUP A */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 px-1">
              <span>{DIVISION_MAP.GROUP_A}</span>
              <span className="flex gap-2.5 text-muted-foreground">
                <span className="w-9 text-center text-primary">W-L</span>
                <span className="w-7 text-center">DIFF</span>
                <span className="w-6 text-center">SCORED</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {topGroupA.map((item, idx) =>
                renderTeamRow(
                  item,
                  "border-sky-500/30 bg-sky-500/10 hover:border-sky-500/50",
                  "bg-sky-500/20 text-sky-600 dark:text-sky-400",
                  `${idx + 1}`
                )
              )}
            </div>
          </div>

          {/* GRUP B */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
              <span>{DIVISION_MAP.GROUP_B}</span>
              <span className="flex gap-2.5 text-muted-foreground">
                <span className="w-9 text-center text-primary">W-L</span>
                <span className="w-7 text-center">DIFF</span>
                <span className="w-6 text-center">SCORED</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {topGroupB.map((item, idx) =>
                renderTeamRow(
                  item,
                  "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50",
                  "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                  `${idx + 1}`
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PREVIEW WILDCARD (TOP 4 DI REKAPAN HOME) */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1">
            <span>Rank 1–4 Wildcard Preview</span>
            <span className="flex gap-2.5 text-muted-foreground">
              <span className="w-9 text-center text-primary">W-L</span>
              <span className="w-7 text-center">DIFF</span>
              <span className="w-6 text-center">SCORED</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {topGlobal.map((item, idx) => (
              renderTeamRow(
                item,
                "border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50",
                "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                `${idx + 1}`
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
