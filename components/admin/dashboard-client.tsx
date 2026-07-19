"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamsTable } from "./teams-table"
import { TeamEditorModal } from "./team-editor-modal"

export function DashboardClient({ initialTeams }: { initialTeams: TeamData[] }) {
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null)
  const [search, setSearch] = useState("")

  const filteredTeams = initialTeams.filter(t => t.namaTim.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-6 lg:mt-8">
      <input
        type="text"
        placeholder="Cari tim..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-xs mb-4 bg-background/50 border border-input rounded-md px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary outline-none"
      />

      <TeamsTable teams={filteredTeams} onSelect={setSelectedTeam} />

      {selectedTeam && (
        <TeamEditorModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </div>
  )
}
