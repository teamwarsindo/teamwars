"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { TournamentView } from "@/components/tournament/tournament-view";
import { AnalystCenter } from "@/components/analyst/analyst-center";

function TournamentContent() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [activeMainTab, setActiveMainTab] = useState<"TOURNAMENT" | "ANALYST">("TOURNAMENT");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      
      {/* 1. TOP BAR SHARED */}
      <TopBar title="Season 7 — Official Stage" />

      {/* 2. HERO HEADER SHARED */}
      <div className="px-4">
        <HeroHeader showDetails={true} />
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        
        {/* TAB SWITCHER KOTAK BERSIH */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <button
            onClick={() => setActiveMainTab("TOURNAMENT")}
            className={`rounded-2xl py-3.5 px-4 text-center text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              activeMainTab === "TOURNAMENT"
                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            🏆 Tournament Center
          </button>

          <button
            onClick={() => setActiveMainTab("ANALYST")}
            className={`rounded-2xl py-3.5 px-4 text-center text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              activeMainTab === "ANALYST"
                ? "bg-sky-600 text-white border-sky-600 shadow-lg"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            📊 Analyst Center
          </button>
        </div>

        {/* COMPONENT VIEW */}
        {activeMainTab === "TOURNAMENT" ? (
          <TournamentView
            isAdmin={isAdmin}
            selectedGroupFilter={selectedGroupFilter}
            setSelectedGroupFilter={setSelectedGroupFilter}
            selectedDateFilter={selectedDateFilter}
            setSelectedDateFilter={setSelectedDateFilter}
          />
        ) : (
          <AnalystCenter
            isAdmin={isAdmin}
            selectedGroupFilter={selectedGroupFilter}
            selectedDateFilter={selectedDateFilter}
          />
        )}
      </main>

      {/* 4. FOOTER SHARED */}
      <Footer />
    </div>
  );
}

export default function TournamentLandingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-primary">⏳ Loading Turnamen TWI...</div>}>
      <TournamentContent />
    </Suspense>
  );
}
