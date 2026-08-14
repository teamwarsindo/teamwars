import { kv } from "@vercel/kv";
import MatchReportPageClient from "./page-client";
import { MatchItem } from "./utils/lib-match-report";
import { MatchScheduleItem } from "@/lib/types/tournament";

export const metadata = {
  title: "Match Report — Team Wars Indonesia",
  description: "Formulir pelaporan hasil pertandingan Team Wars Indonesia",
};

export const dynamic = "force-dynamic";

function computeWeekNumber(dateIsoString?: string): number {
  if (!dateIsoString) return 1;
  const startDateStr = process.env.TWI_START_DATE || "2026-08-03";
  const startDate = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
  const matchDate = new Date(dateIsoString).getTime();
  if (isNaN(matchDate) || isNaN(startDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function getTeamSlug(teamName: string): string {
  if (!teamName) return "";
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function MatchReportPage() {
  let matches: MatchItem[] = [];

  try {
    const schedules = (await kv.get<MatchScheduleItem[]>("twi:schedules")) || [];

    if (Array.isArray(schedules) && schedules.length > 0) {
      const enrichedMatches = await Promise.all(
        schedules.map(async (m, index) => {
          let week = m.weekNumber;
          if (!week || typeof week !== "number" || week < 1) {
            week = computeWeekNumber(m.matchDate);
          }

          const rawId = m.id || `match-${index + 1}`;
          const matchNumberStr = rawId.replace(/[^0-9]/g, "") || String(index + 1);

          const slugA = getTeamSlug(m.teamAName);
          const slugB = getTeamSlug(m.teamBName);

          // Tarik Data Asli dari Upstash Redis Hash teams:{slug}
          const [teamDataA, teamDataB] = await Promise.all([
            slugA ? kv.hgetall<Record<string, any>>(`teams:${slugA}`) : null,
            slugB ? kv.hgetall<Record<string, any>>(`teams:${slugB}`) : null,
          ]);

          // PAKSA Ambil 'kodeTim' & 'emoji' dari DB KV
          const kodeA = teamDataA?.kodeTim || (m as any).teamACode;
          const kodeB = teamDataB?.kodeTim || (m as any).teamBCode;

          return {
            id: rawId,
            group: m.groupName || "Group Stage",
            week: week,
            matchNumber: parseInt(matchNumberStr, 10) || index + 1,
            scoreA: m.scoreA ?? 0,
            scoreB: m.scoreB ?? 0,
            teamALogo: m.teamALogo || teamDataA?.logoTim || "/logo.webp",
            teamBLogo: m.teamBLogo || teamDataB?.logoTim || "/logo.webp",
            teamA: {
              name: m.teamAName,
              code: kodeA || "", // Kosong jika tidak ada, agar melempar error di validation
              emoji: teamDataA?.emoji || "🔵",
            },
            teamB: {
              name: m.teamBName,
              code: kodeB || "", // Kosong jika tidak ada, agar melempar error di validation
              emoji: teamDataB?.emoji || "🔴",
            },
          };
        })
      );

      matches = enrichedMatches;
    }
  } catch (error) {
    console.error("Error reading KV in Server:", error);
    matches = [];
  }

  return <MatchReportPageClient initialMatches={matches} />;
}
