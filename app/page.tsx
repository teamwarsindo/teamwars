import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { AlertNotOpen } from "./_home-components/alert-not-open";
import { TournamentHub } from "./_home-components/tournament-hub";

export default function Page() {
  return (
    // PERUBAHAN DI SINI: overflow-hidden diganti jadi overflow-clip
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      
      {/* Pengecekan Error / Alert terisolasi */}
      <Suspense fallback={null}>
        <AlertNotOpen />
      </Suspense>

      {/* Esports glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Website" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-8 sm:px-6">
        <HeroHeader />
        
        {/* HUB TURNAMEN INFORMATIF */}
        <TournamentHub />

        <Footer />
      </div>
    </main>
  );
      }
