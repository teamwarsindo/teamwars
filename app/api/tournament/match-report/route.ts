import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'matchId diperlukan' }, { status: 400 });
    }

    const reportData = await kv.hget<any>('twi:match_reports', matchId);

    if (!reportData) {
      return NextResponse.json({ error: 'Report data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (err: any) {
    console.error('Error fetching match report:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
