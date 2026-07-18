"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export function TeamsTab() {
  const [search, setSearch] = useState("")

  // Dummy data
  const teams = [
    { id: 1, name: "Blue-Eyes White", captain: "Seto Kaiba", discord: "kaiba#0001", date: "10 Ags, 14:00", status: "Verified" },
    { id: 2, name: "Dark Magicians", captain: "Yugi Muto", discord: "yugi#1234", date: "10 Ags, 15:30", status: "Pending" },
    { id: 3, name: "Red-Eyes Black", captain: "Joey Wheeler", discord: "joey#7777", date: "11 Ags, 09:15", status: "Verified" },
  ]

  // Fitur filter sederhana
  const filteredTeams = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Table (Search & Export) */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="text"
          placeholder="Cari nama tim..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full sm:max-w-xs rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button className={cn(buttonVariants({ variant: "outline" }), "border-primary/50 text-primary hover:bg-primary/10")}>
          📥 Export CSV
        </button>
      </div>

      {/* Table Area */}
      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/10 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Tim</th>
                <th className="px-4 py-3 font-semibold">Kapten</th>
                <th className="px-4 py-3 font-semibold">Discord ID</th>
                <th className="px-4 py-3 font-semibold">Waktu Daftar</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 font-medium">{team.name}</td>
                  <td className="px-4 py-3">{team.captain}</td>
                  <td className="px-4 py-3 text-muted-foreground">{team.discord}</td>
                  <td className="px-4 py-3 text-muted-foreground">{team.date}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded hover:bg-primary/30 transition-colors">
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">Tidak ada tim yang ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
                  }
