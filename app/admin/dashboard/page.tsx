"use client"

import { useState } from "react"
import { TopBar, Footer } from "@/components/layout-shared"
import { OverviewTab } from "@/components/admin/overview-tab"
import { TeamsTab } from "@/components/admin/teams-tab"
import { SettingsTab } from "@/components/admin/settings-tab"
import { logoutAdmin } from "../action"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type TabType = "OVERVIEW" | "TEAMS" | "SETTINGS"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("OVERVIEW")

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      {/* Ambient esports glow agar senada dengan halaman utama */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* Memanggil TopBar dari layout-shared */}
      <TopBar title="Admin Dashboard" />

      {/* KONTEN UTAMA */}
      <div className="relative z-10 flex flex-1 flex-col w-full px-4 pb-4 sm:px-6 mx-auto max-w-5xl mt-6 lg:mt-10">
        
        {/* Kontrol Navigasi & Logout */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-background/50 p-2 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex space-x-1">
            <TabButton name="Overview" isActive={activeTab === "OVERVIEW"} onClick={() => setActiveTab("OVERVIEW")} />
            <TabButton name="Teams" isActive={activeTab === "TEAMS"} onClick={() => setActiveTab("TEAMS")} />
            <TabButton name="Settings" isActive={activeTab === "SETTINGS"} onClick={() => setActiveTab("SETTINGS")} />
          </div>

          {/* Tombol Logout */}
          <button 
            onClick={() => logoutAdmin()} 
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
            )}
          >
            Logout
          </button>
        </div>

        {/* Render Area berdasarkan Tab */}
        <div className="min-h-[50vh]">
          {activeTab === "OVERVIEW" && <OverviewTab />}
          {activeTab === "TEAMS" && <TeamsTab />}
          {activeTab === "SETTINGS" && <SettingsTab />}
        </div>

        {/* Memanggil Footer dari layout-shared */}
        <Footer />
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
        "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        isActive 
          ? "bg-primary/20 text-primary shadow-sm" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {name}
    </button>
  )
          }
