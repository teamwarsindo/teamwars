"use client";

import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";
import { DIVISION_MAP, TOURNAMENT_RULES } from "@/app/tournament/_library";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { DivisionFilterType } from "./tournament-filter";

export interface StandingRowItem extends ExtendedStandingItem {
  computedRank: number;
  rankLabel: string;
  trend: "up" | "down" | "stay";
}

interface StandingTableRowProps {
  item: StandingRowItem;
  activeView: "ALL_GLOBAL" | DivisionFilterType | "WILDCARD";
  selectedWeek?: number;
}

function MatchFormGrid({ form = [] }: { form?: ("W" | "L")[] }) {
  if (!form || form.length === 0) {
    return <span className="text-[10px] text-muted-foreground/50 font-bold">-</span>;
  }

  const rows: ("W" | "L")[][] = [];
  for (let i = 0; i < form.length; i += 4) {
    rows.push(form.slice(i, i + 4));
  }

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 w-fit mx-auto">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex items-center justify-center gap-0.5">
          {row.map((res, colIdx) => (
            <span
              key={colIdx}
              className={`flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-[2px] text-[7px] sm:text-[7.5px] font-black leading-none shrink-0 ${
                res === "W"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
              }`}
            >
              {res}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function StandingTableRow({ item, activeView, selectedWeek }: StandingTableRowProps) {
  const isGroupA = item.groupName === DIVISION_MAP.GROUP_A;

  // Batas akhir fase grup (misal: Playoff Week 8, maka akhir fase grup = Week 7)
  const isFinalGroupStageWeek =
    Number(selectedWeek) >= TOURNAMENT_RULES.PLAYOFF_START_WEEK - 1;

  // Kuota total tim lolos Playoff di Standing Global (Top Grup A/B + Play-Ins)
  const totalPlayoffCutoff =
    TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP * TOURNAMENT_RULES.TOTAL_GROUP +
    TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA;

  const getRowHighlight = () => {
    // 1. Tab Divisi Grup A / Grup B (Selalu ada highlight Top 2 per grup)
    if (activeView === DIVISION_MAP.GROUP_A || activeView === DIVISION_MAP.GROUP_B) {
      if (item.computedRank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP) {
        return isGroupA
          ? "bg-sky-500/10 border-l-4 border-l-sky-500"
          : "bg-amber-500/10 border-l-4 border-l-amber-500";
      }
      return "";
    }

    // 2. Tab Global Wildcard (Selalu ada highlight Play-Ins & Eliminasi)
    if (activeView === "WILDCARD") {
      return item.computedRank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
        ? "bg-emerald-500/10 border-l-4 border-l-emerald-500"
        : "bg-rose-500/5 border-l-4 border-l-rose-500/60";
    }

    // 3. Tab Standing Global: Warna HANYA aktif jika sudah di pekan terakhir fase grup
    if (isFinalGroupStageWeek) {
      if (item.isTopGroup) {
        return isGroupA
          ? "bg-sky-500/10 border-l-4 border-l-sky-500"
          : "bg-amber-500/10 border-l-4 border-l-amber-500";
      }

      if (item.computedRank <= totalPlayoffCutoff) {
        return "bg-emerald-500/10 border-l-4 border-l-emerald-500";
      }

      return "bg-rose-500/5 border-l-4 border-l-rose-500/60";
    }

    return "";
  };

  const rowBorder = getRowHighlight();

  return (
    <tr className={`hover:bg-muted/20 transition ${rowBorder}`}>
      {/* RANK (11%) */}
      <td className="py-1.5 px-1 text-center align-middle">
        <div className="flex items-center justify-center gap-0.5">
          {item.trend === "up" ? (
            <ChevronUp className="h-3.5 w-3.5 text-emerald-500 stroke-[3] shrink-0" />
          ) : item.trend === "down" ? (
            <ChevronDown className="h-3.5 w-3.5 text-rose-500 stroke-[3] shrink-0" />
          ) : (
            <Minus className="h-2.5 w-2.5 text-muted-foreground/40 stroke-[3] shrink-0" />
          )}
          <span className="text-[10.5px] sm:text-xs font-bold">{item.rankLabel}</span>
        </div>
      </td>

      {/* TEAM (36%) */}
      <td className="py-1.5 pl-1.5 pr-1 align-middle">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted/20">
            <img
              src={item.teamLogo || "/logo.webp"}
              alt=""
              className="h-full w-full object-cover rounded-full"
            />
          </div>
          <span className="font-semibold text-[10.5px] sm:text-xs md:text-sm truncate text-foreground">
            {item.teamName}
          </span>
        </div>
      </td>

      {/* MATCH W-L (11%) */}
      <td className="py-1.5 px-0.5 text-center font-bold text-primary text-[10px] sm:text-xs md:text-sm align-middle">
        {item.matchWins}-{item.matchLosses}
      </td>

      {/* PTS DIFF (11%) */}
      <td className="py-1.5 px-0.5 text-center font-bold text-[10px] sm:text-xs md:text-sm align-middle">
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

      {/* PTS SCORED (14%) */}
      <td className="py-1.5 px-0.5 text-center font-bold text-foreground text-[10px] sm:text-xs md:text-sm align-middle">
        {item.setWins}
      </td>

      {/* MATCH FORM (17%) */}
      <td className="py-1 px-0.5 text-center align-middle">
        <MatchFormGrid form={item.form} />
      </td>
    </tr>
  );
          }
