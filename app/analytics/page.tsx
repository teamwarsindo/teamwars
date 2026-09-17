import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import AnalyticsClientContent from "./analytics-client";
import { RawMatchReport, TeamRosterData } from "./_library/power-ranking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  // Cari pekan aktif tertinggi: hitung jika sudah selesai ATAU sudah memiliki laporan/games berjalan
  const maxActiveWeek: number = rawSchedules.reduce((max: number, m: any) => {
    const w = Number(m.weekNumber || 1);
    const rep = rawReportsHash[m.id];
    const hasLiveGames = Boolean(rep && Array.isArray(rep.games) && rep.games.length > 0);
    const isOngoingOrFinished = Boolean(m.isFinished) || hasLiveGames;

    return isOngoingOrFinished && w > max ? w : max;
  }, 1);

  const scheduleList = rawSchedules
    .filter((m: any) => Number(m.weekNumber || 1) <= maxActiveWeek)
    .map((m: any) => {
      const rep = rawReportsHash[m.id] || {};
      const scoreA = rep.teamA?.score ?? m.scoreA ?? m.teamAScore ?? 0;
      const scoreB = rep.teamB?.score ?? m.scoreB ?? m.teamBScore ?? 0;
      const isFinished = Boolean(m.isFinished || rep.isFinished || scoreA >= 10 || scoreB >= 10);

      return {
        id: m.id,
        weekNumber: Number(m.weekNumber || 1),
        groupName: m.groupName || "",
        teamAName: m.teamAName || "",
        teamBName: m.teamBName || "",
        teamALogo: m.teamALogo || "",
        teamBLogo: m.teamBLogo || "",
        matchDate: m.matchDate || "",
        scoreA,
        scoreB,
        isFinished,
      };
    });

  // AMBIL SEMUA MATCH (Selesai maupun yang sedang berjalan yang sudah memiliki log report/games)
  const activeMatches = rawSchedules.filter((m: any) => {
    const w = Number(m.weekNumber || 1);
    if (w > maxActiveWeek) return false;

    const rep = rawReportsHash[m.id];
    const hasReportData = Boolean(
      rep && (
        (Array.isArray(rep.games) && rep.games.length > 0) ||
        rep.teamA?.score > 0 ||
        rep.teamB?.score > 0
      )
    );

    // Ikut sertakan jika match sudah finished ATAU sedang berlangsung dan sudah ada duel/game
    return Boolean(m.isFinished) || hasReportData;
  });

  // Parse reports dari match yang aktif (finished + ongoing)
  const reports: RawMatchReport[] = activeMatches.map((m: any) => {
    const rep = rawReportsHash[m.id] || {};
    const scoreA = rep.teamA?.score ?? m.scoreA ?? m.teamAScore ?? 0;
    const scoreB = rep.teamB?.score ?? m.scoreB ?? m.teamBScore ?? 0;

    return {
      id: m.id,
      matchId: rep.matchId || m.id,
      week: Number(rep.week || m.weekNumber || 1),
      teamA: {
        name: rep.teamA?.name || m.teamAName || "",
        slug: rep.teamA?.slug || m.teamASlug || m.teamAName?.toLowerCase().replace(/\s+/g, "-"),
        score: scoreA,
        logo: m.teamALogo || rep.teamA?.logo || "",
        groupName: m.groupName || "",
        lineup: rep.teamA?.lineup || [],
      },
      teamB: {
        name: rep.teamB?.name || m.teamBName || "",
        slug: rep.teamB?.slug || m.teamBSlug || m.teamBName?.toLowerCase().replace(/\s+/g, "-"),
        score: scoreB,
        logo: m.teamBLogo || rep.teamB?.logo || "",
        groupName: m.groupName || "",
        lineup: rep.teamB?.lineup || [],
      },
      games: rep.games || [],
      isFinished: Boolean(m.isFinished || rep.isFinished || scoreA >= 10 || scoreB >= 10),
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
      
