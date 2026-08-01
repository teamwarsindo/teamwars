import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_KEY_ROULETTE = 'twi:roulette_state';

export interface TeamItem {
  name: string;
  logo: string;
}

export async function GET() {
  try {
    // 1. Ambil semua key yang diawali "teams:" dari Vercel KV
    const teamKeys = await kv.keys('teams:*');
    let masterTeams: TeamItem[] = [];

    if (teamKeys && teamKeys.length > 0) {
      // 2. Ambil data dengan kv.hgetall() secara paralel
      const rawTeams = await Promise.all(
        teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
      );

      // 3. Filter data non-null dan tambahkan Optional Chaining (?.)
      masterTeams = rawTeams
        .filter((team): team is Record<string, any> => Boolean(team))
        .map((team) => ({
          name: team?.namaTim || team?.name || 'Unknown Team',
          logo: team?.logoTim || team?.logo || '/logo.webp',
        }))
        // Urutkan secara alfabetis berdasarkan nama tim
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // 4. Ambil state pengundian roulette dari KV
    const currentState = await kv.get<{
      remainingTeams: TeamItem[];
      groupA: TeamItem[];
      groupB: TeamItem[];
    }>(KV_KEY_ROULETTE);

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
    await kv.del(KV_KEY_ROULETTE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
