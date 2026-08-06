import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
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

  // A. AUTO-COMPLETE MATCH (Murni Week 1)
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    const sorted = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    // Filter khusus Week 1
    const activeMatches = sorted.filter((m: any) => {
      const wName = m.weekName || `Week ${m.calculatedWeekNumber || 1}`;
      return wName.toLowerCase().includes('week 1');
    });

    const displayMatches = activeMatches.length > 0 ? activeMatches : sorted.slice(0, 15);

    const choices = displayMatches
      .filter((m) => `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase().includes(query))
      .slice(0, 25)
      .map((m) => ({
        name: `${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
        value: m.id,
      }));

    return { type: 8, data: { choices } };
  }

  // B. AUTO-COMPLETE USER (Terfilter Role Wasit / Streamer)
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
