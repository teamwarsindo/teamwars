import { MatchScheduleItem, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // YYYY-MM-DD
}

// ── PENGATURAN HARI RESCHEDULE PEKAN INI ──
// 1 = Besok (Selasa jika hari ini Senin), 2 = Lusa (Rabu), dst.
const START_OFFSET_FROM_TODAY = 1; // 1 = Mulai besok (Selasa, 15 Sep)
const TOTAL_DAYS = 6;              // 6 hari (Sel, Rab, Kam, Jum, Sab, Min)

export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  const now = new Date();
  const todayWibKey = getWibDateKey(now); // "2026-09-14"

  // 1. Tentukan Pekan Berjalan (Current Active Week)
  const upcomingMatches = schedules.filter(
    (m) => m.matchDate && getWibDateKey(new Date(m.matchDate)) >= todayWibKey
  );

  let currentWeek = 1;
  if (upcomingMatches.length > 0) {
    currentWeek = Number(upcomingMatches[0].weekNumber || getMatchWeekNumber(upcomingMatches[0].matchDate) || 1);
  } else {
    currentWeek = Number(targetMatch.weekNumber || getMatchWeekNumber(targetMatch.matchDate) || 1);
  }

  // 2. Kumpulkan match pada pekan aktif untuk dihitung kuotanya
  const weekMatches = schedules.filter((m) => {
    const w = Number(m.weekNumber || getMatchWeekNumber(m.matchDate));
    return w === currentWeek;
  });

  // Hitung jumlah match per tanggal (maksimal 3)
  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    if (m.id && targetMatch.id && m.id === targetMatch.id) return;
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  const currentMatchDateKey = getWibDateKey(new Date(targetMatch.matchDate));
  const slots: RescheduleSlotChoice[] = [];

  // 3. Langsung buat slot hari sesuai setting (Selasa s.d. Minggu)
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const dayOffset = START_OFFSET_FROM_TODAY + i;
    const d = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateKey = getWibDateKey(d);

    // Jangan tawarkan tanggal yang sama dengan jadwal match saat ini
    if (dateKey === currentMatchDateKey) {
      continue;
    }

    // Cek sisa kuota terhadap jadwal
    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count);

    // Jika hari tersebut penuh (3/3), jangan tampilkan
    if (remainingSlots <= 0) {
      continue;
    }

    const formattedDay = d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
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

export function buildNewRescheduleIso(currentIso: string, newDateKey?: string, timeInput?: string): string {
  const baseDate = new Date(currentIso);
  const targetDateKey = newDateKey || getWibDateKey(baseDate);
  const [yearStr, monthStr, dayStr] = targetDateKey.split('-');

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
    const [h, m] = currentWibTime.replace('.', ':').split(':').map((v) => parseInt(v, 10));
    finalHour = h;
    finalMinute = m;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}T${pad(finalHour)}:${pad(finalMinute)}:00+07:00`;
}

export function formatConfirmationWIB(isoString: string): string {
  const d = new Date(isoString);
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }) + ' WIB'
  );
    }
