import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { parsePlayers } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugA = searchParams.get('slugA') || '';
    const slugB = searchParams.get('slugB') || '';

    // Ambil data tim, master deck, dan master skill secara paralel dari KV
    const [teamA, teamB, rawDecks, rawSkills] = await Promise.all([
      slugA ? kv.hgetall<any>(`teams:${slugA}`) : null,
      slugB ? kv.hgetall<any>(`teams:${slugB}`) : null,
      kv.get<any>('twi:master_decks'),
      kv.get<any>('twi:master_skills'),
    ]);

    // 1. Parse daftar pemain dari hash tim
    const rosterA = teamA?.players ? parsePlayers(teamA.players) : [];
    const rosterB = teamB?.players ? parsePlayers(teamB.players) : [];

    // 2. Parse master deck list
    let masterDecks: string[] = [];
    if (Array.isArray(rawDecks)) {
      masterDecks = rawDecks;
    } else if (typeof rawDecks === 'string') {
      try {
        masterDecks = JSON.parse(rawDecks);
      } catch {
        masterDecks = [];
      }
    }

    // 3. Parse master skills map
    let masterSkills: Array<{ name: string; code: string; label: string }> = [];
    let skillsObj: Record<string, string> = {};
    if (rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills)) {
      skillsObj = rawSkills;
    } else if (typeof rawSkills === 'string') {
      try {
        skillsObj = JSON.parse(rawSkills);
      } catch {
        skillsObj = {};
      }
    }

    masterSkills = Object.entries(skillsObj).map(([name, code]) => ({
      name,
      code: code || '',
      label: code ? `${name} [${code}]` : name,
    }));

    return NextResponse.json({
      success: true,
      rosterA,
      rosterB,
      masterDecks,
      masterSkills,
    });
  } catch (error: any) {
    console.error('[META API ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
