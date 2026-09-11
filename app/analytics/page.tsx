import { cookies } from "next/headers";
import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
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

  // Ambil data schedules langsung dari Upstash KV
  const rawSchedules = (await kv.get<any[]>("twi:schedules")) || [];

  // Hitung pekan maksimal yang sudah berlangsung/selesai (mentok di Week 6)
  const maxActiveWeek = rawSchedules.reduce((max, m) => {
    const w = Number(m.weekNumber || 1);
    return m.isFinished && w > max ? w : max;
  }, 1);

  // Filter ketat: Match pekan masa depan (> maxActiveWeek) tidak dikirim ke klien
  const scheduleList = rawSchedules
    .filter((m) => Number(m.weekNumber || 1) <= maxActiveWeek)
    .map((m) => ({
      id: m.id,
      weekNumber: Number(m.weekNumber || 1),
      groupName: m.groupName || "",
      teamAName: m.teamAName || "",
      teamBName: m.teamBName || "",
      teamALogo: m.teamALogo || "",
      teamBLogo: m.teamBLogo || "",
      matchDate: m.matchDate || "",
      isFinished: Boolean(m.isFinished),
    }));

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Official Analytics" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-12 sm:px-6">
        <HeroHeader showDetails={true} />

        <section className="w-full max-w-4xl">
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs font-bold text-primary animate-pulse">
                Memuat Data Analitik &amp; Laporan Pertandingan...
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
