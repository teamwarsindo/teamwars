import { kv } from '@vercel/kv';
import { AutocompleteContext, filterChoices } from './types';

export async function handleDeckSkillAutocomplete(ctx: AutocompleteContext) {
  const { fName, query } = ctx;

  if (fName.startsWith('deck_') || fName === 'deck') {
    const masterDecks = (await kv.get<string[]>('twi:master_decks')) || [];
    return filterChoices(masterDecks, query, (d) => d, (d) => d);
  }

  if (fName.startsWith('skill_') || fName === 'skill') {
    const masterSkills = (await kv.get<any[]>('twi:master_skills')) || [];
    return filterChoices(
      masterSkills,
      query,
      (s) => `${s.skillName} [${s.shortCode}]`,
      (s) => s.skillName,
      (s) => [s.skillName, s.shortCode]
    );
  }

  return [];
}
