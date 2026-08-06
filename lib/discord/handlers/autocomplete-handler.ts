import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

// 🟢 Helper persis seperti di React Dashboard Admin
function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
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

  // A. AUTO-COMPLETE MATCH (Presisi Week 1 Sesuai Kalkulasi Dashboard Admin)
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    // 1. Urutkan berdasarkan tanggal pertandingan terawal
    const sortedByDate = [...schedules].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    // 2. Hitung Senin Pertama Turnamen
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    // 3. Pasang kalkulasi Week Number ke tiap match
    const schedulesWithWeek = sortedByDate.map((m) => {
      const matchMonday = getMondayOfWeek(new Date(m.matchDate));
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      const calculatedWeekNumber = Math.floor(diffInDays / 7) + 1;
      return { ...m, calculatedWeekNumber };
    });

    // 4. Murni Filter Khusus Week 1
    const week1Matches = schedulesWithWeek.filter((m) => m.calculatedWeekNumber === 1);

    // 5. Urutkan berdasarkan Nomor Match (MATCH-1, MATCH-2, MATCH-3 ...)
    const sortedByMatchId = week1Matches.sort((a, b) => {
      const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    // 6. Filter Query Pencarian
    const choices = sortedByMatchId
      .filter((m) => `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase().includes(query))
      .slice(0, 25)
      .map((m) => ({
        name: `${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
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
