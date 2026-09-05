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

function getDeckChoices(
  playerObj: any,
  teamData: any,
  lastWinningDeckArchetype?: string | null
): Array<{ name: string; value: string }> {
  if (!playerObj) return [];
  const choices: Array<{ name: string; value: string }> = [];

  const d1 = playerObj.deck1;
  const d2 = playerObj.deck2;
  const repeatsUsed = teamData?.repeatsUsed || 0;

  // 🔒 ATURAN KUNCI DECK PEMENANG (Winner Stays Table & Deck):
  if (lastWinningDeckArchetype) {
    const winningDeck = [d1, d2].find(
      (d) => d && String(d.archetype || '').toLowerCase() === lastWinningDeckArchetype.toLowerCase()
    );
    if (winningDeck && !winningDeck.isDead) {
      const skill = winningDeck.skill ? ` • ${winningDeck.skill}` : '';
      const prefix = winningDeck.isRepeatUsed ? 'Repeat: ' : '';
      const val = winningDeck.isRepeatUsed ? `REPEAT:${winningDeck.archetype}` : winningDeck.archetype;
      return [{ name: `${prefix}${winningDeck.archetype}${skill}`, value: val }];
    }
  }

  // Kuota repeat resmi TWI: maksimal 2 per tim (< 2)
  const canTakeNewRepeat = repeatsUsed < 2 && (playerObj.totalWins || 0) === 0 && (playerObj.totalLosses || 0) === 1;

  // 1. Deck 1
  if (d1?.archetype) {
    const skill1 = d1.skill ? ` • ${d1.skill}` : '';
    if (!d1.isDead) {
      const val = d1.isRepeatUsed ? `REPEAT:${d1.archetype}` : d1.archetype;
      const prefix = d1.isRepeatUsed ? 'Repeat: ' : '';
      choices.push({ name: `${prefix}${d1.archetype}${skill1}`, value: val });
    } else if (canTakeNewRepeat && (d1.wins || 0) === 0 && !d1.isRepeatUsed) {
      choices.push({ name: `Repeat (${d1.archetype}${skill1})`, value: `REPEAT:${d1.archetype}` });
    }
  }

  // 2. Deck 2
  if (d2?.archetype) {
    const skill2 = d2.skill ? ` • ${d2.skill}` : '';
    if (!d2.isDead) {
      const val = d2.isRepeatUsed ? `REPEAT:${d2.archetype}` : d2.archetype;
      const prefix = d2.isRepeatUsed ? 'Repeat: ' : '';
      choices.push({ name: `${prefix}${d2.archetype}${skill2}`, value: val });
    } else if (canTakeNewRepeat && (d2.wins || 0) === 0 && !d2.isRepeatUsed) {
      choices.push({ name: `Repeat (${d2.archetype}${skill2})`, value: `REPEAT:${d2.archetype}` });
    }
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

    const games: any[] = reportData.games || [];
    const lastGame = games.length > 0 ? games[games.length - 1] : null;

    // 1. Pemain Tim A
    if (fName === 'pemain_a') {
      const lineupA: any[] = reportData.teamA?.lineup || [];
      let eligiblePlayers: any[] = [];

      // Kunci hanya jika Tim A adalah PEMENANG di game sebelumnya (Stay table)
      if (lastGame && lastGame.winner === 'teamA') {
        const lastPlayerA = lineupA.find(
          (p) => String(p.ign || '').toLowerCase() === String(lastGame.playerA?.ign || '').toLowerCase()
        );
        if (lastPlayerA && (lastPlayerA.remainingLife ?? 2) > 0) {
          eligiblePlayers = [lastPlayerA];
        }
      }

      // Jika Game 1, atau Tim A kalah ronde lalu (bebas pilih pemain hidup / yang berhak repeat)
      if (eligiblePlayers.length === 0) {
        eligiblePlayers = lineupA.filter((p) => {
          const canRepeat =
            (reportData.teamA?.repeatsUsed || 0) < 2 &&
            (p.totalWins || 0) === 0 &&
            (p.totalLosses || 0) === 1;
          return (p.remainingLife ?? 2) > 0 || canRepeat;
        });
      }

      return {
        type: 8,
        data: {
          choices: filterChoices(
            eligiblePlayers,
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
      const selectedPlayerIgn = String(
        options.find((o: any) => o.name === 'pemain_a')?.value || ''
      ).trim();
      const lineupA: any[] = reportData.teamA?.lineup || [];
      const playerObj = lineupA.find(
        (p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase()
      );

      let lastWinningDeckA: string | null = null;
      if (lastGame && lastGame.winner === 'teamA') {
        if (String(lastGame.playerA?.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase()) {
          lastWinningDeckA = lastGame.playerA?.archetype || null;
        }
      }

      const choices = getDeckChoices(playerObj, reportData.teamA, lastWinningDeckA);
      return { type: 8, data: { choices: filterChoices(choices, query, (d) => d.name, (d) => d.value) } };
    }

    // 3. Pemain Tim B
    if (fName === 'pemain_b') {
      const lineupB: any[] = reportData.teamB?.lineup || [];
      let eligiblePlayers: any[] = [];

      // Kunci hanya jika Tim B adalah PEMENANG di game sebelumnya (Stay table)
      if (lastGame && lastGame.winner === 'teamB') {
        const lastPlayerB = lineupB.find(
          (p) => String(p.ign || '').toLowerCase() === String(lastGame.playerB?.ign || '').toLowerCase()
        );
        if (lastPlayerB && (lastPlayerB.remainingLife ?? 2) > 0) {
          eligiblePlayers = [lastPlayerB];
        }
      }

      // Jika Game 1, atau Tim B kalah ronde lalu
      if (eligiblePlayers.length === 0) {
        eligiblePlayers = lineupB.filter((p) => {
          const canRepeat =
            (reportData.teamB?.repeatsUsed || 0) < 2 &&
            (p.totalWins || 0) === 0 &&
            (p.totalLosses || 0) === 1;
          return (p.remainingLife ?? 2) > 0 || canRepeat;
        });
      }

      return {
        type: 8,
        data: {
          choices: filterChoices(
            eligiblePlayers,
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
      const selectedPlayerIgn = String(
        options.find((o: any) => o.name === 'pemain_b')?.value || ''
      ).trim();
      const lineupB: any[] = reportData.teamB?.lineup || [];
      const playerObj = lineupB.find(
        (p) => String(p.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase()
      );

      let lastWinningDeckB: string | null = null;
      if (lastGame && lastGame.winner === 'teamB') {
        if (String(lastGame.playerB?.ign || '').toLowerCase() === selectedPlayerIgn.toLowerCase()) {
          lastWinningDeckB = lastGame.playerB?.archetype || null;
        }
      }

      const choices = getDeckChoices(playerObj, reportData.teamB, lastWinningDeckB);
      return { type: 8, data: { choices: filterChoices(choices, query, (d) => d.name, (d) => d.value) } };
    }

    // 5. Tim Pemenang
    if (fName === 'pemenang') {
      const nameA = reportData.teamA?.name || 'Tim A';
      const nameB = reportData.teamB?.name || 'Tim B';
      const winnerChoices = [
        { name: `${nameA} (Tim A)`, value: 'A' },
        { name: `${nameB} (Tim B)`, value: 'B' },
      ];
      return {
        type: 8,
        data: { choices: filterChoices(winnerChoices, query, (w) => w.name, (w) => w.value) },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handleGameAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
      }
