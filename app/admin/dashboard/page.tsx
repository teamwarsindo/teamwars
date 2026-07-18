"use client"

import { useState } from "react"
import { OverviewTab } from "@/components/admin/overview-tab"
import { TeamsTab } from "@/components/admin/teams-tab"
import { SettingsTab } from "@/components/admin/settings-tab"
import { logoutAdmin } from "../action"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

type TabType = "OVERVIEW" | "TEAMS" | "SETTINGS"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW")

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      {/* Background Ambient */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[300px]" aria-hidden="true" />

      {/* TOP BAR ADMIN KHUSUS */}
      <header className="relative z-10 flex w-full items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
          TWI ADMIN
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={() => logoutAdmin()} 
            className="text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <div className="relative z-10 flex flex-1 flex-col mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        
        {/* Navigasi Tab */}
        <div className="mb-8 flex space-x-1 rounded-lg bg-background/50 p-1 backdrop-blur-md border border-primary/10 max-w-fit">
          <TabButton name="Overview" isActive={activeTab === "OVERVIEW"} onClick={() => setActiveTab("OVERVIEW")} />
          <TabButton name="Teams" isActive={activeTab === "TEAMS"} onClick={() => setActiveTab("TEAMS")} />
          <TabButton name="Settings" isActive={activeTab === "SETTINGS"} onClick={() => setActiveTab("SETTINGS")} />
        </div>

        {/* Render Komponen Berdasarkan Tab yang Aktif */}
        <div className="min-h-[50vh]">
          {activeTab === "OVERVIEW" && <OverviewTab />}
          {activeTab === "TEAMS" && <TeamsTab />}
          {activeTab === "SETTINGS" && <SettingsTab />}
        </div>

      </div>
    </main>
  )
}

// Komponen Pembantu untuk Tombol Tab
function TabButton({ name, isActive, onClick }: { name: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
        isActive 
          ? "bg-primary/20 text-primary shadow-sm" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {name}
    </button>
  )
      }
                    
