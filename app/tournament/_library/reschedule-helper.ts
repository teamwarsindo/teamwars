import { MatchScheduleItem } from './types';
import { getWibDateKey, getMatchWeekNumber } from './index';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // Format YYYY-MM-DD
}

/**
 * 🟢 Helper Autocomplete: Menghitung slot tanggal Rabu - Minggu pada week match bersangkutan.
 * Hanya menampilkan hari yang masih memiliki sisa kuota (maksimal 3 match per hari).
 */
export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  // 1. Tentukan tanggal target match dalam kalender WIB
  const targetDateKey = getWibDateKey(new Date(targetMatch.matchDate)); // "YYYY-MM-DD"
  const [tYear, tMonth, tDay] = targetDateKey.split('-').map(Number);
  
  // Konstruksi Date murni lokal WIB (pukul 12:00 siang WIB agar aman dari pergeseran DST/UTC)
  const targetWibDate = new Date(Date.UTC(tYear, tMonth - 1, tDay, 5, 0, 0)); // 05:00 UTC = 12:00 WIB

  // 2. Hitung hari dalam seminggu versi WIB (0=Minggu, 1=Senin, ..., 3=Rabu)
  const targetDayWib = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(targetWibDate);

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[targetDayWib] ?? 3;

  // 3. Cari tanggal Rabu di pekan target match
  const diffToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const wednesdayDate = new Date(targetWibDate);
  wednesdayDate.setUTCDate(wednesdayDate.getUTCDate() - diffToWed);

  // Buat daftar 5 tanggal pekan turnamen (Rabu s/d Minggu)
  const weekDateKeys: string[] = [];
  const weekDates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(wednesdayDate);
    d.setUTCDate(wednesdayDate.getUTCDate() + i);
    weekDateKeys.push(getWibDateKey(d));
    weekDates.push(d);
  }

  // 4. Hitung jumlah match di masing-masing dari 5 tanggal tersebut dari seluruh data schedules
  const matchCountByDate = new Map<string, number>();
  weekDateKeys.forEach((key) => matchCountByDate.set(key, 0));

  schedules.forEach((m) => {
    if (!m.matchDate) return;
    const dateKey = getWibDateKey(new Date(m.matchDate));
    if (matchCountByDate.has(dateKey)) {
      matchCountByDate.set(dateKey, (matchCountByDate.get(dateKey) || 0) + 1);
    }
  });

  const slots: RescheduleSlotChoice[] = [];

  // 5. Generate pilihan dropdown
  for (let i = 0; i < 5; i++) {
    const d = weekDates[i];
    const dateKey = weekDateKeys[i];
    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count); // Kuota 3 match per hari
    const isCurrentMatchDate = targetDateKey === dateKey;

    // 🔴 Abaikan jika kuota penuh (sisa <= 0) ATAU merupakan tanggal match saat ini
    if (remainingSlots <= 0 || isCurrentMatchDate) {
      continue;
    }

    const formattedDay = d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    slots.push({
      name: `${formattedDay} (Sisa ${remainingSlots} Match)`,
      value: dateKey,
    });
  }

  return slots;
}

/**
 * 🟢 Sanitasi & Konversi Jam Bebas (Contoh: "20", "20.00", "20:30") ke { hour, minute }
 */
export function parseTimeInput(timeStr?: string): { hour: number; minute: number } | null {
  if (!timeStr || !timeStr.trim()) return null;

  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');

  const hour = parseInt(parts[0], 10);
  const minute = parts.length > 1 ? parseInt(parts[1], 10) : 0;

  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Format jam "${timeStr}" tidak valid! Gunakan format contoh: 20.00 atau 20:30.`);
  }

  return { hour, minute };
}

/**
 * 🟢 Bangun ISO String Baru Standard (.000Z) dari kombinasi tanggal dan jam input
 */
export function buildNewRescheduleIso(
  currentIso: string,
  newDateKey?: string,
  timeInput?: string
): string {
  const baseDate = new Date(currentIso);

  // 1. Tentukan tanggal (YYYY-MM-DD)
  const targetDateKey = newDateKey || getWibDateKey(baseDate);
  const [yearStr, monthStr, dayStr] = targetDateKey.split('-').map(Number);

  // 2. Tentukan jam & menit WIB
  const parsedTime = parseTimeInput(timeInput);
  let finalHour: number;
  let finalMinute: number;

  if (parsedTime) {
    finalHour = parsedTime.hour;
    finalMinute = parsedTime.minute;
  } else {
    const currentWibTime = baseDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    });
    const [h, m] = currentWibTime.replace('.', ':').split(':').map(Number);
    finalHour = h;
    finalMinute = m;
  }

  // 3. Konversi WIB (UTC+7) ke UTC Standard (.toISOString())
  // Jam UTC = Jam WIB - 7
  const utcDate = new Date(Date.UTC(yearStr, monthStr - 1, dayStr, finalHour - 7, finalMinute, 0));
  return utcDate.toISOString();
}

/**
 * 🟢 Format tampilan ringkas konfirmasi WIB
 */
export function formatConfirmationWIB(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}
