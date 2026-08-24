"use client";

import { useState } from "react";
import Link from "next/link";
import { DIVISION_MAP } from "@/app/tournament/_library";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { ChevronRight, Trophy } from "lucide-react";

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
        {/* RANK */}
        <td className="py-2 px-1 md:py-2.5 text-center w-[11%]">
          <span
            className={`inline-flex h-4.5 w-4.5 md:h-5 md:w-5 items-center justify-center rounded-sm font-black text-[10px] md:text-xs shadow-2xs ${badgeBgColor}`}
          >
            {idx + 1}
          </span>
        </td>

        {/* TEAM NAME */}
        <td className="py-2 pl-1 pr-1 md:py-2.5 w-[49%]">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <img
              src={item.teamLogo || "/logo.webp"}
              alt=""
              className="h-4.5 w-4.5 md:h-5 md:w-5 shrink-0 object-contain"
            />
            <span className="truncate font-semibold text-xs md:text-sm text-foreground">
              {item.teamName}
            </span>
          </div>
        </td>

        {/* MATCH W-L */}
        <td className="py-2 px-0.5 md:py-2.5 text-center font-bold text-primary text-xs md:text-sm w-[13%]">
          {item.matchWins}-{item.matchLosses}
        </td>

        {/* PTS DIFF */}
        <td className="py-2 px-0.5 md:py-2.5 text-center font-bold text-xs md:text-sm w-[13%]">
          <span
            className={
              item.roundDifference > 0
                ? "text-emerald-700 dark:text-emerald-400 font-bold"
                : item.roundDifference < 0
                ? "text-rose-700 dark:text-rose-400 font-bold"
                : "text-muted-foreground"
            }
          >
            {item.roundDifference > 0 ? `+${item.roundDifference}` : item.roundDifference}
          </span>
        </td>

        {/* PTS SCORED */}
        <td className="py-2 pl-0.5 pr-2 md:py-2.5 text-center font-bold text-foreground text-xs md:text-sm w-[14%]">
          {item.setWins}
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4 md:p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* TAB SWITCHER & LINK */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5 md:pb-3">
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

          <Link
            href="/tournament?tab=standings"
            className="flex items-center gap-0.5 text-xs font-bold text-primary hover:underline"
          >
            Full Standings <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Link>
        </div>

        {/* ISI TABEL */}
        {loading ? (
          <div className="py-8 text-center text-xs md:text-sm text-muted-foreground animate-pulse font-semibold">
            Memuat klasemen...
          </div>
        ) : tab === "DIVISION" ? (
          <div className="space-y-3.5 md:space-y-4 pt-2.5">
            {/* GRUP A */}
            <div className="space-y-1.5">
              <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 px-1 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Divisi {DIVISION_MAP.GROUP_A}
              </span>
              <div className="overflow-hidden rounded-xl border border-sky-500/30 dark:border-sky-500/20">
                <table className="w-full text-left table-fixed">
                  <thead className="bg-sky-500/15 dark:bg-sky-500/10 border-b border-sky-500/30 dark:border-sky-500/20 text-[9px] md:text-[10px] font-black uppercase text-slate-700 dark:text-muted-foreground">
                    <tr>
                      <th className="py-1.5 px-1 text-center w-[11%]">RANK</th>
                      <th className="py-1.5 pl-1 pr-1 w-[49%]">TEAM</th>
                      <th className="py-1.5 px-0.5 text-center w-[13%] text-primary">MATCH W-L</th>
                      <th className="py-1.5 px-0.5 text-center w-[13%]">PTS DIFF</th>
                      <th className="py-1.5 pl-0.5 pr-2 text-center w-[14%]">PTS SCORED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-500/15 dark:divide-sky-500/10">
                    {renderTableRows(
                      topGroupA,
                      "bg-sky-500/5 hover:bg-sky-500/10",
                      "bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/40"
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GRUP B */}
            <div className="space-y-1.5">
              <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 px-1 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Divisi {DIVISION_MAP.GROUP_B}
              </span>
              <div className="overflow-hidden rounded-xl border border-amber-500/30 dark:border-amber-500/20">
                <table className="w-full text-left table-fixed">
                  <thead className="bg-amber-500/15 dark:bg-amber-500/10 border-b border-amber-500/30 dark:border-amber-500/20 text-[9px] md:text-[10px] font-black uppercase text-slate-700 dark:text-muted-foreground">
                    <tr>
                      <th className="py-1.5 px-1 text-center w-[11%]">RANK</th>
                      <th className="py-1.5 pl-1 pr-1 w-[49%]">TEAM</th>
                      <th className="py-1.5 px-0.5 text-center w-[13%] text-primary">MATCH W-L</th>
                      <th className="py-1.5 px-0.5 text-center w-[13%]">PTS DIFF</th>
                      <th className="py-1.5 pl-0.5 pr-2 text-center w-[14%]">PTS SCORED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/15 dark:divide-amber-500/10">
                    {renderTableRows(
                      topGroupB,
                      "bg-amber-500/5 hover:bg-amber-500/10",
                      "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40"
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* TAB: GLOBAL WILDCARD (TOP 8) */
          <div className="space-y-1.5 pt-2.5">
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 px-1 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Global Wildcard
            </span>
            <div className="overflow-hidden rounded-xl border border-emerald-500/30 dark:border-emerald-500/20">
              <table className="w-full text-left table-fixed">
                <thead className="bg-emerald-500/15 dark:bg-emerald-500/10 border-b border-emerald-500/30 dark:border-emerald-500/20 text-[9px] md:text-[10px] font-black uppercase text-slate-700 dark:text-muted-foreground">
                  <tr>
                    <th className="py-1.5 px-1 text-center w-[11%]">RANK</th>
                    <th className="py-1.5 pl-1 pr-1 w-[49%]">TEAM</th>
                    <th className="py-1.5 px-0.5 text-center w-[13%] text-primary">MATCH W-L</th>
                    <th className="py-1.5 px-0.5 text-center w-[13%]">PTS DIFF</th>
                    <th className="py-1.5 pl-0.5 pr-2 text-center w-[14%]">PTS SCORED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/15 dark:divide-emerald-500/10">
                  {renderTableRows(
                    topGlobal,
                    "bg-emerald-500/5 hover:bg-emerald-500/10",
                    "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40"
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}