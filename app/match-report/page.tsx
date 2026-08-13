import { kv } from "@vercel/kv";
import MatchReportPageClient from "./page-client";
import { MatchItem } from "./utils/lib-match-report";

export const metadata = {
  title: "Match Report — Team Wars Indonesia",
  description: "Formulir pelaporan hasil pertandingan Team Wars Indonesia",
};

export const revalidate = 0; // Always fetch fresh schedule

export default async function MatchReportPage() {
  let matches: MatchItem[] = [];

  try {
    // Ambil data jadwal resmi dari Redis KV (Key TWI Schedule kamu)
    const rawSchedules = await kv.get("twi:schedules");

    if (rawSchedules) {
      matches = typeof rawSchedules === "string" ? JSON.parse(rawSchedules) : rawSchedules;
    }
  } catch (error) {
    console.error("Gagal mengambil TWI Schedule dari KV:", error);
  }

  return <MatchReportPageClient initialMatches={matches} />;
}