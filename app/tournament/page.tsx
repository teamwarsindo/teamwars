"use client";

import { useState, Suspense } from "react";
import { useSession } from "next-auth/react"; // 🟢 Import hook session
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { TournamentView } from "@/components/tournament/tournament-view";

function TournamentContent() {
  const { data: session } = useSession(); // 🟢 Ambil data session
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | "Group A" | "Group B">("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");

  // 🟢 Cek apakah user terautentikasi / role ADMIN
  const isAdmin = !!session?.user; 

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar title="Official Schedule" />

      <div className="px-4">
        <HeroHeader showDetails={false} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <TournamentView
          isAdmin={isAdmin} // 🟢 Pass variabel isAdmin dinamis
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
