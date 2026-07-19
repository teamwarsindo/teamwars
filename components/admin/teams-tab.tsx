"use client"

import { useState, useEffect } from "react"
import { getTeamsData } from "@/app/admin/data-action"
import { TeamData } from "./types"
import { TeamsTable } from "./teams-table"
import { TeamModal } from "./team-modal"

export function TeamsTab() {
  const [search, setSearch] = useState("")
  const [teams, setTeams] = useState<TeamData[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  return (
    <>
      <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Filter & Export */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <input
            type="text"
            placeholder="Cari nama tim atau discord kapten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full sm:max-w-xs rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:ring-primary"
          />
        </div>

        {/* Tabel Data (Sub-Component) */}
        <TeamsTable 
          teams={filteredTeams} 
          isLoading={isLoading} 
          onSelectTeam={(team) => setSelectedTeam(team)} 
        />

      </div>

      {/* Modal Manajemen Tim (Sub-Component) */}
      {selectedTeam && (
        <TeamModal 
          team={selectedTeam} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}
    </>
  )
}
