import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Ambil hanya list nama key-nya saja
    const keys = await kv.keys('*');

    return NextResponse.json({
      success: true,
      total: keys.length,
      keys: keys, // Contoh output: ["twi:teams_list", "twi:roulette_state", "msg_reminder:ch_match"]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
