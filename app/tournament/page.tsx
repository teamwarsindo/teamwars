"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TournamentView } from "@/components/tournament/tournament-view";
import { AnalystCenter } from "@/components/analyst/analyst-center";

function TournamentContent() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [activeMainTab, setActiveMainTab] = useState<"TOURNAMENT" | "ANALYST">("TOURNAMENT");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 flex flex-col gap-6">
      
      {/* 🔲 MAIN SWITCHER KOTAK BERSIH */}
      <div className="grid grid-cols-2 gap-3 w-full">
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

      {/* VIEW UTAMA */}
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

    </div>
  );
}

export default function TournamentLandingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-primary">⏳ Loading...</div>}>
      <TournamentContent />
    </Suspense>
  );
}
