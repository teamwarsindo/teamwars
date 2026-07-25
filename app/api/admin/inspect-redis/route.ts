import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // 1. Ambil SEMUA key yang ada di Vercel KV
    const keys = await kv.keys('*');

    const dbSnapshot: Record<string, any> = {};

    // 2. Looping setiap key untuk mengecek tipe dan isinya
    for (const key of keys) {
      const type = await kv.type(key);

      try {
        if (type === 'string') {
          // Jika tipe datanya String biasa
          dbSnapshot[key] = { type, value: await kv.get(key) };
        } else if (type === 'hash') {
          // Jika tipe datanya Hash (biasanya untuk object Team)
          dbSnapshot[key] = { type, value: await kv.hgetall(key) };
        } else if (type === 'set') {
          // Jika tipe datanya Set (biasanya untuk list Discord/IGN global)
          dbSnapshot[key] = { type, value: await kv.smembers(key) };
        } else if (type === 'list') {
          // Jika tipe datanya List
          dbSnapshot[key] = { type, value: await kv.lrange(key, 0, -1) };
        } else {
          dbSnapshot[key] = { type, value: '[Tipe data tidak didukung untuk inspect]' };
        }
      } catch (err: any) {
        dbSnapshot[key] = { type, error: err.message };
      }
    }

    // 3. Kembalikan semua data mentah ke browser
    return NextResponse.json({
      success: true,
      totalKeys: keys.length,
      data: dbSnapshot,
    });
  } catch (error: any) {
    console.error('Inspect Redis Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
