"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamRowGrid } from "./team-row-grid"

export function TeamsTableGrid({ initialTeams }: { initialTeams: TeamData[] }) {
  const [search, setSearch] = useState("")
  const filtered = initialTeams.filter(t => t.namaTim.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-4 animate-in fade-in mt-6 max-w-full">
      <input type="text" placeholder="Cari Tim..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs bg-background/50 border border-input rounded-md px-3 py-2 text-sm outline-none" />

      {/* HORIZONTAL SCROLL CONTAINER */}
      <div className="rounded-xl border border-primary/30 bg-black/60 shadow-[0_0_50px_-10px_rgba(220,38,38,0.15)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-primary/20 text-[10px] uppercase tracking-widest text-primary border-b border-primary/30">
              <tr>
                <th className="px-4 py-4 border-r border-primary/20">Warna & Nama Tim</th>
                <th className="px-4 py-4 border-r border-primary/20">Email Form</th>
                <th className="px-4 py-4 border-r border-primary/20">Logo & Bukti TF</th>
                <th className="px-4 py-4 border-r border-primary/20">Status Approval</th>
                <th className="px-4 py-4 border-r border-primary/20 text-center">Data Roster</th>
                <th className="px-4 py-4 text-center">Bypass URL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((team) => <TeamRowGrid key={team.id} initialTeam={team} />)}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada data tim.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
