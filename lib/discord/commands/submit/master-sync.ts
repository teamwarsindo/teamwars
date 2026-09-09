import { kv } from '@vercel/kv';

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'des', 'for', 'from',
  'in', 'into', 'nor', 'of', 'off', 'on', 'onto', 'or', 'the', 'to', 'up', 'with'
]);

// 1. FORMATTING: Title Case rapi sesuai kaidah nama skill/deck
export function formatTitleCase(str: string): string {
  if (!str) return '';
  
  // Bersihkan label custom jika terbawa dari autocomplete
  let text = str.trim()
    .replace(/^➕\s*Tambah\s+(Deck|Skill)\s*["']?/i, '')
    .replace(/["']?$/i, '')
    .trim();

  // Pisahkan kata dan tanda baca (seperti :, !, -, /)
  return text.split(/\s+/).map((word, index, arr) => {
    const lower = word.toLowerCase();
    
    // Kata pertama & terakhir selalu kapital, kata hubung di tengah huruf kecil
    if (index > 0 && index < arr.length - 1 && LOWERCASE_WORDS.has(lower)) {
      return lower;
    }
    
    // Tangani kata dengan simbol seperti "D/D" atau "B.E.S"
    if (/^[A-Za-z]\/[A-Za-z]/i.test(word) || word.includes('.')) {
      return word.toUpperCase();
    }
    
    // Angka romawi (II, III, IV, VII, dll)
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(word)) {
      return word.toUpperCase();
    }

    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

// 2. GENERATOR SINGKATAN: Mengikuti 4 pola (Title Case, Simbol, Kata Hubung Kecil)
function generateBaseSkillCode(formattedName: string): string {
  // Pengecualian simbol khusus
  let cleaned = formattedName;
  const parts: string[] = [];

  // Ambil token kata atau tanda baca khusus (: , ! , - , /)
  const tokens = cleaned.match(/[A-Za-z0-9]+|[:!\-\/]/g) || [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Jika simbol, pertahankan simbolnya
    if ([':', '!', '-', '/'].includes(token)) {
      parts.push(token);
      continue;
    }

    const lower = token.toLowerCase();

    // Kata hubung kecil dibuat lowercase di akronim jika diapit (contoh: of -> ot, from the -> ft)
    if (LOWERCASE_WORDS.has(lower) && i > 0 && i < tokens.length - 1) {
      parts.push(lower.charAt(0));
    } else {
      parts.push(token.charAt(0).toUpperCase());
    }
  }

  return parts.join('') || formattedName.slice(0, 3).toUpperCase();
}

// 3. RESOLVER ANTI-DUPLIKASI: Jika singkatan bentrok, buat variasi suku kata
function resolveConflict(baseCode: string, fullName: string, existingSkills: Record<string, string>): string {
  // Cek apakah kode sudah digunakan oleh skill LAIN
  const usedByOther = Object.entries(existingSkills).some(
    ([name, code]) => code.toUpperCase() === baseCode.toUpperCase() && name.toLowerCase() !== fullName.toLowerCase()
  );

  if (!usedByOther) return baseCode;

  // Pola Resolusi Bentrok: Ambil 2 huruf dari tiap kata penting (contoh: Icejade Ripple -> IcRi)
  const words = fullName.split(/[\s\-:]+/).filter(w => w.length > 0 && !LOWERCASE_WORDS.has(w.toLowerCase()));
  if (words.length >= 2) {
    const syllableCode = words.map(w => w.slice(0, 2).charAt(0).toUpperCase() + w.slice(1, 2).toLowerCase()).join('');
    const stillConflict = Object.entries(existingSkills).some(
      ([name, code]) => code === syllableCode && name.toLowerCase() !== fullName.toLowerCase()
    );
    if (!stillConflict) return syllableCode;
  }

  // Fallback terakhir: Tambahkan angka increment (contoh: AGE2, AGE3)
  let count = 2;
  while (Object.values(existingSkills).includes(`${baseCode}${count}`)) {
    count++;
  }
  return `${baseCode}${count}`;
}

// 4. FUNGSI UTAMA AUTO-SYNC
export async function syncCustomDeckAndSkillToMaster(
  rawDeck?: string | null,
  rawSkill?: string | null
): Promise<{ cleanDeck?: string; cleanSkill?: string; generatedCode?: string }> {
  const formattedDeck = rawDeck ? formatTitleCase(rawDeck) : '';
  const formattedSkill = rawSkill ? formatTitleCase(rawSkill) : '';

  const tasks: Promise<any>[] = [];
  let generatedCode: string | undefined;

  // A. Auto-save Deck / Archetype
  if (formattedDeck && formattedDeck !== '-') {
    tasks.push(
      (async () => {
        const rawDecks = await kv.get<any>('twi:master_decks');
        const decks: string[] = Array.isArray(rawDecks)
          ? rawDecks
          : typeof rawDecks === 'string'
          ? JSON.parse(rawDecks)
          : [];

        if (!decks.some((d) => d.toLowerCase() === formattedDeck.toLowerCase())) {
          decks.push(formattedDeck);
          decks.sort((a, b) => a.localeCompare(b, 'id'));
          await kv.set('twi:master_decks', decks);
        }
      })()
    );
  }

  // B. Auto-save Skill dengan Pola & Anti-Duplikasi
  if (formattedSkill && formattedSkill !== '-') {
    tasks.push(
      (async () => {
        const rawSkills = await kv.get<any>('twi:master_skills');
        const skillsMap: Record<string, string> =
          rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills) ? rawSkills : {};

        // Jika skill sudah terdaftar, pakai kode yang sudah ada
        if (skillsMap[formattedSkill]) {
          generatedCode = skillsMap[formattedSkill];
          return;
        }

        // Generate singkatan baru
        const baseCode = generateBaseSkillCode(formattedSkill);
        const finalCode = resolveConflict(baseCode, formattedSkill, skillsMap);

        skillsMap[formattedSkill] = finalCode;
        generatedCode = finalCode;

        await kv.set('twi:master_skills', skillsMap);
      })()
    );
  }

  await Promise.allSettled(tasks);

  return {
    cleanDeck: formattedDeck || undefined,
    cleanSkill: formattedSkill || undefined,
    generatedCode,
  };
}
