import { kv } from "@vercel/kv";
import MatchReportPageClient from "./page-client";
import { MatchItem } from "./utils/lib-match-report";

export const metadata = {
  title: "Match Report — Team Wars Indonesia",
  description: "Formulir pelaporan hasil pertandingan Team Wars Indonesia",
};

// Revalidate data setiap kali halaman dibuka (Dynamic Server Rendering)
export const revalidate = 0;

export default async function MatchReportPage() {
  let matches: MatchItem[] = [];

  try {
    // 1. Ambil daftar slug semua tim terdaftar dari KV Redis
    const teamSlugs: string[] = (await kv.smembers("global:teams")) || [];

    // 2. Ambil detail setiap tim dari KV
    const teamsData = await Promise.all(
      teamSlugs.map(async (slug) => {
        const team = await kv.hgetall(`teams:${slug}`);
        return {
          slug,
          name: (team?.namaTim as string) || slug,
          code: slug.toUpperCase().slice(0, 3), // Ambil 3 huruf awal sebagai kode tim
          emoji: "🛡️", // Emoji default tim
        };
      })
    );

    // 3. Jika sudah ada data jadwal resmi di KV, kita ambil dari key "global:schedules"
    const savedSchedules: MatchItem[] | null = await kv.get("global:schedules");

    if (savedSchedules && Array.isArray(savedSchedules) && savedSchedules.length > 0) {
      matches = savedSchedules;
    } else if (teamsData.length >= 2) {
      // 4. Fallback Otomatis: Jika jadwal di KV belum dibuat, buatkan pairing otomatis dari tim terdaftar
      let matchCount = 1;
      for (let i = 0; i < teamsData.length; i += 2) {
        if (teamsData[i + 1]) {
          matches.push({
            id: `m_${matchCount}`,
            group: "Group Stage",
            week: 1, // Default ke Week 1
            matchNumber: matchCount,
            teamA: {
              name: teamsData[i].name,
              code: teamsData[i].code,
              emoji: "🟦",
            },
            teamB: {
              name: teamsData[i + 1].name,
              code: teamsData[i + 1].code,
              emoji: "🟥",
            },
          });
          matchCount++;
        }
      }
    }
  } catch (error) {
    console.error("Gagal mengambil data tim/jadwal asli dari KV:", error);
  }

  return <MatchReportPageClient initialMatches={matches} />;
}