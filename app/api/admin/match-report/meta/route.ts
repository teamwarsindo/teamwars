import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugA = searchParams.get('slugA') || '';
    const slugB = searchParams.get('slugB') || '';

    // Ambil data tim, free duelists, master decks, dan master skills
    const [teamA, teamB, rawFreeDuelists, rawDecks, rawSkills] = await Promise.all([
      slugA ? kv.hgetall<any>(`teams:${slugA}`) : null,
      slugB ? kv.hgetall<any>(`teams:${slugB}`) : null,
      kv.hgetall<Record<string, any>>('global:free_duelists'),
      kv.get<any>('twi:master_decks'),
      kv.get<any>('twi:master_skills'),
    ]);

    // 1. Roster Aktif
    const activeRosterA: PlayerItem[] = teamA?.players ? parsePlayers(teamA.players) : [];
    const activeRosterB: PlayerItem[] = teamB?.players ? parsePlayers(teamB.players) : [];

    // 2. Mantan Pemain yang Dikeluarkan (Filter berdasarkan lastTeam === slug)
    const releasedList: Array<{ ign: string; idDuelLinks: string; lastTeam: string }> = [];
    if (rawFreeDuelists) {
      Object.values(rawFreeDuelists).forEach((val) => {
        try {
          const item = typeof val === 'string' ? JSON.parse(val) : val;
          if (item && item.ign) {
            releasedList.push({
              ign: item.ign,
              idDuelLinks: item.idDuelLinks || '-',
              lastTeam: String(item.lastTeam || '').toLowerCase().trim(),
            });
          }
        } catch {
          // Abaikan item invalid
        }
      });
    }

    const releasedA = releasedList.filter((p) => p.lastTeam === slugA.toLowerCase().trim());
    const releasedB = releasedList.filter((p) => p.lastTeam === slugB.toLowerCase().trim());

    // 3. Gabungkan: Roster Aktif + Mantan Pemain
    // Beri label/flag status agar di dropdown bisa dipisahkan dengan jelas
    const combineRoster = (active: PlayerItem[], released: typeof releasedList) => {
      const combined: Array<{ ign: string; idDuelLinks: string; isReleased?: boolean }> = [];
      const ignSeen = new Set<string>();

      active.forEach((p) => {
        combined.push({
          ign: p.ign,
          idDuelLinks: p.idDuelLinks || '-',
          isReleased: false,
        });
        ignSeen.add(p.ign.toLowerCase());
      });

      released.forEach((p) => {
        if (!ignSeen.has(p.ign.toLowerCase())) {
          combined.push({
            ign: p.ign,
            idDuelLinks: p.idDuelLinks || '-',
            isReleased: true,
          });
          ignSeen.add(p.ign.toLowerCase());
        }
      });

      return combined;
    };

    const rosterA = combineRoster(activeRosterA, releasedA);
    const rosterB = combineRoster(activeRosterB, releasedB);

    // 4. Parse Decks
    let masterDecks: string[] = [];
    if (Array.isArray(rawDecks)) {
      masterDecks = rawDecks;
    } else if (typeof rawDecks === 'string') {
      try { masterDecks = JSON.parse(rawDecks); } catch { masterDecks = []; }
    }

    // 5. Parse Skills
    let masterSkills: Array<{ name: string; code: string; label: string }> = [];
    let skillsObj: Record<string, string> = {};
    if (rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills)) {
      skillsObj = rawSkills;
    } else if (typeof rawSkills === 'string') {
      try { skillsObj = JSON.parse(rawSkills); } catch { skillsObj = {}; }
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
