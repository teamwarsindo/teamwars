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

function getDeckChoices(playerObj: any, teamData: any): Array<{ name: string; value: string }> {
  if (!playerObj) return [];
  const choices: Array<{ name: string; value: string }> = [];

  const d1 = playerObj.deck1;
  const d2 = playerObj.deck2;
  const repeatsUsed = teamData?.repeatsUsed || 0;
  const canRepeat = repeatsUsed < 1 && (playerObj.totalWins || 0) === 0 && (playerObj.totalLosses || 0) === 1;

  // Deck 1
  if (d1?.archetype) {
    const skill1 = d1.skill ? ` • ${d1.skill}` : '';
    if (!d1.isDead) {
      choices.push({ name: `${d1.archetype}${skill1}`, value: d1.archetype });
    } else if (canRepeat && (d1.wins || 0) === 0 && !d1.isRepeatUsed) {
      choices.push({ name: `Repeat (${d1.archetype}${skill1})`, value: `REPEAT:${d1.archetype}` });
    }
  }

  // Deck 2
  if (d2?.archetype && !d2.isDead) {
    const skill2 = d2.skill ? ` • ${d2.skill}` : '';
    choices.push({ name: `${d2.archetype}${skill2}`, value: d2.archetype });
  }

  return choices;
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

    // 1. Pemain Tim A
    if (fName === 'pemain_a') {
      const lineupA: any[] = reportData.teamA?.lineup || [];
      const activePlayers = lineupA.filter((p) => {
        const canRepeat = (reportData.teamA?.repeatsUsed || 0) < 1 && (p.totalWins || 0) === 0 && (p.totalLosses || 0) === 1;
        return (p.remainingLife ?? 2) > 0 || canRepeat;
      });
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

    // 2. Deck Tim A
    if (fName === 'deck_a') {
      const selectedPlayerIgn = String(options.find((o: any) => o.name === 'pemain_a')?.value || '').trim();
      const lineupA: any[] = reportData.teamA?.lineup || [];
      const playerObj = lineupA.find((p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase());
      const choices = getDeckChoices(playerObj, reportData.teamA);
      return { type: 8, data: { choices: filterChoices(choices, query, (d) => d.name, (d) => d.value) } };
    }

    // 3. Pemain Tim B
    if (fName === 'pemain_b') {
      const lineupB: any[] = reportData.teamB?.lineup || [];
      const activePlayers = lineupB.filter((p) => {
        const canRepeat = (reportData.teamB?.repeatsUsed || 0) < 1 && (p.totalWins || 0) === 0 && (p.totalLosses || 0) === 1;
        return (p.remainingLife ?? 2) > 0 || canRepeat;
      });
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

    // 4. Deck Tim B
    if (fName === 'deck_b') {
      const selectedPlayerIgn = String(options.find((o: any) => o.name === 'pemain_b')?.value || '').trim();
      const lineupB: any[] = reportData.teamB?.lineup || [];
      const playerObj = lineupB.find((p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase());
      const choices = getDeckChoices(playerObj, reportData.teamB);
      return { type: 8, data: { choices: filterChoices(choices, query, (d) => d.name, (d) => d.value) } };
    }

    // 5. Pilihan Tim Pemenang (Dinamis Nama Asli Tim)
    if (fName === 'pemenang') {
      const nameA = reportData.teamA?.name || 'Tim A';
      const nameB = reportData.teamB?.name || 'Tim B';
      const winnerChoices = [
        { name: `${nameA} (Tim A)`, value: 'A' },
        { name: `${nameB} (Tim B)`, value: 'B' },
      ];
      return { type: 8, data: { choices: filterChoices(winnerChoices, query, (w) => w.name, (w) => w.value) } };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handleGameAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
