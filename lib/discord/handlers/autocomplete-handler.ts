import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getCurrentServerWeek,
  TWI_START_DATETIME,
} from '@/app/tournament/_library';
import { isValidSnowflake } from '@/lib/discord/utils';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

// 🟢 Baseline Resmi: Senin Pukul 08.00 WIB
const START_DATE_ENV = process.env.TWI_START_DATE || TWI_START_DATETIME;

function getMatchWeekNumber(matchDateIso: string): number {
  if (!matchDateIso) return 1;
  const matchDate = new Date(matchDateIso).getTime();
  const startDate = new Date(START_DATE_ENV).getTime();

  if (isNaN(matchDate) || isNaN(startDate)) return 1;

  // Dihitung berdasarkan interval 7 hari (168 jam) dari Senin 08.00 WIB
  const diffMs = matchDate - startDate;
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1);
}

// Helper sinkron dengan getCurrentServerWeek (Pukul 08.00 WIB)
function getCurrentWeekNumber(): number {
  return getCurrentServerWeek();
}

function formatWIBShort(isoString: string): string {
  if (!isoString) return 'TBA';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'TBA';
  const day = d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  });
  const time = d
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
    .replace('.', ':');
  return `${day} • ${time} WIB`;
}

export async function handleAssignAutocomplete(interaction: any) {
  const options = interaction.data?.options || [];
  const focusedOption = options.find((opt: any) => opt.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const query = (focusedOption.value || '').toLowerCase();

  // A. AUTO-COMPLETE MATCH (Dinamis Berdasarkan Week Aktif)
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    // 1. Hitung week number untuk setiap match
    const schedulesWithWeek = schedules.map((m) => ({
      ...m,
      calculatedWeekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));

    // 2. Hitung Minggu Aktif Hari Ini (Baru ganti ke Week 3 setelah Senin 08.00 WIB)
    const currentWeek = getCurrentWeekNumber();

    // 3. Filter Match Khusus Week Aktif Hari Ini
    let activeWeekMatches = schedulesWithWeek.filter(
      (m) => m.calculatedWeekNumber === currentWeek
    );

    // Fallback: Jika minggu aktif kosong/tidak ada match, tampilkan match yang belum selesai
    if (activeWeekMatches.length === 0) {
      activeWeekMatches = schedulesWithWeek.filter((m) => !m.isFinished);
    }

    // 4. Urutkan berdasarkan Nomor Match (MATCH-1, MATCH-2 ...)
    const sortedByMatchId = activeWeekMatches.sort((a, b) => {
      const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    // 5. Filter Query Pencarian
    const choices = sortedByMatchId
      .filter((m) =>
        `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase().includes(query)
      )
      .slice(0, 25)
      .map((m) => ({
        name: `[W${m.calculatedWeekNumber}] ${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
        value: m.id,
      }));

    return { type: 8, data: { choices } };
  }

  // B. AUTO-COMPLETE USER (Filter Staf & Validasi Discord ID)
  if (focusedOption.name === 'user') {
    const typeOption = options.find((opt: any) => opt.name === 'type')?.value;
    const kvKey =
      typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
    const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];

    // 🟢 Filter: Wajib memiliki Discord ID valid (Snowflake) dan sesuai query pencarian
    const choices = staffList
      .filter(
        (s) =>
          isValidSnowflake(s.discordId) &&
          s.discordName.toLowerCase().includes(query)
      )
      .slice(0, 25)
      .map((s) => ({ name: s.discordName, value: s.discordId }));

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}
