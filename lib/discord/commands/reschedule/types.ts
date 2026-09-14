import { MatchScheduleItem, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // YYYY-MM-DD
}

// ── SETTING HARI TANDING (GANTI ANGKA INI SAJA) ──
// 5 = Selasa, 4 = Rabu, 3 = Kamis
const START_DAY_OFFSET = 5; // Mulai hari Selasa (Minggu minus 5 hari)
const TOTAL_DAYS = 6;       // Total 6 hari (Selasa s.d. Minggu)

export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  const now = new Date();
  const todayWibKey = getWibDateKey(now);

  // 1. Tentukan Pekan Berjalan (Current Active Week)
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

  // 3. Cari hari Minggu di pekan ini sebagai patokan
  const validTimestamps = weekMatches
    .map((m) => new Date(m.matchDate).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  const refDate = validTimestamps.length > 0 ? new Date(validTimestamps[0]) : new Date();

  const day = refDate.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  const sundayDate = new Date(refDate);
  sundayDate.setDate(refDate.getDate() + diffToSunday);

  // Titik awal hari tanding dihitung mundur dari hari Minggu
  const startDate = new Date(sundayDate);
  startDate.setDate(sundayDate.getDate() - START_DAY_OFFSET);

  // 4. Hitung kuota terpakai per tanggal (Maksimal 3 match/hari)
  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    if (m.id && targetMatch.id && m.id === targetMatch.id) return;
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  const slots: RescheduleSlotChoice[] = [];
  const currentMatchDateKey = getWibDateKey(new Date(targetMatch.matchDate));

  // 5. Generate pilihan hari sesuai TOTAL_DAYS
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const dateKey = getWibDateKey(d);

    // Lewati tanggal yang sudah lewat dari hari ini
    if (dateKey < todayWibKey) {
      continue;
    }

    // Lewati tanggal jadwal awal match tersebut
    if (dateKey === currentMatchDateKey) {
      continue;
    }

    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count);

    // Lewati jika kuota hari tersebut penuh (3/3)
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
  
