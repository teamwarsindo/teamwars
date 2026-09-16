import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugA = searchParams.get('slugA') || '';
    const slugB = searchParams.get('slugB') || '';

    const [teamA, teamB, rawFreeDuelists, rawDecks, rawSkills, rawMasterArch] = await Promise.all([
      slugA ? kv.hgetall<any>(`teams:${slugA}`) : null,
      slugB ? kv.hgetall<any>(`teams:${slugB}`) : null,
      kv.hgetall<Record<string, any>>('global:free_duelists'),
      kv.get<any>('twi:master_decks'),
      kv.get<any>('twi:master_skills'),
      kv.get<any>('twi:master-archetypes'),
    ]);

    // 1. Roster Aktif
    const activeRosterA: PlayerItem[] = teamA?.players ? parsePlayers(teamA.players) : [];
    const activeRosterB: PlayerItem[] = teamB?.players ? parsePlayers(teamB.players) : [];

    // 2. Free Duelists / Released
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
        } catch {}
      });
    }

    const releasedA = releasedList.filter((p) => p.lastTeam === slugA.toLowerCase().trim());
    const releasedB = releasedList.filter((p) => p.lastTeam === slugB.toLowerCase().trim());

    const combineRoster = (active: PlayerItem[], released: typeof releasedList) => {
      const combined: Array<{ ign: string; idDuelLinks: string; isReleased?: boolean }> = [];
      const seen = new Set<string>();

      active.forEach((p) => {
        combined.push({ ign: p.ign, idDuelLinks: p.idDuelLinks || '-', isReleased: false });
        seen.add(p.ign.toLowerCase());
      });

      released.forEach((p) => {
        if (!seen.has(p.ign.toLowerCase())) {
          combined.push({ ign: p.ign, idDuelLinks: p.idDuelLinks || '-', isReleased: true });
          seen.add(p.ign.toLowerCase());
        }
      });

      return combined;
    };

    // 3. Decks & Skills
    const masterDecks: string[] = Array.isArray(rawDecks)
      ? rawDecks
      : typeof rawDecks === 'string' ? JSON.parse(rawDecks) : [];

    let skillsObj: Record<string, string> = {};
    if (rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills)) {
      skillsObj = rawSkills;
    } else if (typeof rawSkills === 'string') {
      try { skillsObj = JSON.parse(rawSkills); } catch {}
    }

    const masterSkills = Object.entries(skillsObj).map(([name, code]) => ({
      name,
      code: code || '',
      label: code ? `${name} [${code}]` : name,
    }));

    const masterArchetypes: string[] = Array.isArray(rawMasterArch)
      ? rawMasterArch
      : typeof rawMasterArch === 'string' ? JSON.parse(rawMasterArch) : [];

    return NextResponse.json({
      success: true,
      rosterA: combineRoster(activeRosterA, releasedA),
      rosterB: combineRoster(activeRosterB, releasedB),
      masterDecks,
      masterSkills,
      masterArchetypes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
