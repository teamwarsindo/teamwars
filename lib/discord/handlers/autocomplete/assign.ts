import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/commands/assign/types';
import { filterChoices } from './types';

export async function handleAssignAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const typeOption = interaction.data?.options?.find((opt: any) => opt.name === 'type')?.value;
    const query = String(focused.value || '');

    // 🟢 Dukung opsi 'match' (assign/unassign) serta 'match_a' dan 'match_b' (swap-assign)
    if (focused.name === 'match' || focused.name === 'match_a' || focused.name === 'match_b') {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      const activeMatches = schedules.filter((m) => !m.isFinished && m.discordChannelId);
      const activeWeek = activeMatches.length > 0 ? Math.min(...activeMatches.map((m) => m.weekNumber || 1)) : null;

      const filtered = schedules.filter((m) => {
        if (m.isFinished || !m.discordChannelId || (activeWeek !== null && (m.weekNumber || 1) !== activeWeek)) {
          return false;
        }
        return true;
      });

      return {
        type: 8,
        data: {
          choices: filterChoices(
            filtered,
            query,
            (m) => `${m.id}: ${m.teamAName} vs ${m.teamBName}`,
            (m) => m.id,
            (m) => [m.id, m.teamAName, m.teamBName]
          ),
        },
      };
    }

    if (focused.name === 'user') {
      const staffList = (await kv.get<StaffItem[]>(typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees')) || [];
      const sorted = [...staffList].sort((a, b) => a.discordName.localeCompare(b.discordName, 'id', { sensitivity: 'base' }));
      return {
        type: 8,
        data: { choices: filterChoices(sorted, query, (s) => s.discordName, (s) => s.discordId) },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}