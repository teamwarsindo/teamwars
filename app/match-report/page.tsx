import { kv } from "@vercel/kv";
import MatchReportPageClient from "./page-client";
import { MatchItem } from "./utils/lib-match-report";
import { MatchScheduleItem } from "@/lib/types/tournament";

export const metadata = {
  title: "Match Report — Team Wars Indonesia",
  description: "Formulir pelaporan hasil pertandingan Team Wars Indonesia",
};

export const dynamic = "force-dynamic";

// Helper kalkulasi nomor minggu jika weekNumber di KV kosong
function computeWeekNumber(dateIsoString?: string): number {
  if (!dateIsoString) return 1;
  const startDateStr = process.env.TWI_START_DATE || "2026-08-03";
  const startDate = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
  const matchDate = new Date(dateIsoString).getTime();
  if (isNaN(matchDate) || isNaN(startDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export default async function MatchReportPage() {
  let matches: MatchItem[] = [];

  try {
    const schedules = (await kv.get<MatchScheduleItem[]>("twi:schedules")) || [];

    if (Array.isArray(schedules) && schedules.length > 0) {
      let isKvUpdated = false;

      const updatedSchedules = schedules.map((m, index) => {
        let week = m.weekNumber;

        // Auto-correct jika weekNumber kosong di KV
        if (!week || typeof week !== "number" || week < 1) {
          week = computeWeekNumber(m.matchDate);
          m.weekNumber = week;
          isKvUpdated = true;
        }

        const rawId = m.id || `match-${index + 1}`;
        const matchNumberStr = rawId.replace(/[^0-9]/g, "") || String(index + 1);

        return {
          scheduleItem: m,
          formatted: {
            id: rawId,
            group: m.groupName || "Group Stage",
            week: week,
            matchNumber: parseInt(matchNumberStr, 10) || index + 1,
            teamA: {
              name: m.teamAName || "Team A",
              code: m.teamAName || "Team A",
              emoji: "🔵",
            },
            teamB: {
              name: m.teamBName || "Team B",
              code: m.teamBName || "Team B",
              emoji: "🔴",
            },
          },
        };
      });

      // Simpan permanen ke KV jika ada weekNumber yang baru terisi
      if (isKvUpdated) {
        const cleanSchedulesToSave = updatedSchedules.map((item) => item.scheduleItem);
        await kv.set("twi:schedules", cleanSchedulesToSave);
      }

      matches = updatedSchedules.map((item) => item.formatted);
    }
  } catch (error) {
    console.error("Error reading KV in Server:", error);
    matches = [];
  }

  return <MatchReportPageClient initialMatches={matches} />;
                                             }
