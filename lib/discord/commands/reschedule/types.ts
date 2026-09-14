import { MatchScheduleItem, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // YYYY-MM-DD
}

export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  // Ambil waktu sekarang dalam WIB
  const now = new Date();
  const todayWibKey = getWibDateKey(now);

  // 1. Tentukan Pekan Berjalan (Current Week)
  // Ambil dari match target, atau cari match masa depan terdekat yang belum selesai
  const futureMatches = schedules.filter((m) => {
    if (!m.matchDate) return false;
    const mKey = getWibDateKey(new Date(m.matchDate));
    return mKey >= todayWibKey;
  });

  let currentWeek = 1;
  if (futureMatches.length > 0) {
    // Ambil weekNumber dari match terdekat hari ini
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
    // Jangan hitung match yang sedang di-reschedule ini
    if (m.id && targetMatch.id && m.id === targetMatch.id) return;
    const key = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
  });

  // 4. Kumpulkan semua tanggal unik dari pekan ini, atau buat rentang Selasa s.d. Minggu
  const dateSet = new Set<string>();
  weekMatches.forEach((m) => {
    const key = getWibDateKey(new Date(m.matchDate));
    if (key) dateSet.add(key);
  });

  // Urutkan tanggal
  let sortedDates = Array.from(dateSet).sort();

  // Fallback jika belum ada tanggal terisi di pekan ini: generate 7 hari dari hari ini
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
    // Hanya tampilkan tanggal hari ini atau ke depan
    if (dateKey < todayWibKey) {
      continue;
    }

    // Jangan tawarkan tanggal yang sama dengan jadwal saat ini
    if (dateKey === currentMatchDateKey) {
      continue;
    }

    const count = matchCountByDate.get(dateKey) || 0;
    const remainingSlots = Math.max(0, 3 - count);

    // Jika kuota hari tersebut sudah penuh (3/3), jangan tampilkan
    if (remainingSlots <= 0) {
      continue;
    }

    // Format tampilan nama hari (contoh: "Sel, 15 Sep (Sisa 1 Match)")
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // UTC siang agar aman time zone
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
