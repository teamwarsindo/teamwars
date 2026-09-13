import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import AnalyticsClientContent from "./analytics-client";
import { RawMatchReport, TeamRosterData } from "./_library/power-ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Official Analytics — TWI Season 7",
  description:
    "Official Analytics, Live Match Reports, Deck Stats, and Leaderboards for Team Wars Indonesia Season 7",
};

export default async function AnalyticsLandingPage() {
  // Ambil Schedules, Teams, dan Match Reports Hash secara paralel (1 round-trip)
  const [rawSchedules, rawTeams, rawReportsHash] = await Promise.all([
    kv.get<any[]>("twi:schedules").then((res) => res || []),
    kv.get<any[]>("twi:teams").then((res) => res || []),
    kv.hgetall<Record<string, any>>("twi:match_reports").then((res) => res || {}),
  ]);

  const maxActiveWeek: number = rawSchedules.reduce((max: number, m: any) => {
    const w = Number(m.weekNumber || 1);
    return m.isFinished && w > max ? w : max;
  }, 1);

  const scheduleList = rawSchedules
    .filter((m: any) => Number(m.weekNumber || 1) <= maxActiveWeek)
    .map((m: any) => ({
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

  const finishedMatches = rawSchedules.filter(
    (m: any) => Boolean(m.isFinished) && Number(m.weekNumber || 1) <= maxActiveWeek
  );

  // Parse reports langsung dari Hash Map twi:match_reports
  const reports: RawMatchReport[] = finishedMatches.map((m: any) => {
    const rep = rawReportsHash[m.id] || {};

    return {
      id: m.id,
      matchId: rep.matchId || m.id,
      week: Number(rep.week || m.weekNumber || 1),
      teamA: {
        name: rep.teamA?.name || m.teamAName || "",
        slug: rep.teamA?.slug || m.teamASlug || m.teamAName?.toLowerCase().replace(/\s+/g, "-"),
        score: rep.teamA?.score ?? 0,
        logo: m.teamALogo || rep.teamA?.logo || "",
        groupName: m.groupName || "",
        lineup: rep.teamA?.lineup || [],
      },
      teamB: {
        name: rep.teamB?.name || m.teamBName || "",
        slug: rep.teamB?.slug || m.teamBSlug || m.teamBName?.toLowerCase().replace(/\s+/g, "-"),
        score: rep.teamB?.score ?? 0,
        logo: m.teamBLogo || rep.teamB?.logo || "",
        groupName: m.groupName || "",
        lineup: rep.teamB?.lineup || [],
      },
      games: rep.games || [],
      isFinished: true,
    };
  });

  const teams: TeamRosterData[] = rawTeams.map((t: any) => ({
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
              schedules={scheduleList}
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
