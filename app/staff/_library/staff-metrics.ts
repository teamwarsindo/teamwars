import { MatchDetail } from '../_components/referee-tab';

export interface FinishedScheduleSummary {
  id: string;
  weekNumber: number;
  scoreA: number;
  scoreB: number;
  hasStream?: boolean;
}

export type RankFluctuationDirection = 'UP' | 'DOWN' | 'SAME';

export interface RankChangeInfo {
  direction: RankFluctuationDirection;
  delta: number;
}

const DAY_CYCLE_PRIORITY: Record<number, { name: string; priority: number; isWeekend: boolean }> = {
  3: { name: 'Rabu', priority: 1, isWeekend: false },
  4: { name: 'Kamis', priority: 2, isWeekend: false },
  5: { name: 'Jumat', priority: 3, isWeekend: false },
  6: { name: 'Sabtu', priority: 4, isWeekend: true },
  0: { name: 'Minggu', priority: 5, isWeekend: true },
  1: { name: 'Senin', priority: 6, isWeekend: false },
  2: { name: 'Selasa', priority: 7, isWeekend: false },
};

/**
 * Format tanggal pertandingan: DD MMMM YYYY (contoh: 05 Oktober 2026)
 */
export function formatMatchDateDisplay(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format kategori hari untuk kartu tanding: Weekend - Sabtu / Weekday - Jumat
 */
export function formatMatchDayCategory(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dayIndex = d.getDay();
  const meta = DAY_CYCLE_PRIORITY[dayIndex] || { name: 'Jumat', priority: 99, isWeekend: false };
  const category = meta.isWeekend ? 'Weekend' : 'Weekday';

  return `${category} - ${meta.name}`;
}

/**
 * Menghitung Favorite Day dengan format: Weekend - Sabtu (5x) / Weekday - Kamis (3x)
 * Tie-breaker: frekuensi terbanyak -> hari paling awal dalam siklus turnamen (Rabu s/d Selasa)
 */
export function determineFavoriteDay(matches: any[]): string {
  const dayCounts = new Map<number, number>();

  matches.forEach((m) => {
    if (!m.matchDate) return;
    const d = new Date(m.matchDate);
    if (!isNaN(d.getTime())) {
      const dayIndex = d.getDay();
      dayCounts.set(dayIndex, (dayCounts.get(dayIndex) || 0) + 1);
    }
  });

  if (dayCounts.size === 0) return '-';

  const dayStats = Array.from(dayCounts.entries()).map(([dayIndex, count]) => {
    const meta = DAY_CYCLE_PRIORITY[dayIndex] || { name: 'Rabu', priority: 99, isWeekend: false };
    return {
      dayIndex,
      count,
      name: meta.name,
      priority: meta.priority,
      category: meta.isWeekend ? 'Weekend' : 'Weekday',
    };
  });

  dayStats.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.priority - b.priority;
  });

  const best = dayStats[0];
  return `${best.category} - ${best.name} (${best.count}x)`;
}

/**
 * Urutkan riwayat match: Pekan terbaru -> Waktu tanding terbaru -> ID terbesar
 */
export function sortMatchesDescending(matches: any[]) {
  return [...matches].sort((a, b) => {
    const wA = Number(a.weekNumber || String(a.weekName).replace(/\D/g, '') || 1);
    const wB = Number(b.weekNumber || String(b.weekName).replace(/\D/g, '') || 1);
    if (wB !== wA) return wB - wA;

    if (a.matchDate && b.matchDate) {
      const tA = new Date(a.matchDate).getTime();
      const tB = new Date(b.matchDate).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tB !== tA) return tB - tA;
    }

    const idA = Number(String(a.id).replace(/\D/g, '')) || 0;
    const idB = Number(String(b.id).replace(/\D/g, '')) || 0;
    return idB - idA;
  });
}

export interface RankableStaff {
  discordId: string;
  matchCount: number;
  performNum: number;
  gpmNum: number;
  discordName: string;
}

/**
 * Menghitung map ranking staf: MATCH -> PERFORM -> GPM -> NAMA ABJAD
 */
export function computeStaffRanking(items: RankableStaff[]): Map<string, number> {
  const sorted = [...items].sort(
    (a, b) =>
      b.matchCount - a.matchCount ||
      b.performNum - a.performNum ||
      b.gpmNum - a.gpmNum ||
      a.discordName.localeCompare(b.discordName)
  );

  const rankMap = new Map<string, number>();
  sorted.forEach((item, index) => {
    rankMap.set(item.discordId, index + 1);
  });
  return rankMap;
}

/**
 * Helper komparasi delta ranking antara dua map
 */
export function calculateRankFluctuation(oldRank?: number, newRank?: number): RankChangeInfo {
  if (oldRank === undefined || newRank === undefined) {
    return { direction: 'SAME', delta: 0 };
  }
  if (oldRank > newRank) {
    return { direction: 'UP', delta: oldRank - newRank };
  }
  if (oldRank < newRank) {
    return { direction: 'DOWN', delta: newRank - oldRank };
  }
  return { direction: 'SAME', delta: 0 };
}
