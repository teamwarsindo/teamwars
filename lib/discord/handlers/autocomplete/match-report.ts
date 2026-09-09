import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { filterChoices } from './types';

export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const teams = Array.from(new Set(schedules.flatMap((m) => [m.teamAName, m.teamBName]).filter(Boolean)));
    return {
      type: 8,
      data: { choices: filterChoices(teams, focused.value || '', (t) => t, (t) => t) },
    };
  } catch (error) {
    console.error('Error match report autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}