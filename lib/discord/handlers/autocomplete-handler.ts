import { kv } from '@vercel/kv';

// Handler Autocomplete Submit Command
export async function handleSubmitAutocomplete(body: any) {
  try {
    const focusedOption = body.data?.options?.[0]?.options?.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const { name, value } = focusedOption;
    const query = (value || '').toLowerCase().trim();

    // Autocomplete Archetype
    if (name === 'archetype') {
      const archetypes = (await kv.get<string[]>('twi:master_archetypes')) || [];
      const filtered = archetypes
        .filter((a) => a.toLowerCase().includes(query))
        .slice(0, 25)
        .map((a) => ({ name: a, value: a }));
      return { type: 8, data: { choices: filtered } };
    }

    // Autocomplete Skill (Membaca Key Object twi:master_skills)
    if (name === 'skill') {
      const skillsRaw = (await kv.get<Record<string, string> | string[]>('twi:master_skills')) || {};
      const skillList = Array.isArray(skillsRaw) ? skillsRaw : Object.keys(skillsRaw);

      const filtered = skillList
        .filter((s) => s.toLowerCase().includes(query))
        .slice(0, 25)
        .map((s) => ({ name: s, value: s }));
      return { type: 8, data: { choices: filtered } };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error autocomplete submit:', error);
    return { type: 8, data: { choices: [] } };
  }
                                                }
