"use client";

import { useState, Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { TournamentView } from "@/components/tournament/tournament-view";

function TournamentContent() {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 1. TOP BAR WITH CUSTOM TITLE */}
      <TopBar title="Official Schedule" />

      {/* 2. HERO HEADER (Didesain Tanpa Detail / Deskripsi) */}
      <div className="px-4">
        <HeroHeader showDetails={false} />
      </div>

      {/* 3. MAIN CONTENT (Read-Only Viewer Tanpa Edit Admin URL) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <TournamentView
          isAdmin={false}
          selectedGroupFilter={selectedGroupFilter}
          setSelectedGroupFilter={setSelectedGroupFilter}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function TournamentLandingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Jadwal & Klasemen TWI...</div>}>
      <TournamentContent />
    </Suspense>
  );
}