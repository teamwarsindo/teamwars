import { kv } from '@vercel/kv';

// Helper pembersih label jika teks '➕ Tambah Deck/Skill' ikut terkirim
function cleanCustomInput(val?: string | null): string {
  if (!val) return '';
  let trimmed = val.trim();
  trimmed = trimmed.replace(/^➕\s*Tambah\s+(Deck|Skill)\s*["']?/i, '');
  trimmed = trimmed.replace(/["']?$/i, '').trim();
  return trimmed;
}

// Inisial singkatan otomatis jika pemain tidak menulis [KODE]
function generateSkillCode(name: string): string {
  const ignored = new Set(['of', 'the', 'to', 'in', 'and', 'a', 'an', 'for', 'from', 'with']);
  const words = name.split(/[\s\-:]+/).filter((w) => w.length > 0);
  const initials = words
    .filter((w) => !ignored.has(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() || '');

  return initials.join('') || name.slice(0, 4).toUpperCase();
}

// Parser pemisah nama skill dan kode singkatan
export function parseSkillInput(rawSkill?: string | null): { fullName: string; code: string } | null {
  const cleaned = cleanCustomInput(rawSkill);
  if (!cleaned || cleaned === '-') return null;

  const match = cleaned.match(/^(.*?)\s*[\(\[]([A-Za-z0-9:! \-]+)[\)\]]$/);
  if (match) {
    return {
      fullName: match[1].trim(),
      code: match[2].trim().toUpperCase(),
    };
  }

  return {
    fullName: cleaned,
    code: generateSkillCode(cleaned),
  };
}

// FUNGSI UTAMA AUTO-SYNC KE KV MASTER
export async function syncCustomDeckAndSkillToMaster(
  rawDeck?: string | null,
  rawSkill?: string | null
): Promise<{ cleanDeck?: string; cleanSkill?: string }> {
  const cleanDeck = cleanCustomInput(rawDeck);
  const parsedSkill = parseSkillInput(rawSkill);

  const tasks: Promise<any>[] = [];

  // 1. Simpan Deck / Archetype baru ke twi:master_decks
  if (cleanDeck && cleanDeck !== '-') {
    tasks.push(
      (async () => {
        const rawDecks = await kv.get<any>('twi:master_decks');
        const decks: string[] = Array.isArray(rawDecks)
          ? rawDecks
          : typeof rawDecks === 'string'
          ? JSON.parse(rawDecks)
          : [];

        if (!decks.some((d) => d.toLowerCase() === cleanDeck.toLowerCase())) {
          decks.push(cleanDeck);
          decks.sort((a, b) => a.localeCompare(b, 'id'));
          await kv.set('twi:master_decks', decks);
        }
      })()
    );
  }

  // 2. Simpan Skill baru ke twi:master_skills
  if (parsedSkill) {
    tasks.push(
      (async () => {
        const rawSkills = await kv.get<any>('twi:master_skills');
        const skillsMap: Record<string, string> =
          rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills) ? rawSkills : {};

        if (!skillsMap[parsedSkill.fullName]) {
          skillsMap[parsedSkill.fullName] = parsedSkill.code;
          await kv.set('twi:master_skills', skillsMap);
        }
      })()
    );
  }

  await Promise.allSettled(tasks);

  return {
    cleanDeck: cleanDeck || undefined,
    cleanSkill: parsedSkill ? parsedSkill.fullName : undefined,
  };
    }
