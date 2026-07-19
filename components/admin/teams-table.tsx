"use client"

import { TeamData } from "@/types/admin"

export function TeamsTable({ teams, onSelect }: { teams: TeamData[], onSelect: (t: TeamData) => void }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-primary/10 text-xs uppercase text-muted-foreground border-b border-primary/20">
            <tr>
              <th className="px-4 py-3">Nama Tim</th>
              <th className="px-4 py-3">P1 (Kapten)</th>
              <th className="px-4 py-3">P2 (Wakil)</th>
              <th className="px-4 py-3 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.hex }}></span>
                  {team.namaTim}
                </td>
                <td className="px-4 py-3 font-semibold text-primary">{team.players[0]?.ign || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{team.players[1]?.ign || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onSelect(team)} className="text-xs bg-primary/20 text-primary hover:bg-primary hover:text-white font-bold px-4 py-1.5 rounded transition-all">
                    Kelola
                  </button>
                </td>
              </tr>
            ))}
            {teams.length === 0 && <tr><td colSpan={4} className="text-center py-8">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
                    }
