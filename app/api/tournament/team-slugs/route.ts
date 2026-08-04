import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Preset default singkatan awal
const DEFAULT_SLUGS: Record<string, string> = {
  'asashin-og': 'asog',
  'blackrose': 'blrs',
  'ds-octagram': 'dsoc',
  'ds-sakurajima': 'dssk',
  'ds-xernobyl': 'dsxr',
  'final-chapter': 'fncp',
  'fpf-darkfall': 'fpfd',
  'fpf-fabulous': 'fpff',
  'kings-united': 'king',
  'licht-dracarys': 'lcdr',
  'licht-playground': 'lcpg',
  'licht-united': 'lcud',
  'nova-quasar': 'nvqs',
  'supernova': 'spnv',
  'true-god': 'tgod',
  'ux-dino-rampage': 'uxdr',
};

// GET: Ambil daftar singkatan dari KV Redis (atau inisialisasi default jika belum ada)
export async function GET() {
  try {
    let slugs = await kv.get<Record<string, string>>('twi:team-slugs');
    
    if (!slugs || Object.keys(slugs).length === 0) {
      await kv.set('twi:team-slugs', DEFAULT_SLUGS);
      slugs = DEFAULT_SLUGS;
    }

    return NextResponse.json({ success: true, slugs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Tambah / Update singkatan tim di KV Redis
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { teamSlug, abbreviation } = body; // misal: { teamSlug: 'ux-dino-rampage', abbreviation: 'uxdr' }

    if (!teamSlug || !abbreviation) {
      return NextResponse.json({ error: 'teamSlug dan abbreviation wajib diisi' }, { status: 400 });
    }

    const currentSlugs = (await kv.get<Record<string, string>>('twi:team-slugs')) || DEFAULT_SLUGS;
    currentSlugs[teamSlug.toLowerCase().trim()] = abbreviation.toLowerCase().trim();

    await kv.set('twi:team-slugs', currentSlugs);

    return NextResponse.json({ success: true, message: 'Singkatan berhasil disimpan ke Redis KV!', slugs: currentSlugs });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}