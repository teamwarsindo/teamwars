"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { getTeamsData } from "@/app/admin/data-action"

// Tipe data untuk TypeScript
type TeamData = {
  id: string
  namaTim: string
  email: string
  kaptenDiscord: string
  kaptenIgn: string
  statusVerifikasi: string
  createdAt: string | number
  warna: string
  playersCount: number
}

export function TeamsTab() {
  const [search, setSearch] = useState("")
  const [teams, setTeams] = useState<TeamData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Ambil data dari KV saat komponen pertama kali dirender
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true)
      const data = await getTeamsData()
      setTeams(data)
      setIsLoading(false)
    }
    fetchTeams()
  }, [])

  // Fitur filter pencarian
  const filteredTeams = teams.filter((t) => 
    t.namaTim.toLowerCase().includes(search.toLowerCase()) || 
    t.kaptenDiscord.toLowerCase().includes(search.toLowerCase())
  )

  // Helper untuk format tanggal
  const formatDate = (dateValue: string | number) => {
    if (!dateValue) return "-"
    const date = new Date(dateValue)
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  // Helper warna badge status
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes("verified") || s.includes("sukses") || s.includes("aktif")) {
      return "bg-green-500/20 text-green-500 border-green-500/30"
    }
    if (s.includes("tolak") || s.includes("reject")) {
      return "bg-red-500/20 text-red-500 border-red-500/30"
    }
    return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Table (Search & Export) */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="text"
          placeholder="Cari nama tim atau discord..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full sm:max-w-xs rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button 
          disabled={isLoading || teams.length === 0}
          className={cn(
            buttonVariants({ variant: "outline" }), 
            "border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50"
          )}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Table Area */}
      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-primary/10 text-[10px] sm:text-xs uppercase text-muted-foreground border-b border-primary/20">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Tim</th>
                <th className="px-4 py-3 font-semibold">Kapten (Discord)</th>
                <th className="px-4 py-3 font-semibold">Waktu Daftar</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-primary animate-pulse">
                    Memuat data tim dari database...
                  </td>
                </tr>
              ) : filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-primary/5 transition-colors">
                    
                    {/* Kolom Nama Tim (dengan aksen warna tim) */}
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
                    
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(team.createdAt)}
                    </td>
                    
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-1 text-[10px] font-bold uppercase rounded border", getStatusBadge(team.statusVerifikasi))}>
                        {team.statusVerifikasi}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      <button className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded hover:bg-primary/30 transition-colors">
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    Tidak ada tim yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
