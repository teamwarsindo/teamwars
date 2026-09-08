import { kv } from '@vercel/kv';
import { PlayerItem, parsePlayers, getSubcommandData } from '@/lib/discord/commands/transfer/types';

export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const teamSlug = await kv.hget<string>('global:channel_teams', channelId);
    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const { subcommand, opts } = getSubcommandData(interaction);
    const focusedOption = opts.find((o: any) => o.focused);
    if (!focusedOption || (focusedOption.name !== 'user' && focusedOption.name !== 'target')) {
      return { type: 8, data: { choices: [] } };
    }

    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);
    const searchValue = (focusedOption.value || '').toLowerCase();

    // Jika subcommand 'out', sembunyikan Ketua/Wakil. Jika 'edit', semua pemain boleh diedit.
    const eligiblePlayers =
      subcommand === 'out'
        ? players.filter((p) => p.role !== 'Ketua' && p.role !== 'Wakil Ketua')
        : players;

    const choices = eligiblePlayers
      .filter(
        (p) =>
          (p.ign || '').toLowerCase().includes(searchValue) ||
          (p.discord || '').toLowerCase().includes(searchValue)
      )
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (@${p.discord || '-'}) - ${p.role || 'Anggota'}`,
        value: p.ign, // Langsung IGN murni tanpa mutasi
      }));

    return { type: 8, data: { choices } };
  } catch (err) {
    console.error('[TRANSFER AUTOCOMPLETE ERROR]:', err);
    return { type: 8, data: { choices: [] } };
  }
}
