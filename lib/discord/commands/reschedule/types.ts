import {
  MatchScheduleItem,
  getWibDateKey,
  getMatchWeekNumber,
  TOURNAMENT_RULES,
} from '@/app/tournament/_library';

export interface RescheduleSlotChoice {
  name: string;
  value: string; // YYYY-MM-DD
}

export function getAvailableRescheduleSlots(
  schedules: MatchScheduleItem[],
  targetMatch: MatchScheduleItem
): RescheduleSlotChoice[] {
  const now = new Date();

  // 1. Tentukan Pekan Target Match
  const targetWeek = Number(targetMatch.weekNumber || getMatchWeekNumber(targetMatch.matchDate) || 1);

  // 2. Deteksi Babak Playoff & Kuota Harian via TOURNAMENT_RULES dari constants.ts
  const isPlayoffStage =
    Boolean(targetMatch.stage && targetMatch.stage !== 'GROUP_STAGE') ||
    Boolean(targetMatch.id && targetMatch.id.startsWith('match-po-')) ||
    targetWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  const maxDailyQuota = isPlayoffStage
    ? ((TOURNAMENT_RULES as any).MAX_MATCHES_PER_DAY_PLAYOFF ?? 1)
    : ((TOURNAMENT_RULES as any).MAX_MATCHES_PER_DAY ?? 3);

  // 3. Kumpulkan seluruh match di pekan yang sama
  const weekMatches = schedules.filter((m) => {
    const w = Number(m.weekNumber || getMatchWeekNumber(m.matchDate));
    return w === targetWeek;
  });

  // Petakan daftar match per tanggal (WIB)
  const matchesByDate = new Map<string, MatchScheduleItem[]>();
  weekMatches.forEach((m) => {
    if (!m.matchDate) return;
    const key = getWibDateKey(new Date(m.matchDate));
    const list = matchesByDate.get(key) || [];
    list.push(m);
    matchesByDate.set(key, list);
  });

  // 4. Batas akhir: Hari Minggu di pekan target match
  const targetMatchDate = new Date(targetMatch.matchDate);
  const dayOfWeek = targetMatchDate.getDay(); // 0 = Min, 1 = Sen, dst.
  const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sundayDate = new Date(targetMatchDate);
  sundayDate.setDate(targetMatchDate.getDate() + diffToSunday);
  const sundayKey = getWibDateKey(sundayDate);

  const currentMatchDateKey = getWibDateKey(targetMatchDate);
  const slots: RescheduleSlotChoice[] = [];

  // 5. Titik awal: Mulai besok (H+1) sampai Minggu
  let checkDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  while (true) {
    const dateKey = getWibDateKey(checkDay);

    // Berhenti jika sudah lewat hari Minggu
    if (dateKey > sundayKey) {
      break;
    }

    // Lewati jika sama dengan tanggal jadwal match saat ini
    if (dateKey !== currentMatchDateKey) {
      const dayMatches = matchesByDate.get(dateKey) || [];
      const otherMatches = dayMatches.filter((m) => m.id !== targetMatch.id);
      const remainingSlots = Math.max(0, maxDailyQuota - otherMatches.length);

      const formattedDay = checkDay.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      });

      if (isPlayoffStage) {
        if (remainingSlots > 0) {
          // Jika kuota playoff hari itu masih kosong
          slots.push({
            name: `${formattedDay} (Sisa ${remainingSlots} Match)`,
            value: dateKey,
          });
        } else {
          // Jika sudah ada match, pastikan match tersebut belum selesai agar valid untuk di-swap
          const opponentMatch = otherMatches[0];
          if (opponentMatch && !opponentMatch.isFinished) {
            slots.push({
              name: `${formattedDay} (Swap Jadwal)`,
              value: dateKey,
            });
          }
        }
      } else {
        // Babak reguler biasa
        if (remainingSlots > 0) {
          slots.push({
            name: `${formattedDay} (Sisa ${remainingSlots} Match)`,
            value: dateKey,
          });
        }
      }
    }

    checkDay.setDate(checkDay.getDate() + 1);
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
