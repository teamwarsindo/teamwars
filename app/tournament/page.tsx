import { cookies } from "next/headers";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import TournamentClientContent from "./tournament-client";

export const metadata = {
  title: "Official Schedule — TWI Season 7",
};

export default async function TournamentLandingPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = Boolean(adminCookie);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      {/* Ambient glow yang sinkron */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* 1. TOP BAR STICKY */}
      <TopBar title="Official Schedule" />

      {/* 2. HERO HEADER (SINKRON DENGAN HALAMAN LAIN) */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-12 sm:px-6">
        <HeroHeader showDetails={true} />

        {/* 3. MAIN CONTENT */}
        <section className="w-full max-w-5xl">
          <Suspense
            fallback={
              <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">
                ⏳ Memuat Jadwal &amp; Klasemen TWI...
              </div>
            }
          >
            <TournamentClientContent isAdmin={isAdmin} />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
            }
