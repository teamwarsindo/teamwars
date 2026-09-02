import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { filterChoices } from './types';

async function resolveMatchFromMatchChannel(channelId: string) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const currentMatch = schedules.find((m) => m.discordChannelId === channelId);
  if (currentMatch) return currentMatch;

  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.matchChannel?.channelId === channelId) {
      return schedules.find((m) => m.id === matchId) || null;
    }
  }
  return null;
}

export async function handleGameAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const match = await resolveMatchFromMatchChannel(channelId);
    if (!match) return { type: 8, data: { choices: [] } };

    const reportData = await kv.hget<any>('twi:match_reports', match.id);
    if (!reportData) return { type: 8, data: { choices: [] } };

    const rawOptions = interaction.data?.options || [];
    const subCommand = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const options = subCommand ? subCommand.options || [] : rawOptions;
    const focused = options.find((o: any) => o.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const fName = focused.name;
    const rawVal = String(focused.value || '').trim();
    const query = rawVal.toLowerCase();

    // Pemain Tim A
    if (fName === 'pemain_a') {
      const lineupA: any[] = reportData.teamA?.lineup || [];
      const activePlayers = lineupA.filter((p) => (p.remainingLife ?? 2) > 0 || !p.deck1?.isDead || (p.deck2 && !p.deck2.isDead));
      return {
        type: 8,
        data: {
          choices: filterChoices(
            activePlayers,
            query,
            (p) => `${p.ign} (Sisa Life: ${p.remainingLife ?? 2})`,
            (p) => p.ign,
            (p) => [p.ign || '', p.idDuelLinks || '']
          ),
        },
      };
    }

    // Deck Tim A
    if (fName === 'deck_a') {
      const selectedPlayerIgn = String(options.find((o: any) => o.name === 'pemain_a')?.value || '').trim();
      const lineupA: any[] = reportData.teamA?.lineup || [];
      const playerObj = lineupA.find((p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase());

      const availableDecks: Array<{ name: string; value: string }> = [];
      if (playerObj) {
        if (playerObj.deck1?.archetype && !playerObj.deck1.isDead) {
          const skillStr = playerObj.deck1.skill ? ` • ${playerObj.deck1.skill}` : '';
          availableDecks.push({ name: `${playerObj.deck1.archetype}${skillStr}`, value: playerObj.deck1.archetype });
        }
        if (playerObj.deck2?.archetype && !playerObj.deck2.isDead) {
          const skillStr = playerObj.deck2.skill ? ` • ${playerObj.deck2.skill}` : '';
          availableDecks.push({ name: `${playerObj.deck2.archetype}${skillStr}`, value: playerObj.deck2.archetype });
        }
      }
      return { type: 8, data: { choices: filterChoices(availableDecks, query, (d) => d.name, (d) => d.value) } };
    }

    // Pemain Tim B
    if (fName === 'pemain_b') {
      const lineupB: any[] = reportData.teamB?.lineup || [];
      const activePlayers = lineupB.filter((p) => (p.remainingLife ?? 2) > 0 || !p.deck1?.isDead || (p.deck2 && !p.deck2.isDead));
      return {
        type: 8,
        data: {
          choices: filterChoices(
            activePlayers,
            query,
            (p) => `${p.ign} (Sisa Life: ${p.remainingLife ?? 2})`,
            (p) => p.ign,
            (p) => [p.ign || '', p.idDuelLinks || '']
          ),
        },
      };
    }

    // Deck Tim B
    if (fName === 'deck_b') {
      const selectedPlayerIgn = String(options.find((o: any) => o.name === 'pemain_b')?.value || '').trim();
      const lineupB: any[] = reportData.teamB?.lineup || [];
      const playerObj = lineupB.find((p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase());

      const availableDecks: Array<{ name: string; value: string }> = [];
      if (playerObj) {
        if (playerObj.deck1?.archetype && !playerObj.deck1.isDead) {
          const skillStr = playerObj.deck1.skill ? ` • ${playerObj.deck1.skill}` : '';
          availableDecks.push({ name: `${playerObj.deck1.archetype}${skillStr}`, value: playerObj.deck1.archetype });
        }
        if (playerObj.deck2?.archetype && !playerObj.deck2.isDead) {
          const skillStr = playerObj.deck2.skill ? ` • ${playerObj.deck2.skill}` : '';
          availableDecks.push({ name: `${playerObj.deck2.archetype}${skillStr}`, value: playerObj.deck2.archetype });
        }
      }
      return { type: 8, data: { choices: filterChoices(availableDecks, query, (d) => d.name, (d) => d.value) } };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handleGameAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
