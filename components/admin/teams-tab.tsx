"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { getTeamsData } from "@/app/admin/data-action"

type Player = {
  ign: string
  discord: string
  discordId?: string
}

type TeamData = {
  id: string
  namaTim: string
  email: string
  kaptenDiscord: string
  kaptenIgn: string
  statusVerifikasi: string
  createdAt: string | number
  warna: string
  logoTim: string | null
  buktiTransfer: string | null
  playersCount: number
  players: Player[]
}

export function TeamsTab() {
  const [search, setSearch] = useState("")
  const [teams, setTeams] = useState<TeamData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // State untuk Pop-up Modal
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true)
      const data = await getTeamsData()
      setTeams(data)
      setIsLoading(false)
    }
    fetchTeams()
  }, [])

  const filteredTeams = teams.filter((t) => 
    t.namaTim.toLowerCase().includes(search.toLowerCase()) || 
    t.kaptenDiscord.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateValue: string | number) => {
    if (!dateValue) return "-"
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateValue))
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes("verified") || s.includes("sukses")) return "bg-green-500/20 text-green-500 border-green-500/30"
    if (s.includes("tolak") || s.includes("reject")) return "bg-red-500/20 text-red-500 border-red-500/30"
    return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
  }

  return (
    <>
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <input
            type="text"
            placeholder="Cari nama tim atau discord..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full sm:max-w-xs rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-primary"
          />
          <button 
            disabled={isLoading || teams.length === 0}
            className={cn(buttonVariants({ variant: "outline" }), "border-primary/50 text-primary hover:bg-primary/10")}
          >
            📥 Export CSV
          </button>
        </div>

        <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-primary/10 text-[10px] sm:text-xs uppercase text-muted-foreground border-b border-primary/20">
                <tr>
                  <th className="px-4 py-3">Nama Tim</th>
                  <th className="px-4 py-3">Kapten (Discord)</th>
                  <th className="px-4 py-3">Waktu Daftar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-primary animate-pulse">Memuat data...</td></tr>
                ) : filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
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
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(team.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded border", getStatusBadge(team.statusVerifikasi))}>
                          {team.statusVerifikasi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setSelectedTeam(team)}
                          className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded hover:bg-primary/30 transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada tim.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL POP-UP DETAIL TIM */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-primary/30 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_-10px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: selectedTeam.warna }}></span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">{selectedTeam.namaTim}</h2>
                  <p className="text-xs text-muted-foreground">{selectedTeam.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeam(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-red-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* Info Dokumen */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Logo Tim</span>
                  {selectedTeam.logoTim ? (
                    <a href={selectedTeam.logoTim} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      📄 Lihat Lampiran Logo
                    </a>
                  ) : <span className="text-xs text-muted-foreground">Tidak ada dokumen</span>}
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-background/50">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Bukti Transfer</span>
                  {selectedTeam.buktiTransfer ? (
                    <a href={selectedTeam.buktiTransfer} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      💵 Lihat Bukti Transfer
                    </a>
                  ) : <span className="text-xs text-muted-foreground">Tidak ada dokumen</span>}
                </div>
              </div>

              {/* Roster Pemain */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Roster Pemain ({selectedTeam.playersCount})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTeam.players.map((player, idx) => (
                    <div key={idx} className="flex flex-col p-3 rounded-lg border border-border/50 bg-background/30 relative overflow-hidden">
                      {/* Indikator Kapten */}
                      {idx === 0 && <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">CAPTAIN</div>}
                      <span className="font-semibold text-sm">{player.ign}</span>
                      <span className="text-xs text-muted-foreground">Discord: {player.discord || player.discordId}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
    }
                    
