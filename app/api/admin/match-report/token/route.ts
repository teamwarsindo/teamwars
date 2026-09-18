import { NextResponse } from 'next/server';
import { generateMatchToken, verifyMatchToken } from '@/app/admin/match-report/match-token';

// GET: Verifikasi token saat halaman editor dibuka via link wasit
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token tidak ada' }, { status: 400 });
  }

  const matchId = await verifyMatchToken(token);
  if (!matchId) {
    return NextResponse.json({ success: false, error: 'Token tidak sah atau sudah kedaluwarsa' }, { status: 401 });
  }

  return NextResponse.json({ success: true, matchId });
}

// POST: Buat link /t-:token khusus untuk dibagikan ke wasit
export async function POST(req: Request) {
  try {
    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Match ID wajib diisi' }, { status: 400 });
    }

    const token = await generateMatchToken(matchId);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
    const refereeUrl = `${origin}/t-${token}`;

    return NextResponse.json({ success: true, url: refereeUrl, token });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
