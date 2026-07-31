import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(req: Request) {
  try {
    // 1. Ambil seluruh nama key menggunakan perintah KEYS '*'
    const keys = await kv.keys('*');

    if (!keys || keys.length === 0) {
      return NextResponse.json({
        success: true,
        totalKeys: 0,
        keys: [],
        message: 'Tidak ada key tersimpan di Vercel KV / Redis.',
      });
    }

    // 2. Ambil informasi Tipe Data dan Nilai/Detail dari setiap key secara paralel
    const keysDetails = await Promise.all(
      keys.map(async (key) => {
        const type = await kv.type(key);
        const value = await kv.get(key);

        return {
          key,
          type,
          value,
        };
      })
    );

    return NextResponse.json({
      success: true,
      totalKeys: keys.length,
      keys: keysDetails,
    });
  } catch (error) {
    console.error('Error fetching Redis keys:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
