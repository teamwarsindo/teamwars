"use client";

import { useState } from "react";
import { TeamStandingItem } from "@/lib/types/tournament";

export function StandingTab({ standings }: { standings: TeamStandingItem[] }) {
  const [activeSubTab, setActiveSubTab] = useState<"GROUP_A" | "GROUP_B" | "ALL_GROUP">("GROUP_A");

  const groupAData = standings.filter((s) => s.groupName === "Group A");
  const groupBData = standings.filter((s) => s.groupName === "Group B");

  return (
    <div className="flex flex-col gap-4">
      {/* Sub Tab Buttons: Group A, Group B, All Group */}
      <div className="grid grid-cols-3 gap-2 w-full rounded-2xl border border-border bg-card p-1.5">
        <button
          onClick={() => setActiveSubTab("GROUP_A")}
          className={`rounded-xl py-2 text-xs font-bold uppercase transition cursor-pointer ${
            activeSubTab === "GROUP_A" ? "bg-sky-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Group A
        </button>
        <button
          onClick={() => setActiveSubTab("GROUP_B")}
          className={`rounded-xl py-2 text-xs font-bold uppercase transition cursor-pointer ${
            activeSubTab === "GROUP_B" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Group B
        </button>
        <button
          onClick={() => setActiveSubTab("ALL_GROUP")}
          className={`rounded-xl py-2 text-xs font-bold uppercase transition cursor-pointer ${
            activeSubTab === "ALL_GROUP" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Group
        </button>
      </div>

      {/* Tabel Sub Tab (Rata Tengah) */}
      {activeSubTab === "GROUP_A" && <StandingTable title="Standing Group A" data={groupAData} />}
      {activeSubTab === "GROUP_B" && <StandingTable title="Standing Group B" data={groupBData} />}
      {activeSubTab === "ALL_GROUP" && <StandingTable title="Standing Global" data={standings} />}
    </div>
  );
}

// Tabel Standings Rata Tengah Tanpa Pemisah Garis
function StandingTable({ title, data }: { title: string; data: TeamStandingItem[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2 text-center">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs min-w-[450px]">
          <thead>
            <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
              <th className="py-2 px-1 text-center">Rank</th>
              <th className="py-2 px-2 text-center">Teams</th>
              <th className="py-2 px-1 text-center">Match W-L</th>
              <th className="py-2 px-1 text-center">RD</th>
              <th className="py-2 px-1 text-center">Set Wins</th>
              <th className="py-2 px-1 text-center font-bold text-sky-400">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((team, idx) => (
              <tr key={team.teamId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="py-2.5 px-1 font-extrabold text-center">{idx + 1}</td>
                <td className="py-2.5 px-2 flex items-center justify-center gap-2">
                  <img src={team.teamLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
                  <span className="font-bold truncate">{team.teamName}</span>
                </td>
                <td className="py-2.5 px-1 text-center font-semibold">{team.matchWins}-{team.matchLosses}</td>
                <td className="py-2.5 px-1 text-center text-muted-foreground">{team.roundDifference}</td>
                <td className="py-2.5 px-1 text-center font-semibold">{team.setWins}</td>
                <td className="py-2.5 px-1 text-center font-black text-sky-400">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
                  }
