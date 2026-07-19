"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamsTab } from "./teams-tab"
import { ApiTab } from "./api-tab"
import { logoutAdmin } from "@/app/admin/action"

export function DashboardLayout({ teams }: { teams: TeamData[] }) {
  const [activeTab, setActiveTab] = useState<"TEAMS" | "API">("TEAMS")

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-6 lg:mt-8">
      
      {/* Kotak Navigasi Tab & Logout */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-background/50 p-2 backdrop-blur-md">
        <div className="flex space-x-1">
          <button 
            onClick={() => setActiveTab("TEAMS")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "TEAMS" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            👥 Teams
          </button>
          <button 
            onClick={() => setActiveTab("API")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "API" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            📡 API Scanner
          </button>
        </div>

        <button 
          onClick={() => logoutAdmin()} 
          className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
        >
          Logout 🚪
        </button>
      </div>

      {/* Render Area Sesuai Tab Aktif */}
      <div className="min-h-[50vh]">
        {activeTab === "TEAMS" && <TeamsTab teams={teams} />}
        {activeTab === "API" && <ApiTab />}
      </div>

    </div>
  )
}
