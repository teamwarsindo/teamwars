"use client";

import { useState } from "react";
import Link from "next/link";
import { DIVISION_MAP } from "@/lib/types/tournament";
import { ChevronRight } from "lucide-react";

interface StandingsSnapshotProps {
  loading: boolean;
  topGroupA: any[];
  topGroupB: any[];
  topGlobal: any[];
}

export function StandingsSnapshot({
  loading,
  topGroupA,
  topGroupB,
  topGlobal,
}: StandingsSnapshotProps) {
  const [tab, setTab] = useState<"GROUP" | "GLOBAL">("GROUP");

  const renderTable = (items: any[], isGroupA: boolean, isGlobal = false) => (
    <table className="w-full text-left text-[11px] table-fixed">
      <tbody className="space-y-1.5">
        {items.map((item, idx) => (
          <tr
            key={item.teamId || item.teamName || idx}
            className={`rounded-xl border transition flex items-center mb-1.5 px-2.5 py-1.5 ${
              isGlobal
                ? "bg-emerald-500/10 border-emerald-500/30 border-l-4 border-l-emerald-500"
                : isGroupA
                ? "bg-sky-500/10 border-sky-500/30 border-l-4 border-l-sky-500"
                : "bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500"
            }`}
          >
            <td className="w-[52%] flex items-center gap-2 min-w-0 pr-1">
              <span
                className={`font-black text-xs shrink-0 ${
                  isGlobal
                    ? "text-emerald-500"
                    : isGroupA
                    ? "text-sky-500"
                    : "text-amber-500"
                }`}
              >
                #{idx + 1}
              </span>
              <img
                src={item.teamLogo || "/logo.webp"}
                alt=""
                className="h-4 w-4 shrink-0 object-contain"
              />
              <span className="font-bold text-[11px] truncate text-foreground">
                {item.teamName}
              </span>
            </td>
            <td className="w-[16%] text-center font-bold text-muted-foreground text-[10.5px]">
              {item.matchWins}-{item.matchLosses}
            </td>
            <td className="w-[11%] text-center font-bold text-[10.5px]">
              <span
                className={
                  item.roundDifference > 0
                    ? "text-emerald-500"
                    : item.roundDifference < 0
                    ? "text-rose-500"
                    : "text-muted-foreground"
                }
              >
                {item.roundDifference > 0
                  ? `+${item.roundDifference}`
                  : item.roundDifference}
              </span>
            </td>
            <td className="w-[10%] text-center font-extrabold text-foreground text-[10.5px]">
              {item.setWins}
            </td>
            <td className="w-[11%] text-right font-black text-primary text-xs pr-1">
              {item.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("GROUP")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition ${
              tab === "GROUP"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Divisi
          </button>
          <button
            onClick={() => setTab("GLOBAL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition ${
              tab === "GLOBAL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top 8 Global
          </button>
        </div>

        <Link
          href="/tournament?tab=standing"
          className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
        >
          Full Standings <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
          Menghitung klasemen...
        </div>
      ) : tab === "GROUP" ? (
        <div className="space-y-4">
          {[
            {
              title: DIVISION_MAP.GROUP_A,
              data: topGroupA,
              isGroupA: true,
              color: "text-sky-500",
            },
            {
              title: DIVISION_MAP.GROUP_B,
              data: topGroupB,
              isGroupA: false,
              color: "text-amber-500",
            },
          ].map((grp) => (
            <div key={grp.title} className="space-y-1.5">
              <div className="flex items-center justify-between px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span className={`w-[52%] font-black text-[10px] ${grp.color}`}>
                  {grp.title}
                </span>
                <span className="w-[16%] text-center">W-L</span>
                <span className="w-[11%] text-center">RD</span>
                <span className="w-[10%] text-center">SET</span>
                <span className="w-[11%] text-right text-primary pr-1">PTS</span>
              </div>
              {renderTable(grp.data, grp.isGroupA)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
            <span className="w-[52%] font-black text-[10px] text-emerald-500">
              Klasemen Top 8 Playoff
            </span>
            <span className="w-[16%] text-center">W-L</span>
            <span className="w-[11%] text-center">RD</span>
            <span className="w-[10%] text-center">SET</span>
            <span className="w-[11%] text-right text-primary pr-1">PTS</span>
          </div>
          {topGlobal.length > 0 ? (
            renderTable(topGlobal, false, true)
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Belum ada data klasemen global.
            </p>
          )}
        </div>
      )}
    </div>
  );
                }
