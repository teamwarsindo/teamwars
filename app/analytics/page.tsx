import { cookies } from "next/headers";
import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { getMatchWeekNumber, MatchScheduleItem } from "@/app/tournament/_library";
import AnalyticsClientContent from "./analytics-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Official Analytics — TWI Season 7",
  description: "Official Analytics, Live Match Reports, Deck Stats, and Leaderboards for Team Wars Indonesia Season 7",
};

export default async function AnalyticsLandingPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = Boolean(adminCookie);

  // 1. Ambil seluruh data schedule langsung dari KV
  const rawSchedules = (await kv.get<MatchScheduleItem[]>("twi:schedules")) || [];

  // 2. Petakan agar memiliki groupName dan weekNumber yang valid
  const scheduleList = rawSchedules.map((m: any) => ({
    id: m.id,
    weekNumber: Number(m.weekNumber || getMatchWeekNumber(m.matchDate) || 1),
    groupName: m.groupName || "",
    teamAName: m.teamAName || "",
    teamBName: m.teamBName || "",
    matchDate: m.matchDate,
    isFinished: Boolean(m.isFinished),
  }));

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      {/* Ambient glow sinkron */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      {/* 1. TOP BAR STICKY */}
      <TopBar title="Official Analytics" />

      {/* 2. HERO HEADER */}
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
            <AnalyticsClientContent isAdmin={isAdmin} schedules={scheduleList} />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
}
