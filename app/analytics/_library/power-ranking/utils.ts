import { TWI_START_DATETIME } from "@/app/tournament/_library/constants";

export const normalizeKey = (str?: any): string =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

export function calculateBestDeck(
  deckStatsMap: Map<string, { wins: number; losses: number }>
): string {
  if (deckStatsMap.size === 0) return "-";

  const entries = Array.from(deckStatsMap.entries());

  entries.sort((a, b) => {
    const statA = a[1];
    const statB = b[1];

    if (statB.wins !== statA.wins) return statB.wins - statA.wins;
    if (statA.losses !== statB.losses) return statA.losses - statB.losses;
    const totalA = statA.wins + statA.losses;
    const totalB = statB.wins + statB.losses;
    return totalB - totalA;
  });

  return entries[0][0] || "-";
}

export function getJoinedWeekFromDate(
  transferDateStr?: string | null,
  baselineDateStr: string = TWI_START_DATETIME
): number {
  if (!transferDateStr) return 1;

  // Ambil murni format YYYY-MM-DD dari string input dan baseline
  const tStr = transferDateStr.slice(0, 10);
  const bStr = baselineDateStr.slice(0, 10);

  const [tY, tM, tD] = tStr.split("-").map(Number);
  const [bY, bM, bD] = bStr.split("-").map(Number);

  // Normalisasi ke tanggal kalender murni (00:00:00 UTC)
  const targetDayMs = Date.UTC(tY, tM - 1, tD);
  const baselineDayMs = Date.UTC(bY, bM - 1, bD);

  if (targetDayMs <= baselineDayMs) return 1;

  const diffDays = Math.floor((targetDayMs - baselineDayMs) / (1000 * 60 * 60 * 24));

  // 0 - 6 hari = Week 1
  // 7 - 13 hari (+7 hari) = Week 2, dst.
  return Math.floor(diffDays / 7) + 1;
}
