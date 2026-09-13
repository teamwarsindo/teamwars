import { cookies } from "next/headers";
import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import AnalyticsClientContent from "./analytics-client";
import { MatchReportData, TeamRosterData } from "./_library/power-ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Official Analytics — TWI Season 7",
  description:
    "Official Analytics, Live Match Reports, Deck Stats, and Leaderboards for Team Wars Indonesia Season 7",
};

export default async function AnalyticsLandingPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAdmin = Boolean(adminCookie);

  // 1. Ambil jadwal dan tim
  const [rawSchedules, rawTeams] = await Promise.all([
    kv.get<any[]>("twi:schedules").then((res) => res || []),
    kv.get<any[]>("twi:teams").then((res) => res || []),
  ]);

  // 2. Hitung pekan aktif tertinggi
  const maxActiveWeek = rawSchedules.reduce((max, m) => {
    const w = Number(m.weekNumber || 1);
    return m.isFinished && w > max ? w : max;
  }, 1);

  // Ambil match yang sudah selesai hingga maxActiveWeek
  const finishedMatches = rawSchedules.filter(
    (m) => Boolean(m.isFinished) && Number(m.weekNumber || 1) <= maxActiveWeek
  );

  // 3. Batch get seluruh report detail berdasarkan schedule id
  const reportKeys = finishedMatches.map((m) => `twi:match_report:${m.id}`);
  const rawReports = reportKeys.length > 0 ? await kv.mget<any[]>(...reportKeys) : [];

  // Format menjadi MatchReportData untuk parser power-ranking
  const reports: MatchReportData[] = finishedMatches.map((m, idx) => {
    const rep = rawReports[idx] || {};
    return {
      id: m.id,
      week: Number(m.weekNumber || 1),
      teamA: {
        slug: m.teamASlug || m.teamAName?.toLowerCase().replace(/\s+/g, "-") || "",
        name: m.teamAName || "",
        logo: m.teamALogo || "",
        groupName: m.groupName || "",
      },
      teamB: {
        slug: m.teamBSlug || m.teamBName?.toLowerCase().replace(/\s+/g, "-") || "",
        name: m.teamBName || "",
        logo: m.teamBLogo || "",
        groupName: m.groupName || "",
      },
      logs: rep.logs || rep.duelLogs || [],
      isFinished: true,
    };
  });

  const teams: TeamRosterData[] = rawTeams.map((t) => ({
    slug: t.slug || t.name?.toLowerCase().replace(/\s+/g, "-"),
    name: t.name || "",
    logo: t.logo || "",
    groupName: t.groupName || "",
    members: Array.isArray(t.members) ? t.members : [],
  }));

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Official Analytics" />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-3 sm:px-6 pb-12">
        <HeroHeader showDetails={true} />

        <section className="w-full max-w-4xl">
          <Suspense
            fallback={
              <div className="p-12 text-center text-xs font-bold text-primary animate-pulse">
                Memuat Data Analitik &amp; Power Ranking...
              </div>
            }
          >
            <AnalyticsClientContent
              reports={reports}
              teams={teams}
              maxActiveWeek={maxActiveWeek}
            />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
}
