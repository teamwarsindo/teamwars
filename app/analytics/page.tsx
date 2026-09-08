import { cookies } from "next/headers";
import { Suspense } from "react";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import AnalyticsClientContent from "./analytics-client";

export const metadata = {
  title: "Official Analytics — TWI Season 7",
  description: "Official Analytics, Live Match Reports, Deck Stats, and Leaderboards for Team Wars Indonesia Season 7",
};

export default async function AnalyticsLandingPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = Boolean(adminCookie);

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      {/* Ambient glow sinkron */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* 1. TOP BAR STICKY */}
      <TopBar title="Official Analytics" />

      {/* 2. HERO HEADER (showDetails={true} agar teks Season 7 & deskripsi tampil utuh) */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-12 sm:px-6">
        <HeroHeader showDetails={true} />

        {/* 3. MAIN CONTENT (TABS & ANALYTICS VIEWS) */}
        <section className="w-full max-w-5xl">
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs font-bold text-primary animate-pulse">
                ⏳ Memuat Data Analitik &amp; Laporan Pertandingan...
              </div>
            }
          >
            <AnalyticsClientContent isAdmin={isAdmin} />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
}
