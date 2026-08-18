import { TWI_START_DATETIME } from "./constants";

/**
 * Interface opsi pemformatan waktu WIB
 */
export interface FormatWibOptions {
  includeDay?: boolean;   // Menampilkan nama hari Indonesia lengkap (misal: "Minggu")
  includeDate?: boolean;  // Menampilkan tanggal bulan tahun (misal: "18 Aug 2026")
  includeTime?: boolean;  // Menampilkan jam menit (misal: "20.00")
  includeSuffix?: boolean;// Menampilkan kata "WIB" di akhir (default: true)
}

/**
 * Helper internal untuk parsing komponen waktu sesuai standar format TWI
 */
function getWibParts(dateRaw?: string | Date) {
  if (!dateRaw) return null;
  const d = typeof dateRaw === "string" ? new Date(dateRaw) : dateRaw;
  if (isNaN(d.getTime())) return null;

  // Nama hari Indonesia lengkap
  const dayName = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  });

  const dayNumber = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
  });

  // Bulan bahasa Inggris (Aug, dll.)
  const month = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    month: "short",
  });

  const year = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  });

  // Waktu format Indonesia (menggunakan titik ".")
  const timeStr = d
    .toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(":", ".");

  return { d, dayName, dayNumber, month, year, timeStr };
}

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
 * Mengambil string waktu WIB lengkap (contoh: '18 Agustus 2026, 20.00.00 WIB')
 */
export function getWIBTime(): string {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "medium",
  });
}

/**
 * Fungsi General Format Tanggal & Waktu WIB
 * 
 * Contoh Output:
 * - formatDateTimeWIB(d) -> "18 Aug 2026 at 20.00 WIB"
 * - formatDateTimeWIB(d, { includeDay: true }) -> "Selasa, 18 Aug 2026 at 20.00 WIB"
 * - formatDateTimeWIB(d, { includeDate: false }) -> "20.00 WIB"
 * - formatDateTimeWIB(d, { includeTime: false, includeSuffix: false }) -> "18 Aug 2026"
 */
export function formatDateTimeWIB(
  dateRaw?: string | Date,
  options: FormatWibOptions = {}
): string {
  const {
    includeDay = false,
    includeDate = true,
    includeTime = true,
    includeSuffix = true,
  } = options;

  const parts = getWibParts(dateRaw || new Date());
  if (!parts) return "Belum ditentukan";

  const segments: string[] = [];

  if (includeDate) {
    if (includeDay) {
      segments.push(`${parts.dayName}, ${parts.dayNumber} ${parts.month} ${parts.year}`);
    } else {
      segments.push(`${parts.dayNumber} ${parts.month} ${parts.year}`);
    }
  } else if (includeDay) {
    segments.push(parts.dayName);
  }

  let result = "";

  if (segments.length > 0 && includeTime) {
    result = `${segments[0]} at ${parts.timeStr}`;
  } else if (segments.length > 0) {
    result = segments[0];
  } else if (includeTime) {
    result = parts.timeStr;
  }

  if (includeSuffix && result) {
    result += " WIB";
  }

  return result;
}

/**
 * Alias ringkas untuk jadwal pertandingan (contoh: 'Minggu, 16 Aug, 20.00')
 */
export function formatMatchWIB(dateRaw?: string | Date): string {
  const parts = getWibParts(dateRaw);
  if (!parts) return "";
  return `${parts.dayName}, ${parts.dayNumber} ${parts.month}, ${parts.timeStr}`;
                                 }
