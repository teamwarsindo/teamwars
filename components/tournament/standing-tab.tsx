"use client";

import { useState } from "react";
import { TeamStanding } from "@/lib/types/tournament";

export function StandingTab({ standings }: { standings: TeamStanding[] }) {
  const [activeSubTab, setActiveSubTab] = useState<"GROUP_A" | "GROUP_B" | "GLOBAL">("GROUP_A");

  const filteredStandings = standings.filter((s) => {
    if (activeSubTab === "GROUP_A") return s.groupName === "Group A";
    if (activeSubTab === "GROUP_B") return s.groupName === "Group B";
    return true;
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full items-center justify-center rounded-2xl border border-border bg-card/60 p-1.5 backdrop-blur-md max-w-md mx-auto">
        <button
          onClick={() => setActiveSubTab("GROUP_A")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase transition ${
            activeSubTab === "GROUP_A"
              ? "bg-sky-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Group A
        </button>
        <button
          onClick={() => setActiveSubTab("GROUP_B")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase transition ${
            activeSubTab === "GROUP_B"
              ? "bg-amber-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Group B
        </button>
        <button
          onClick={() => setActiveSubTab("GLOBAL")}
          className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase transition ${
            activeSubTab === "GLOBAL"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Global
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/80 shadow-xl">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-border/80 bg-muted/50 text-muted-foreground uppercase tracking-wider font-bold">
            <tr>
              <th className="px-4 py-3 text-center w-12">#</th>
              <th className="px-4 py-3 min-w-[200px]">Team</th>
              <th className="px-4 py-3 text-center">Group</th>
              <th className="px-4 py-3 text-center">Played</th>
              <th className="px-4 py-3 text-center text-emerald-500">Win</th>
              <th className="px-4 py-3 text-center text-rose-500">Lose</th>
              <th className="px-4 py-3 text-center font-extrabold text-primary">Points</th>
              <th className="px-4 py-3 text-center">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredStandings.map((row, idx) => (
              <tr key={row.teamId} className="hover:bg-muted/30 transition">
                <td className="px-4 py-3 text-center font-bold text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-3 font-extrabold text-foreground">
                  <div className="flex items-center gap-3">
                    <img
                      src={row.teamLogo}
                      alt={row.teamName}
                      className="h-8 w-8 rounded-lg object-cover border border-border"
                    />
                    <span>{row.teamName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                    {row.groupName}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{row.played}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-500">{row.win}</td>
                <td className="px-4 py-3 text-center font-bold text-rose-500">{row.lose}</td>
                <td className="px-4 py-3 text-center font-black text-sm text-primary">{row.points}</td>
                <td className="px-4 py-3 text-center font-mono font-bold text-muted-foreground">
                  {row.matchDiff > 0 ? `+${row.matchDiff}` : row.matchDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
