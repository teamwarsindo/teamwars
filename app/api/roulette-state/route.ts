import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_KEY_ROULETTE = 'twi:roulette_state';

export interface TeamItem {
  name: string;
  logo: string;
}

export async function GET() {
  try {
    // 1. Ambil semua key tim yang diawali "teams:" dari Vercel KV
    const teamKeys = await kv.keys('teams:*');
    let masterTeams: TeamItem[] = [];

    if (teamKeys && teamKeys.length > 0) {
      // Ambil seluruh data tim secara paralel
      const rawTeams = await Promise.all(
        teamKeys.map((key) => kv.get<any>(key))
      );

      // Mapping data menggunakan properti namaTim dan logoTim
      masterTeams = rawTeams
        .filter(Boolean)
        .map((team) => ({
          name: team.namaTim || team.name || 'Unknown Team',
          logo: team.logoTim || team.logo || '/logo.webp',
        }));
    }

    // 2. Ambil state pengundian roulette saat ini dari Vercel KV
    const currentState = await kv.get<{
      remainingTeams: TeamItem[];
      groupA: TeamItem[];
      groupB: TeamItem[];
    }>(KV_KEY_ROULETTE);

    // Jika roulette belum pernah di-spin, kembalikan masterTeams sebagai sisa tim
    if (!currentState) {
      return NextResponse.json({
        masterTeams,
        remainingTeams: masterTeams,
        groupA: [],
        groupB: [],
      });
    }

    return NextResponse.json({
      masterTeams,
      ...currentState,
    });
  } catch (error) {
    console.error('Error GET Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remainingTeams, groupA, groupB } = body;

    // Simpan progres pengundian terbaru ke Vercel KV
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams,
      groupA,
      groupB,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error POST Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Menghapus hanya state pengundian roulette (data tim asli di `teams:*` TETAP AMAN)
    await kv.del(KV_KEY_ROULETTE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
