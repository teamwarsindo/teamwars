import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

// 🟢 Mengambil Start Date dari Env (Fallback ke 2026-08-03 jika env belum terbaca)
const START_DATE_ENV = process.env.TWI_START_DATE || '2026-08-03T00:00:00+07:00';
const TOURNAMENT_START_TIME = new Date(START_DATE_ENV).getTime();

function getMatchWeekNumber(matchDateIso: string): number {
  if (!matchDateIso) return 1;
  const matchDate = new Date(matchDateIso).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - TOURNAMENT_START_TIME) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// Helper untuk hitung minggu aktif saat ini (berdasarkan hari ini)
function getCurrentWeekNumber(): number {
  const now = Date.now();
  const diffDays = Math.floor((now - TOURNAMENT_START_TIME) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function formatWIBShort(isoString: string): string {
  if (!isoString) return 'TBA';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'TBA';
  const day = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace('.', ':');
  return `${day} • ${time} WIB`;
}

export async function handleAssignAutocomplete(interaction: any) {
  const options = interaction.data?.options || [];
  const focusedOption = options.find((opt: any) => opt.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const query = (focusedOption.value || '').toLowerCase();

  // A. AUTO-COMPLETE MATCH (Dinamis Berdasarkan Week Aktif Saat Ini)
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    // 1. Hitung week number untuk setiap match
    const schedulesWithWeek = schedules.map((m) => ({
      ...m,
      calculatedWeekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));

    // 2. Hitung Minggu Aktif Hari Ini berdasarkan TWI_START_DATE
    const currentWeek = getCurrentWeekNumber();

    // 3. Filter Match Khusus Week Aktif Hari Ini
    let activeWeekMatches = schedulesWithWeek.filter((m) => m.calculatedWeekNumber === currentWeek);

    // Fallback: Jika di minggu sekarang tidak ada match, tampilkan match yang belum selesai
    if (activeWeekMatches.length === 0) {
      activeWeekMatches = schedulesWithWeek.filter((m) => !(m as any).isCompleted);
    }

    // 4. Urutkan berdasarkan Nomor Match (MATCH-1, MATCH-2 ...)
    const sortedByMatchId = activeWeekMatches.sort((a, b) => {
      const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    // 5. Filter Query Pencarian
    const choices = sortedByMatchId
      .filter((m) => `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase().includes(query))
      .slice(0, 25)
      .map((m) => ({
        name: `[W${m.calculatedWeekNumber}] ${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
        value: m.id,
      }));

    return { type: 8, data: { choices } };
  }

  // B. AUTO-COMPLETE USER (Filter Staf)
  if (focusedOption.name === 'user') {
    const typeOption = options.find((opt: any) => opt.name === 'type')?.value;
    const kvKey = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
    const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];

    const choices = staffList
      .filter((s) => s.discordName.toLowerCase().includes(query))
      .slice(0, 25)
      .map((s) => ({ name: s.discordName, value: s.discordId }));

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}
