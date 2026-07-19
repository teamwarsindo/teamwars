"use client"

import { cn } from "@/lib/utils"
import { TeamData } from "./types"

interface TeamsTableProps {
  teams: TeamData[]
  isLoading: boolean
  onSelectTeam: (team: TeamData) => void
}

export function TeamsTable({ teams, isLoading, onSelectTeam }: TeamsTableProps) {
  return (
    <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-primary/10 text-xs uppercase text-muted-foreground border-b border-primary/20">
            <tr>
              <th className="px-4 py-3">Nama Tim</th>
              <th className="px-4 py-3">Kapten (Discord)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-10 text-primary animate-pulse">Memuat data...</td></tr>
            ) : teams.length > 0 ? (
              teams.map((team) => (
                <tr key={team.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.warna }}></span>
                    {team.namaTim}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span>{team.kaptenIgn}</span>
                      <span className="text-[10px] text-muted-foreground">{team.kaptenDiscord}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded border", 
                      team.statusVerifikasi.toLowerCase().includes("verified") ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                    )}>
                      {team.statusVerifikasi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => onSelectTeam(team)}
                      className="text-xs bg-primary text-white font-semibold px-4 py-1.5 rounded hover:bg-primary/80 transition-colors shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)]"
                    >
                      Manage Tim
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">Tidak ada tim.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
