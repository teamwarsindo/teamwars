import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KODE_TIM_MAPPING: Record<string, string> = {
  'asashin-og': 'aog',
  'blackrose': 'blr',
  'ds-octagram': 'dso',
  'ds-sakurajima': 'dss',
  'ds-xernobyl': 'dsx',
  'final-chapter': 'fcp',
  'fpf-darkfall': 'fpfd',
  'fpf-fabulous': 'fpff',
  'kings-united': 'king',
  'licht-dracarys': 'ldr',
  'licht-playground': 'lpg',
  'licht-united': 'lut',
  'nova-quasar': 'nqs',
  'supernova': 'spv',
  'true-god': 'tgod',
  'ux-dino-rampage': 'uxdr',
};

export async function GET() {
  try {
    const results = [];

    for (const [slug, kodeTim] of Object.entries(KODE_TIM_MAPPING)) {
      const key = `teams:${slug}`;
      // Tambahkan field kodeTim ke Hash KV Redis
      await kv.hset(key, { kodeTim });
      results.push({ key, kodeTim });
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil menginjeksi field kodeTim ke seluruh Hash tim di Redis!',
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}