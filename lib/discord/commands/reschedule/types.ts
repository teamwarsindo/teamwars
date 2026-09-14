import { MatchScheduleItem, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // YYYY-MM-DD
}

export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  const now = new Date();
  const todayWibKey = getWibDateKey(now);

  // 1. Tentukan Pekan Berjalan (Current Week)
  const futureMatches = schedules.filter((m) => {
    if (!m.matchDate) return false;
    const mKey = getWibDateKey(new Date(m.matchDate));
    return mKey >= todayWibKey;
  });

  let currentWeek = 1;
  if (futureMatches.length > 0) {
    currentWeek = Number(
      futureMatches[0].weekNumber || getMatchWeekNumber(futureMatches[0].matchDate) || 1
    );
  } else {
    currentWeek = Number(
      targetMatch.weekNumber || getMatchWeekNumber(targetMatch.matchDate) || 1
    );
  }

  // 2. Ambil seluruh match pada pekan tersebut
  const weekMatches = schedules.filter((m) => {
    const w = Number(m.weekNumber || getMatchWeekNumber(m.matchDate));
    return w === currentWeek;
  });

  // 3. Hitung pemakaian slot kuota per tanggal (Maksimal 3 match/hari)
  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    if (m.id && targetMatch.id && m.id === targetMatch.id) return;
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  // 4. Kumpulkan semua tanggal unik dari pekan ini
  const dateSet = new Set<string>();
  weekMatches.forEach((m) => {
    const key = getWibDateKey(new Date(m.matchDate));
    if (key) dateSet.add(key);
  });

  let sortedDates = Array.from(dateSet).sort();

  // Fallback jika belum ada tanggal terisi di pekan ini
  if (sortedDates.length === 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      sortedDates.push(getWibDateKey(d));
    }
  }

  const currentMatchDateKey = getWibDateKey(new Date(targetMatch.matchDate));
  const slots: RescheduleSlotChoice[] = [];

  for (const dateKey of sortedDates) {
    if (dateKey < todayWibKey) {
      continue;
    }

    if (dateKey === currentMatchDateKey) {
      continue;
    }

    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count);

    if (remainingSlots <= 0) {
      continue;
    }

    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const formattedDay = dateObj.toLocaleDateString('id-ID', {
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
