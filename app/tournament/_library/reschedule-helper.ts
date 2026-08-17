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
  const matchWeek = targetMatch.weekNumber || getMatchWeekNumber(targetMatch.matchDate);
  const weekMatches = schedules.filter(
    (m) => (m.weekNumber || getMatchWeekNumber(m.matchDate)) === matchWeek
  );

  const matchTimestamps = weekMatches.map((m) => new Date(m.matchDate).getTime()).sort((a, b) => a - b);
  const earliestDate = new Date(matchTimestamps[0] || targetMatch.matchDate);

  const dayOfWeek = earliestDate.getDay(); // 0=Min, 1=Sen, ..., 3=Rab
  const diffToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const wednesdayDate = new Date(earliestDate);
  wednesdayDate.setDate(earliestDate.getDate() - diffToWed);

  // Hitung jumlah match eksisting per tanggal
  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  const slots: RescheduleSlotChoice[] = [];

  // Slot turnamen: 5 hari (Rabu s/d Minggu)
  for (let i = 0; i < 5; i++) {
    const d = new Date(wednesdayDate);
    d.setDate(wednesdayDate.getDate() + i);

    const dateKey = getWibDateKey(d); // YYYY-MM-DD
    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count); // Maksimal 3 match per hari
    const isCurrentMatchDate = getWibDateKey(new Date(targetMatch.matchDate)) === dateKey;

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
    
    const statusLabel = isCurrentMatchDate
      ? '(Jadwal Saat Ini)'
      : `(Sisa ${remainingSlots} Match)`;

    slots.push({
      name: `${formattedDay} ${statusLabel}`,
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
 * 🟢 Bangun ISO String Baru WIB (+07:00) dari kombinasi tanggal dan jam input
 */
export function buildNewRescheduleIso(
  currentIso: string,
  newDateKey?: string,
  timeInput?: string
): string {
  const baseDate = new Date(currentIso);

  // 1. Tentukan tanggal (YYYY-MM-DD)
  const targetDateKey = newDateKey || getWibDateKey(baseDate);
  const [yearStr, monthStr, dayStr] = targetDateKey.split('-');

  // 2. Tentukan jam & menit
  const parsedTime = parseTimeInput(timeInput);
  let finalHour: number;
  let finalMinute: number;

  if (parsedTime) {
    finalHour = parsedTime.hour;
    finalMinute = parsedTime.minute;
  } else {
    // Pertahankan jam & menit lama (dalam zona WIB)
    const currentWibTime = baseDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    });
    const [h, m] = currentWibTime.replace('.', ':').split(':').map((v) => parseInt(v, 10));
    finalHour = h;
    finalMinute = m;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  // Format ISO dengan offset WIB (+07:00)
  return `${yearStr}-${monthStr}-${dayStr}T${pad(finalHour)}:${pad(finalMinute)}:00+07:00`;
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
