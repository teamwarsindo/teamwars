// Single Source of Truth Baseline Waktu Turnamen (Kick-off Senin 08.00 WIB)
export const TWI_START_DATETIME = "2026-08-03T08:00:00+07:00";

/**
 * Menghitung minggu turnamen berjalan secara realtime.
 * Berganti week tepat setiap hari Senin pukul 08.00 WIB.
 */
export function getCurrentServerWeek(): number {
  const startDate = new Date(TWI_START_DATETIME).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Menghitung nomor week untuk sebuah tanggal match (jika belum ada properti weekNumber).
 */
export function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = new Date(TWI_START_DATETIME).getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
                  }
