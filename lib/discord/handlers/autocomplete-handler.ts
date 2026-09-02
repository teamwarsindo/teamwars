import { kv } from '@vercel/kv';
import { handleRosterAutocomplete } from './autocomplete/roster';
import { handleDeckSkillAutocomplete } from './autocomplete/deck-skill';

function isToday(dateIso?: string): boolean {
  if (!dateIso) return false;
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const match = new Date(dateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return now === match;
}

export async function handleAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);

    if (!activeCamp?.matchId || !activeCamp?.teamKey || !isToday(activeCamp.matchDate)) {
      return { type: 8, data: { choices: [] } };
    }

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;

    const focused = subOptions.find((o: any) => o.focused === true);
    if (!focused) return { type: 8, data: { choices: [] } };

    const ctx = {
      channelId,
      matchId: activeCamp.matchId,
      teamKey: activeCamp.teamKey,
      campData: activeCamp,
      subName,
      fName: focused.name,
      query: String(focused.value || '').trim(),
    };

    let choices: any[] = [];
    if (ctx.fName.startsWith('pemain')) {
      choices = await handleRosterAutocomplete(ctx);
    } else if (ctx.fName.startsWith('deck') || ctx.fName.startsWith('skill')) {
      choices = await handleDeckSkillAutocomplete(ctx);
    }

    return { type: 8, data: { choices } };
  } catch (err) {
    console.error('Error in handleAutocomplete:', err);
    return { type: 8, data: { choices: [] } };
  }
      }
