import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_KEY_ROULETTE = 'twi:roulette_state';
const KV_KEY_TEAMS = 'twi:teams_list'; // Key di KV yang berisi array objek { name, logo }

// Dummy default tim jika di KV belum diset sama sekali
const DEFAULT_TEAMS = [
  { name: 'GOD', logo: '/logos/god.png' },
  { name: 'CHAM', logo: '/logos/cham.png' },
  { name: 'STAR', logo: '/logos/star.png' },
  { name: 'NEXUS', logo: '/logos/nexus.png' },
  { name: 'VALOR', logo: '/logos/valor.png' },
  { name: 'ECLIPSE', logo: '/logos/eclipse.png' },
  { name: 'PHOENIX', logo: '/logos/phoenix.png' },
  { name: 'HYDRA', logo: '/logos/hydra.png' },
  { name: 'TITAN', logo: '/logos/titan.png' },
  { name: 'APEX', logo: '/logos/apex.png' },
];

export interface TeamItem {
  name: string;
  logo: string;
}

export async function GET() {
  try {
    // 1. Ambil daftar tim terdaftar dari KV (jika kosong, gunakan DEFAULT_TEAMS)
    let masterTeams = await kv.get<TeamItem[]>(KV_KEY_TEAMS);
    if (!masterTeams || masterTeams.length === 0) {
      masterTeams = DEFAULT_TEAMS;
    }

    // 2. Ambil state pengundian saat ini
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

    // Simpan state pengundian ke Vercel KV
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
    // Hapus data pengundian dari KV untuk reset
    await kv.del(KV_KEY_ROULETTE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
