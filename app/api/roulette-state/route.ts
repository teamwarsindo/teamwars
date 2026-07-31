import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Key KV yang menyimpan daftar tim pendaftaran resmi & state pengundian
const KV_KEY_TEAMS = 'twi:teams_list'; // Sesuaikan key ini jika nama key list tim kamu berbeda
const KV_KEY_ROULETTE = 'twi:roulette_state';

export interface TeamItem {
  name: string;
  logo: string;
}

export async function GET() {
  try {
    // 1. Murni ambil daftar tim resmi langsung dari Vercel KV
    const masterTeams = (await kv.get<TeamItem[]>(KV_KEY_TEAMS)) || [];

    // 2. Ambil state pengundian roulette saat ini dari Vercel KV
    const currentState = await kv.get<{
      remainingTeams: TeamItem[];
      groupA: TeamItem[];
      groupB: TeamItem[];
    }>(KV_KEY_ROULETTE);

    // Jika belum pernah di-spin, kembalikan masterTeams sebagai sisa tim awal
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

    // Simpan progres pengundian terbaru ke KV
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
    // Menghapus hanya state pengundian roulette (data master tim di KV_KEY_TEAMS tetap aman)
    await kv.del(KV_KEY_ROULETTE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
