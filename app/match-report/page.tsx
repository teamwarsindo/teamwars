import { kv } from "@vercel/kv";
import MatchReportPageClient from "./page-client";
import { MatchItem } from "./utils/lib-match-report";
import { MatchScheduleItem } from "@/lib/types/tournament";

export const metadata = {
  title: "Match Report — Team Wars Indonesia",
  description: "Formulir pelaporan hasil pertandingan Team Wars Indonesia",
};

// Menonaktifkan caching agar selalu mengambil data KV paling segar
export const dynamic = "force-dynamic";

export default async function MatchReportPage() {
  let matches: MatchItem[] = [];

  try {
    const schedules = await kv.get<MatchScheduleItem[]>("twi:schedules");

    if (Array.isArray(schedules) && schedules.length > 0) {
      matches = schedules.map((m, index) => {
        const rawId = m?.id || `match-${index + 1}`;
        const matchNumberStr = rawId.replace(/[^0-9]/g, "") || String(index + 1);

        return {
          id: rawId,
          group: m?.groupName || "Group Stage",
          week: Number(m?.weekNumber) || 1,
          matchNumber: parseInt(matchNumberStr, 10) || index + 1,
          teamA: {
            name: m?.teamAName || "Team A",
            code: m?.teamAName || "Team A",
            emoji: "🔵",
          },
          teamB: {
            name: m?.teamBName || "Team B",
            code: m?.teamBName || "Team B",
            emoji: "🔴",
          },
        };
      });
    }
  } catch (error) {
    console.error("Error membaca KV schedules di Server:", error);
    matches = []; // Safe Fallback
  }

  return <MatchReportPageClient initialMatches={matches} />;
                                             }
