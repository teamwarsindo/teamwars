import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';

export async function handleAutocomplete(interaction: any) {
  const commandName = interaction.data?.name;
  if (commandName !== 'staff') return { type: 8, data: { choices: [] } };

  const options = interaction.data?.options || [];
  const actionOpt = options.find((o: any) => o.name === 'action')?.value;
  const typeOpt = options.find((o: any) => o.name === 'type')?.value;
  const focusedOpt = options.find((o: any) => o.focused === true);

  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const choices: Array<{ name: string; value: string }> = [];

  // 🔍 AUTOCOMPLETE USER
  if (focusedOpt?.name === 'user') {
    const query = (focusedOpt.value || '').toLowerCase();
    const kvKey = typeOpt === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
    const staffList = (await kv.get<any[]>(kvKey)) || [];

    const availableStaff = staffList.filter((s) => !s.assignMatch);

    for (const s of availableStaff) {
      if (s.discordName.toLowerCase().includes(query)) {
        choices.push({ name: s.discordName, value: s.discordId });
      }
      if (choices.length >= 25) break;
    }
  }

  // 🔍 AUTOCOMPLETE MATCH
  if (focusedOpt?.name === 'match') {
    const query = (focusedOpt.value || '').toLowerCase();

    for (const m of schedules) {
      const mName = `${m.teamAName} vs ${m.teamBName} (${m.id})`;
      if (!mName.toLowerCase().includes(query)) continue;

      if (actionOpt === 'assign') {
        const isFilled = typeOpt === 'STREAMER' ? !!(m.streamerDiscordId || (m as any).casterDiscordId) : !!m.refereeDiscordId;
        if (!isFilled) choices.push({ name: mName, value: m.id });
      } else if (actionOpt === 'reassign' || actionOpt === 'complete') {
        const hasStaff = !!(m.refereeDiscordId || m.streamerDiscordId || (m as any).casterDiscordId);
        if (hasStaff) choices.push({ name: mName, value: m.id });
      }

      if (choices.length >= 25) break;
    }
  }

  return {
    type: 8,
    data: { choices },
  };
}