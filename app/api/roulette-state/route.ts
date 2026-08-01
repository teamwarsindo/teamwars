import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_KEY_ROULETTE = 'twi:roulette_state';

export interface TeamItem {
  name: string;
  logo: string;
}

export interface RouletteState {
  remainingTeams: TeamItem[];
  groupA: TeamItem[];
  groupB: TeamItem[];
  // Data sync animasi live
  spinEvent?: {
    winningIndex: number;
    startTime: number; // Timestamp Date.now()
    durationMs: number; // Misal 4000ms
    targetGroup: "GROUP_A" | "GROUP_B";
  } | null;
}

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    let masterTeams: TeamItem[] = [];

    if (teamKeys && teamKeys.length > 0) {
      const rawTeams = await Promise.all(
        teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
      );

      masterTeams = rawTeams
        .filter((team): team is Record<string, any> => Boolean(team))
        .map((team) => ({
          name: team?.namaTim || team?.name || 'Unknown Team',
          logo: team?.logoTim || team?.logo || '/logo.webp',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);

    if (!currentState) {
      return NextResponse.json({
        masterTeams,
        remainingTeams: masterTeams,
        groupA: [],
        groupB: [],
        spinEvent: null,
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
    const { remainingTeams, groupA, groupB, spinEvent } = body;

    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams,
      groupA,
      groupB,
      spinEvent: spinEvent || null,
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
