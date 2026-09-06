import { kv } from '@vercel/kv';
import { PlayerItem, parsePlayers, resolveDiscordId, getSubcommandData } from '@/lib/discord/commands/transfer/types';

export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const { opts } = getSubcommandData(interaction);
    const focusedOption = opts.find((o: any) => o.focused);
    if (!focusedOption || focusedOption.name !== 'user') {
      return { type: 8, data: { choices: [] } };
    }

    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);
    const searchValue = (focusedOption.value || '').toLowerCase();

    const filtered = players
      .filter(
        (p) =>
          (p.ign || '').toLowerCase().includes(searchValue) ||
          (p.discord || '').toLowerCase().includes(searchValue)
      )
      .slice(0, 25);

    // Resolusi ID Snowflake untuk setiap choice agar tidak mengirim teks username mentah
    const choices = await Promise.all(
      filtered.map(async (p) => {
        const resolvedId = await resolveDiscordId(p.discord, p.discordId);
        const choiceValue = resolvedId || p.discordId || p.discord || p.ign;
        return {
          name: `${p.ign} (@${p.discord || '-'}) - ${p.role}`,
          value: choiceValue,
        };
      })
    );

    return { type: 8, data: { choices } };
  } catch (err) {
    console.error('[TRANSFER AUTOCOMPLETE ERROR]:', err);
    return { type: 8, data: { choices: [] } };
  }
}
