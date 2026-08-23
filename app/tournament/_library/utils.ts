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

  const dayName = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  });

  const dayNumber = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
  });

  const month = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    month: "short",
  });

  const year = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  });

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
 * Khusus transisi ke Week 4 ditahan hingga Senin, 24 Agustus 2026 pukul 17.00 WIB.
 */
export function getCurrentServerWeek(): number {
  const now = Date.now();
  const week4ReleaseTime = new Date("2026-08-24T17:00:00+07:00").getTime();

  if (now < week4ReleaseTime) {
    return 3;
  }

  const startDate = new Date(TWI_START_DATETIME).getTime();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Pesan dinamis ketika tab jadwal tidak memiliki laga aktif
 */
export function getScheduleEmptyStateMessage(
  currentWeek: number,
  hasFinishedMatches: boolean
): string {
  const now = Date.now();
  const bugStart = new Date("2026-08-24T08:00:00+07:00").getTime();
  const bugEnd = new Date("2026-08-24T17:00:00+07:00").getTime();

  // 1. Kondisi Khusus: 24 Agustus 2026 jam 08.00 - 17.00 WIB
  if (now >= bugStart && now < bugEnd) {
    return "Pengumuman Jadwal Week 4: Perilisan jadwal ditunda ke pukul 17.00 WIB hari ini sehubungan dengan investigasi bug room spectate macet dan emergency maintenance in-game Yu-Gi-Oh! Duel Links (12.00 – 14.30 WIB).";
  }

  // 2. Kondisi Normal: Seluruh match pekan ini telah selesai dimainkan
  if (hasFinishedMatches) {
    return `Seluruh jadwal pertandingan Week ${currentWeek} telah selesai. Jadwal pekan berikutnya akan diperbarui pada hari Senin pukul 08.00 WIB.`;
  }

  // 3. Kondisi Normal: Pekan belum dimulai / jadwal belum di-input
  return `Jadwal pertandingan untuk Week ${currentWeek} belum dirilis.`;
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
