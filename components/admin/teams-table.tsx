"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamRow } from "./team-row"

export function TeamsTab({ teams }: { teams: TeamData[] }) {
  const [search, setSearch] = useState("")
  const filteredTeams = teams.filter(t => t.namaTim.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 mt-6">
      <input
        type="text"
        placeholder="Cari tim..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-xs bg-background/50 border border-input rounded-md px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none"
      />

      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-primary/10 text-xs uppercase text-muted-foreground border-b border-primary/20">
              <tr>
                <th className="px-4 py-3">Nama Tim</th>
                <th className="px-4 py-3">P1 (Kapten)</th>
                <th className="px-4 py-3">P2 (Wakil)</th>
                <th className="px-4 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTeams.map((team) => (
                <TeamRow key={team.id} team={team} />
              ))}
              {filteredTeams.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Tim tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
