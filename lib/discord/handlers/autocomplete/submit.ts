import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
import { filterChoices, isToday } from './types';

const getTeamPlayers = async (slug: string): Promise<PlayerItem[]> => {
  const team = await kv.hgetall<any>(`teams:${slug}`);
  return team?.players ? parsePlayers(team.players) : [];
};

const getMasterDecks = async (): Promise<string[]> => {
  const raw = await kv.get<any>('twi:master_decks');
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getMasterSkillsMap = async (): Promise<Record<string, string>> => {
  const raw = await kv.get<any>('twi:master_skills');
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

async function resolveMatchCamp(channelId: string) {
  const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);
  if (!activeCamp || !activeCamp.matchId || !activeCamp.teamKey) {
    return { matchId: null, teamKey: null, campData: null };
  }
  if (!isToday(activeCamp.matchDate)) {
    return { matchId: null, teamKey: null, campData: null };
  }
  return {
    matchId: activeCamp.matchId as string,
    teamKey: activeCamp.teamKey as 'teamA' | 'teamB',
    campData: activeCamp,
  };
}

export async function handleSubmitAutocomplete(interaction: any) {
  try {
    const { matchId, teamKey, campData } = await resolveMatchCamp(interaction.channel_id);
    if (!matchId || !campData?.slug) return { type: 8, data: { choices: [] } };

    const [teamRoster, reportData] = await Promise.all([
      getTeamPlayers(campData.slug),
      kv.hget<any>('twi:match_reports', matchId),
    ]);

    if (reportData?.isFinished) return { type: 8, data: { choices: [] } };

    const rawOptions = interaction.data?.options || [];
    const subCommand = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subName = subCommand?.name || 'add';
    const focused = (subCommand ? subCommand.options || [] : rawOptions).find((o: any) => o.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const fName = focused.name;
    const rawVal = String(focused.value || '').trim();
    const query = rawVal.toLowerCase();
    const existingLineup: any[] = reportData?.[teamKey]?.lineup || [];

    // Master Deck
    if (fName.startsWith('deck_') || fName === 'deck') {
      const masterDecks = await getMasterDecks();
      const choices = filterChoices(masterDecks, query, (d) => d, (d) => d);
      if (rawVal && !masterDecks.some((d) => d.toLowerCase() === query)) {
        choices.unshift({ name: `➕ Tambah Deck "${rawVal}"`, value: rawVal });
      }
      return { type: 8, data: { choices: choices.slice(0, 25) } };
    }

    // Master Skill
    if (fName.startsWith('skill_') || fName === 'skill') {
      const skillsMap = await getMasterSkillsMap();
      const skillEntries = Object.entries(skillsMap).map(([name, code]) => ({
        fullName: name,
        code: code || '',
        displayLabel: code ? `${name} [${code}]` : name,
      }));

      const filtered = skillEntries
        .filter((item) => item.fullName.toLowerCase().includes(query) || item.code.toLowerCase().includes(query))
        .slice(0, 25)
        .map((item) => ({ name: item.displayLabel, value: item.fullName }));

      if (rawVal && !skillEntries.some((s) => s.fullName.toLowerCase() === query || s.code.toLowerCase() === query)) {
        filtered.unshift({ name: `➕ Tambah Skill "${rawVal}"`, value: rawVal });
      }
      return { type: 8, data: { choices: filtered.slice(0, 25) } };
    }

    // Lineup Pemain (Edit / Change Pemain Lama)
    if ((subName === 'edit' && fName === 'pemain') || (subName === 'change' && fName === 'pemain_lama')) {
      if (existingLineup.length === 0) {
        return {
          type: 8,
          data: {
            choices: [{ name: '⚠️ Lineup masih kosong! Gunakan "/submit add" terlebih dahulu.', value: 'EMPTY_LINEUP' }],
          },
        };
      }

      const rosterMap = new Map(teamRoster.map((p) => [(p.ign || '').toLowerCase(), p]));
      const choices = existingLineup.map((p) => {
        const ign = p.ign || '';
        const dl = p.idDuelLinks || rosterMap.get(ign.toLowerCase())?.idDuelLinks || '-';
        const d1 = Boolean(p.deck1?.archetype);
        const d2 = Boolean(p.deck2?.archetype);
        const badge = d1 && d2 ? '✅ (2/2)' : d1 || d2 ? '⚠️ (1/2)' : '⏳ (0/2)';
        return { ign, dl, label: `${ign} (${dl}) ${badge}` };
      });

      return {
        type: 8,
        data: { choices: filterChoices(choices, query, (c) => c.label, (c) => c.ign, (c) => [c.ign, c.dl]) },
      };
    }

    // Roster Pemain Baru (Add 1-5 / Change Pemain Baru)
    if (fName.startsWith('pemain')) {
      const submitted = existingLineup.map((p) => String(p.ign || '').toLowerCase());
      const available = teamRoster.filter((p) => !submitted.includes((p.ign || '').toLowerCase()));
      return {
        type: 8,
        data: {
          choices: filterChoices(
            available,
            query,
            (p) => `${p.ign} (${p.idDuelLinks || '-'})`,
            (p) => `${p.ign} (${p.idDuelLinks || '-'})`,
            (p) => [p.ign || '', p.idDuelLinks || '']
          ),
        },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handleSubmitAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
                   }
