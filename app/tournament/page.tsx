"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { TournamentView } from "@/components/tournament/tournament-view";

function TournamentContent() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Season 7 — Official Stage" />

      <div className="px-4">
        <HeroHeader showDetails={true} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <TournamentView
          isAdmin={isAdmin}
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
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-primary">⏳ Loading Turnamen TWI...</div>}>
      <TournamentContent />
    </Suspense>
  );
}
