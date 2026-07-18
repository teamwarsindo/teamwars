"use client"

import { useState, useEffect } from "react"
import { getTeamsData } from "@/app/admin/data-action"

export function OverviewTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getTeamsData()
      setTeams(data)
      setIsLoading(false)
    }
    fetchStats()
  }, [])

  // Kalkulasi Statistik
  const totalTeams = teams.length
  const verifiedTeams = teams.filter(t => t.statusVerifikasi.toLowerCase().includes("verified") || t.statusVerifikasi.toLowerCase().includes("sukses")).length
  const pendingTeams = totalTeams - verifiedTeams
  
  // Membuat data grafik (Grup berdasarkan tanggal)
  const chartData = teams.reduce((acc, team) => {
    const date = new Date(team.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})
  
  // Ambil maksimal pendaftar dalam 1 hari untuk tinggi grafik (Max Height)
  const maxPerDay = Math.max(...Object.values(chartData as Record<string, number>), 1)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 3 Kotak Statistik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md shadow-[0_0_15px_-3px_rgba(220,38,38,0.1)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pendaftar</h3>
          <p className="mt-2 text-4xl font-bold">{isLoading ? "-" : totalTeams}</p>
        </div>

        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500">Tim Terverifikasi</h3>
          <p className="mt-2 text-4xl font-bold text-green-500">{isLoading ? "-" : verifiedTeams}</p>
        </div>

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-yellow-500">Menunggu Review</h3>
          <p className="mt-2 text-4xl font-bold text-yellow-500">{isLoading ? "-" : pendingTeams}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Pendaftaran */}
        <div className="lg:col-span-2 rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-primary">Grafik Pendaftaran Harian</h3>
          
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-primary animate-pulse text-sm">Menyiapkan grafik...</div>
          ) : Object.keys(chartData).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Belum ada data pendaftar.</div>
          ) : (
            <div className="h-48 flex items-end gap-2 sm:gap-4 overflow-x-auto custom-scrollbar pb-2 pt-6">
              {Object.entries(chartData).map(([date, count]: any, idx) => {
                const heightPercentage = (count / maxPerDay) * 100
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px] group cursor-pointer">
                    {/* Tooltip Angka yang muncul saat di-hover */}
                    <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      {count}
                    </span>
                    {/* Bar Grafik */}
                    <div 
                      className="w-full bg-primary/40 group-hover:bg-primary rounded-t-sm transition-all duration-300 relative"
                      style={{ height: `${heightPercentage}%`, minHeight: '10%' }}
                    ></div>
                    {/* Label Tanggal */}
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-2 whitespace-nowrap">{date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Log Aktivitas Terbaru */}
        <div className="lg:col-span-1 rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Pendaftar Terbaru</h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
            {isLoading ? (
              <div className="text-xs text-muted-foreground animate-pulse">Memuat log...</div>
            ) : teams.slice(0, 5).map((team) => (
              <div key={team.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.warna }}></span>
                  <div>
                    <p className="font-semibold text-xs truncate max-w-[120px]">{team.namaTim}</p>
                    <p className="text-[10px] text-muted-foreground">{team.kaptenIgn}</p>
                  </div>
                </div>
                <span className={
                  team.statusVerifikasi.toLowerCase().includes("verified") 
                  ? "text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500" 
                  : "text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500"
                }>
                  {team.statusVerifikasi}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
                                                                                                                  }
