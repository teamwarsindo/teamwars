import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
import { AutocompleteContext, filterChoices } from './types';

export async function handleRosterAutocomplete(ctx: AutocompleteContext) {
  const { matchId, teamKey, campData, subName, fName, query } = ctx;

  const [teamData, reportData] = await Promise.all([
    kv.hgetall<any>(`teams:${campData.slug}`),
    kv.hget<any>('twi:match_reports', matchId),
  ]);

  const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];
  const existingLineup: any[] = reportData?.[teamKey]?.lineup || [];

  // 1. Tambah Pemain Baru (Add & Change Pemain Baru)
  if (
    (subName === 'add' && fName.startsWith('pemain_')) ||
    (subName === 'change' && fName === 'pemain_baru')
  ) {
    const existingIgnSet = new Set(
      existingLineup.map((p) => String(p.ign || '').toLowerCase().trim())
    );
    const available = teamRoster.filter(
      (p) => !existingIgnSet.has(String(p.ign || '').toLowerCase().trim())
    );

    return filterChoices(
      available,
      query,
      (p) => `${p.ign} (${p.idDuelLinks || '-'})`,
      (p) => `${p.ign} (${p.idDuelLinks || '-'})`,
      (p) => [p.ign, p.idDuelLinks || '']
    );
  }

  // 2. Pemain di Lineup Eksis (Edit & Change Pemain Lama)
  if (
    (subName === 'edit' && fName === 'pemain') ||
    (subName === 'change' && fName === 'pemain_lama')
  ) {
    if (existingLineup.length === 0) {
      return [
        {
          name: '⚠️ Lineup masih kosong! Daftarkan via "/submit add" dulu.',
          value: 'EMPTY_LINEUP',
        },
      ];
    }

    const rosterMap = new Map(teamRoster.map((p) => [(p.ign || '').toLowerCase().trim(), p]));
    const choices = existingLineup.map((p) => {
      const ign = p.ign || '';
      const dl = p.idDuelLinks || rosterMap.get(ign.toLowerCase().trim())?.idDuelLinks || '-';
      const d1 = Boolean(p.deck1?.archetype);
      const d2 = Boolean(p.deck2?.archetype);
      const badge = d1 && d2 ? '✅ (2/2)' : d1 || d2 ? '⚠️ (1/2)' : '⏳ (0/2)';
      return { ign, dl, label: `${ign} (${dl}) ${badge}`, val: `${ign} (${dl})` };
    });

    return filterChoices(
      choices,
      query,
      (c) => c.label,
      (c) => c.val,
      (c) => [c.ign, c.dl]
    );
  }

  return [];
        }
