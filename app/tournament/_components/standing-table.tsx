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
}

function MatchFormGrid({ form = [] }: { form?: ("W" | "L")[] }) {
  const slots = Array.from({ length: 8 }, (_, i) => form[i] || null);
  return (
    <div className="grid grid-cols-4 gap-1 w-fit mx-auto justify-items-center">
      {slots.map((res, idx) => (
        <span
          key={idx}
          className={`flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded text-[7.5px] sm:text-[8px] font-black ${
            !res
              ? "bg-muted/30 text-muted-foreground/30 border border-dashed border-border/40"
              : res === "W"
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
          }`}
        >
          {res || "-"}
        </span>
      ))}
    </div>
  );
}

export function StandingTableRow({ item, activeView }: StandingTableRowProps) {
  const isGroupA = item.groupName === DIVISION_MAP.GROUP_A;

  const rowBorder =
    activeView === "ALL_GLOBAL"
      ? ""
      : activeView === "WILDCARD"
      ? item.computedRank <= TOURNAMENT_RULES.GLOBAL_PLAYOFF_QUOTA
        ? "bg-emerald-500/10 border-l-4 border-l-emerald-500"
        : "bg-rose-500/5 border-l-4 border-l-rose-500/60"
      : item.computedRank <= TOURNAMENT_RULES.TOP_DIV_QUOTA_PER_GROUP
      ? isGroupA
        ? "bg-sky-500/10 border-l-4 border-l-sky-500"
        : "bg-amber-500/10 border-l-4 border-l-amber-500"
      : "";

  return (
    <tr className={`hover:bg-muted/20 transition ${rowBorder}`}>
      {/* RANK (11%) */}
      <td className="py-2.5 px-1 text-center">
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
      <td className="py-2.5 pl-1.5 pr-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={item.teamLogo || "/logo.webp"}
            alt=""
            className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 object-contain"
          />
          <span className="font-semibold text-[10.5px] sm:text-xs md:text-sm truncate text-foreground">
            {item.teamName}
          </span>
        </div>
      </td>

      {/* MATCH W-L (11%) */}
      <td className="py-2.5 px-0.5 text-center font-bold text-primary text-[10px] sm:text-xs md:text-sm">
        {item.matchWins}-{item.matchLosses}
      </td>

      {/* PTS DIFF (11%) */}
      <td className="py-2.5 px-0.5 text-center font-bold text-[10px] sm:text-xs md:text-sm">
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
      <td className="py-2.5 px-0.5 text-center font-bold text-foreground text-[10px] sm:text-xs md:text-sm">
        {item.setWins}
      </td>

      {/* MATCH FORM (17%) */}
      <td className="py-2 pl-0.5 pr-1 text-center">
        <MatchFormGrid form={item.form} />
      </td>
    </tr>
  );
}
