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

  const renderTableRows = (
    items: ExtendedStandingItem[],
    rowBgColor: string,
    badgeBgColor: string
  ) => {
    return items.map((item, idx) => (
      <tr key={item.teamName || idx} className={`${rowBgColor} transition`}>
        {/* RANK # */}
        <td className="py-1.5 px-1 w-[10%] text-center">
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-sm font-bold text-[9px] ${badgeBgColor}`}
          >
            {idx + 1}
          </span>
        </td>

        {/* NAMA TIM & LOGO */}
        <td className="py-1.5 pl-1 pr-1 w-[50%]">
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={item.teamLogo || "/logo.webp"}
              alt=""
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
            <span className="truncate font-semibold text-[10.5px] text-foreground">
              {item.teamName}
            </span>
          </div>
        </td>

        {/* W-L */}
        <td className="py-1.5 px-0.5 text-center font-bold text-primary text-[10px] w-[14%]">
          {item.matchWins}-{item.matchLosses}
        </td>

        {/* PTS DIFF */}
        <td className="py-1.5 px-0.5 text-center font-medium text-[10px] w-[13%]">
          <span
            className={
              item.roundDifference > 0
                ? "text-emerald-500"
                : item.roundDifference < 0
                ? "text-rose-500"
                : "text-muted-foreground"
            }
          >
            {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
          </span>
        </td>

        {/* SCORED */}
        <td className="py-1.5 pl-0.5 pr-2 text-center font-medium text-foreground text-[10px] w-[13%]">
          {item.setWins}
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-sm">
      {/* TAB SWITCHER & LINK */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("DIVISION")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              tab === "DIVISION"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Divisi
          </button>
          <button
            onClick={() => setTab("GLOBAL")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              tab === "GLOBAL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Wildcard
          </button>
        </div>

        <Link
          href={
            tab === "DIVISION"
              ? "/tournament?tab=standings&view=groups"
              : "/tournament?tab=standings&view=global"
          }
          className="flex items-center gap-0.5 text-[10.5px] font-medium text-primary hover:underline"
        >
          Full Standings <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
          Memuat klasemen...
        </div>
      ) : tab === "DIVISION" ? (
        <div className="space-y-3">
          {/* GRUP A */}
          <div className="space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 px-1">
              Divisi {DIVISION_MAP.GROUP_A}
            </span>
            <div className="overflow-hidden rounded-lg border border-sky-500/20">
              <table className="w-full text-left table-fixed">
                <thead className="bg-sky-500/10 border-b border-sky-500/20 text-[8.5px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 px-1 text-center w-[10%]">#</th>
                    <th className="py-1 pl-1 pr-1 w-[50%]">TEAM</th>
                    <th className="py-1 px-0.5 text-center w-[14%] text-primary">W-L</th>
                    <th className="py-1 px-0.5 text-center w-[13%]">DIFF</th>
                    <th className="py-1 pl-0.5 pr-2 text-center w-[13%]">SCORED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-500/10">
                  {renderTableRows(
                    topGroupA,
                    "bg-sky-500/5 hover:bg-sky-500/10",
                    "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRUP B */}
          <div className="space-y-1">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
              Divisi {DIVISION_MAP.GROUP_B}
            </span>
            <div className="overflow-hidden rounded-lg border border-amber-500/20">
              <table className="w-full text-left table-fixed">
                <thead className="bg-amber-500/10 border-b border-amber-500/20 text-[8.5px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 px-1 text-center w-[10%]">#</th>
                    <th className="py-1 pl-1 pr-1 w-[50%]">TEAM</th>
                    <th className="py-1 px-0.5 text-center w-[14%] text-primary">W-L</th>
                    <th className="py-1 px-0.5 text-center w-[13%]">DIFF</th>
                    <th className="py-1 pl-0.5 pr-2 text-center w-[13%]">SCORED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {renderTableRows(
                    topGroupB,
                    "bg-amber-500/5 hover:bg-amber-500/10",
                    "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB: TOP 4 WILDCARD PLAYOFF */
        <div className="space-y-1">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1">
            Top 4 Wildcard Playoff
          </span>
          <div className="overflow-hidden rounded-lg border border-emerald-500/20">
            <table className="w-full text-left table-fixed">
              <thead className="bg-emerald-500/10 border-b border-emerald-500/20 text-[8.5px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="py-1 px-1 text-center w-[10%]">#</th>
                  <th className="py-1 pl-1 pr-1 w-[50%]">TEAM</th>
                  <th className="py-1 px-0.5 text-center w-[14%] text-primary">W-L</th>
                  <th className="py-1 px-0.5 text-center w-[13%]">DIFF</th>
                  <th className="py-1 pl-0.5 pr-2 text-center w-[13%]">SCORED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {renderTableRows(
                  topGlobal,
                  "bg-emerald-500/5 hover:bg-emerald-500/10",
                  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
