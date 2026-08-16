import { TWI_START_DATETIME } from "./constants";

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
 * Menghitung nomor week berdasarkan tanggal pertandingan ISO (Fallback jika weekNumber belum terisi).
 */
export function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = new Date(TWI_START_DATETIME).getTime();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Standarisasi slug nama tim untuk key Redis KV (contoh: 'teams:fpf-darkfall')
 */
export function getTeamSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Mengambil key tanggal YYYY-MM-DD berbasis zona waktu Asia/Jakarta (WIB)
 */
export function getWibDateKey(dateObj: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Mengambil string waktu WIB lengkap (contoh: '16 Agustus 2026, 15.00.00 WIB')
 */
export function getWIBTime(): string {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium",
  });
}

/**
 * Format tanggal & jam pertandingan ringkas standar WIB (contoh: 'Min, 16 Agu, 20.00')
 */
export function formatMatchWIB(dateRaw?: string | Date): string {
  if (!dateRaw) return "";
  const d = new Date(dateRaw);
  if (isNaN(d.getTime())) return "";

  const dateStr = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const timeStr = d
    .toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":");

  return `${dateStr}, ${timeStr}`;
}

/**
 * Format tanggal & jam pertandingan lengkap standar WIB (contoh: 'Min, 16 Agu 2026 at 20:00 WIB')
 */
export function formatFullWIB(dateRaw?: string | Date): string {
  if (!dateRaw) return "Belum ditentukan";
  const d = new Date(dateRaw);
  if (isNaN(d.getTime())) return "Belum ditentukan";

  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeStr = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateStr} at ${timeStr} WIB`;
}