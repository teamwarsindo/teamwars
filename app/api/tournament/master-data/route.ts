import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_KEY_DECKS = 'twi:master_decks';
const KV_KEY_SKILLS = 'twi:master_skills';

// Default Seeding jika KV masih kosong
const DEFAULT_DECKS = [
  'Blue-Eyes',
  'HERO',
  'Tachyon',
  'Tenyi',
  'Unchained',
  'Shaddoll',
  'Fleur',
  'Performage',
  'Borrel',
  'Sunavalon',
  'Red-Eyes',
  'Cyber Dragon',
  'Dark Magician',
];

const DEFAULT_SKILLS = [
  'Destiny Draw',
  'Tachyon Dragon Dominance',
  'Battle Chronicle',
  'Archive Skill: Shaddoll',
  'Revolution des Fleurs',
  'Borrel Link',
  'Three Burst Shot',
  'A Trick Up the Sleeve',
];

export async function GET() {
  try {
    let decks = await kv.get<string[]>(KV_KEY_DECKS);
    let skills = await kv.get<string[]>(KV_KEY_SKILLS);

    // Auto-seed default data jika KV kosong
    if (!decks || decks.length === 0) {
      decks = DEFAULT_DECKS;
      await kv.set(KV_KEY_DECKS, decks);
    }

    if (!skills || skills.length === 0) {
      skills = DEFAULT_SKILLS;
      await kv.set(KV_KEY_SKILLS, skills);
    }

    // Urutkan alfabetis
    decks.sort((a, b) => a.localeCompare(b));
    skills.sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ success: true, decks, skills });
  } catch (error) {
    console.error('Error GET Master Data:', error);
    return NextResponse.json({ error: 'Gagal mengambil master data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, newItem } = body; // type: 'DECK' | 'SKILL'

    if (!newItem || typeof newItem !== 'string' || !newItem.trim()) {
      return NextResponse.json({ error: 'Nama item tidak boleh kosong' }, { status: 400 });
    }

    const cleanItem = newItem.trim();

    if (type === 'DECK') {
      let decks = (await kv.get<string[]>(KV_KEY_DECKS)) || DEFAULT_DECKS;
      const exists = decks.some((d) => d.toLowerCase() === cleanItem.toLowerCase());

      if (!exists) {
        decks.push(cleanItem);
        decks.sort((a, b) => a.localeCompare(b));
        await kv.set(KV_KEY_DECKS, decks);
      }
      return NextResponse.json({ success: true, decks });
    }

    if (type === 'SKILL') {
      let skills = (await kv.get<string[]>(KV_KEY_SKILLS)) || DEFAULT_SKILLS;
      const exists = skills.some((s) => s.toLowerCase() === cleanItem.toLowerCase());

      if (!exists) {
        skills.push(cleanItem);
        skills.sort((a, b) => a.localeCompare(b));
        await kv.set(KV_KEY_SKILLS, skills);
      }
      return NextResponse.json({ success: true, skills });
    }

    return NextResponse.json({ error: 'Tipe master data tidak dikenal' }, { status: 400 });
  } catch (error) {
    console.error('Error POST Master Data:', error);
    return NextResponse.json({ error: 'Gagal memperbarui master data' }, { status: 500 });
  }
}