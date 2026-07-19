"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamEditorModal } from "./team-editor-modal"

export function DashboardClient({ initialTeams }: { initialTeams: TeamData[] }) {
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-8">
      
      {/* Tabel Sederhana */}
      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-primary/10 text-xs uppercase text-muted-foreground border-b border-primary/20">
            <tr>
              <th className="px-4 py-3">Nama Tim</th>
              <th className="px-4 py-3">Kapten</th>
              <th className="px-4 py-3">Wakil</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {initialTeams.map((team) => (
              <tr key={team.id} className="hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.warna }}></span>
                  {team.namaTim}
                </td>
                <td className="px-4 py-3">{team.players[0]?.ign || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{team.players[1]?.ign || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => setSelectedTeam(team)}
                    className="text-xs bg-primary text-white px-4 py-1.5 rounded shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)]"
                  >
                    Edit / Issue 1
                  </button>
                </td>
              </tr>
            ))}
            {initialTeams.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada tim terdaftar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panggil Modal jika ada tim yang dipilih */}
      {selectedTeam && (
        <TeamEditorModal 
          team={selectedTeam} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}
    </div>
  )
                }
