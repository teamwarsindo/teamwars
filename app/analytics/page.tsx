import { Suspense } from "react";
import { kv } from "@vercel/kv";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import AnalyticsClientContent from "./analytics-client";
import { RawMatchReport, TeamRosterData } from "./_library/power-ranking";
import { getCurrentServerWeek } from "@/app/tournament/_library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Official Analytics — TWI Season 7",
  description:
    "Official Analytics, Live Match Reports, Deck Stats, and Leaderboards for Team Wars Indonesia Season 7",
};

export default async function AnalyticsLandingPage() {
  // 1. Ambil Schedules, Match Reports Hash, Teams Keys, dan Free Duelists Hash secara paralel
  const [rawSchedules, rawReportsHash, teamKeys, rawFreeDuelistsHash] = await Promise.all([
    kv.get<any[]>("twi:schedules").then((res) => res || []),
    kv.hgetall<Record<string, any>>("twi:match_reports").then((res) => res || {}),
    kv.keys("teams:*").then((res) => res || []),
    kv.hgetall<Record<string, any>>("global:free_duelists").then((res) => res || {}),
  ]);

  // 2. Parse data transfer out dari hash global:free_duelists
  const freeDuelists = Object.values(rawFreeDuelistsHash || {}).map((item) => {
    if (typeof item === "string") {
      try {
        return JSON.parse(item);
      } catch {
        return {};
      }
    }
    return item || {};
  });

  // 3. Tarik detail seluruh tim dari masing-masing hash key teams:*
  const teamsDataList = await Promise.all(
    teamKeys.map(async (key) => {
      const slug = key.replace(/^teams:/, "");
      const t = await kv.hgetall<any>(key);
      if (!t) return null;

      let rosterList: any[] = [];
      const rawRoster = t.players || t.members || [];
      if (typeof rawRoster === "string") {
        try {
          rosterList = JSON.parse(rawRoster);
        } catch {
          rosterList = [];
        }
      } else if (Array.isArray(rawRoster)) {
        rosterList = rawRoster;
      }

      return {
        slug: t.slug || slug,
        name: t.name || t.namaTim || slug,
        logo: t.logo || t.logoTim || "",
        color: t.color || t.warna || "",
        groupName: t.groupName || t.group || t.grup || "",
        players: rosterList,
        members: rosterList,
      } as TeamRosterData;
    })
  );

  const teams: TeamRosterData[] = teamsDataList.filter(
    (item): item is TeamRosterData => item !== null
  );

  // 4. Hitung pekan saat ini secara dinamis dari jadwal dan server time
  const currentWeek = getCurrentServerWeek();
  const maxActiveWeek: number = Math.max(
    currentWeek,
    rawSchedules.reduce((max: number, m: any) => {
      const w = Number(m.weekNumber || 1);
      const rep = rawReportsHash[m.id];
      const hasLiveGames = Boolean(rep && Array.isArray(rep.games) && rep.games.length > 0);
      const isOngoingOrFinished = Boolean(m.isFinished) || hasLiveGames;

      return isOngoingOrFinished && w > max ? w : max;
    }, 1)
  );

  // Batasi jadwal yang ditampilkan sampai dengan pekan saat ini (tidak membuang match yang sedang/akan tanding di pekan ini)
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
        teamAColor: m.teamAColor || "",
        teamBColor: m.teamBColor || "",
        matchDate: m.matchDate || "",
        scoreA,
        scoreB,
        isFinished,
      };
    });

  // 5. Ambil semua match aktif (finished + ongoing)
  const activeMatches = rawSchedules.filter((m: any) => {
    const w = Number(m.weekNumber || 1);
    if (w > maxActiveWeek) return false;

    const rep = rawReportsHash[m.id];
    const hasReportData = Boolean(
      rep && (
        (Array.isArray(rep.games) && rep.games.length > 0) ||
        (rep.teamA?.score ?? 0) > 0 ||
        (rep.teamB?.score ?? 0) > 0
      )
    );

    return Boolean(m.isFinished) || hasReportData;
  });

  // 6. Parse reports dari match yang aktif
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
              freeDuelists={freeDuelists}
              maxActiveWeek={maxActiveWeek}
            />
          </Suspense>
        </section>

        <Footer />
      </div>
    </main>
  );
}
