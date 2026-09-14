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

  // 1. Tentukan Pekan Berjalan (Current Active Week) secara dinamis dari jadwal turnamen
  // Cari pekan tertinggi dari match yang belum selesai atau match di sekitar tanggal hari ini
  const activeWeek = schedules.reduce((acc, m) => {
    const w = Number(m.weekNumber || getMatchWeekNumber(m.matchDate) || 1);
    const mDateKey = getWibDateKey(new Date(m.matchDate));
    // Jika ada match yang tanggalnya >= hari ini, pekan tersebut adalah pekan aktif
    if (mDateKey >= todayWibKey && w > acc) {
      return w;
    }
    return acc;
  }, 1);

  // Gunakan pekan aktif turnamen saat ini atau pekan match (ambil yang paling mutakhir)
  const targetMatchWeek = Number(targetMatch.weekNumber || getMatchWeekNumber(targetMatch.matchDate) || 1);
  const effectiveWeek = Math.max(activeWeek, targetMatchWeek);

  // 2. Ambil semua match pada pekan efektif tersebut
  const weekMatches = schedules.filter(
    (m) => Number(m.weekNumber || getMatchWeekNumber(m.matchDate)) === effectiveWeek
  );

  // Hitung penggunaan slot per tanggal di pekan efektif
  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    // Jangan hitung match yang sedang ingin di-reschedule ini ke kuota tanggal lamanya
    if (m.id && targetMatch.id && m.id === targetMatch.id) return;
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  // 3. Tentukan tanggal acuan pekan tersebut
  // Cari match paling awal di pekan ini, atau gunakan acuan sekarang
  const matchTimestamps = weekMatches
    .map((m) => new Date(m.matchDate).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  const refDate = matchTimestamps.length > 0 ? new Date(matchTimestamps[0]) : new Date();

  // Hitung hari Rabu untuk pekan ini (Rabu = day 3)
  const dayOfWeek = refDate.getDay();
  const diffToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const wednesdayDate = new Date(refDate);
  wednesdayDate.setDate(refDate.getDate() - diffToWed);

  const slots: RescheduleSlotChoice[] = [];
  const currentMatchDateKey = getWibDateKey(new Date(targetMatch.matchDate));

  // 4. Rentang hari tanding turnamen (Rabu s.d. Minggu = 5 hari)
  // Catatan: Jika ada match hari Selasa (seperti di recap 15 Sep), perluas rentang dari Selasa (-1) s.d. Minggu (4)
  for (let offset = -1; offset <= 4; offset++) {
    const d = new Date(wednesdayDate);
    d.setDate(wednesdayDate.getDate() + offset);

    const dateKey = getWibDateKey(d);

    // KUNCI: Jangan tampilkan tanggal yang sudah lewat dari hari ini
    if (dateKey < todayWibKey) {
      continue;
    }

    // Jangan tawarkan tanggal yang sama persis dengan jadwal match saat ini
    if (dateKey === currentMatchDateKey) {
      continue;
    }

    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count);

    // Jika kuota hari tersebut sudah habis (maks 3 match/hari), lewati
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
