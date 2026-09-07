import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { getAvailableRescheduleSlots } from '@/lib/discord/commands/reschedule/types';

export async function handleRescheduleAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const options = interaction.data?.options || [];
    const focusedOption = options.find((opt: any) => opt.focused);
    if (!focusedOption || focusedOption.name !== 'tanggal') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m: any) => m.discordChannelId === channelId);

    if (!match) return { type: 8, data: { choices: [] } };

    const availableSlots = getAvailableRescheduleSlots(schedules, match);

    const choices = availableSlots
      .filter((s) => s.name.toLowerCase().includes(query) || s.value.toLowerCase().includes(query))
      .slice(0, 25);

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error reschedule autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}