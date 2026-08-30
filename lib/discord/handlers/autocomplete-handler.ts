import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/services/staff-assignment';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';

// ============================================================================
// 1. REUSABLE INTERNAL HELPERS
// ============================================================================

const getSchedules = async (): Promise<MatchScheduleItem[]> =>
  (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

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

function isToday(dateIso?: string): boolean {
  if (!dateIso) return false;
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const match = new Date(dateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return now === match;
}

async function resolveMatchCamp(channelId: string) {
  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.campA?.channelId === channelId) return { matchId, teamKey: 'teamA' as const, campData: data.campA };
    if (data.campB?.channelId === channelId) return { matchId, teamKey: 'teamB' as const, campData: data.campB };
  }
  return { matchId: null, teamKey: null, campData: null };
}

function filterChoices<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getValue: (item: T) => string,
  matchFn?: (item: T) => string[]
) {
  const q = query.toLowerCase();
  return items
    .filter((item) => {
      const matchTargets = matchFn ? matchFn(item) : [getLabel(item), getValue(item)];
      return matchTargets.some((t) => t.toLowerCase().includes(q));
    })
    .slice(0, 25)
    .map((item) => ({ name: getLabel(item), value: getValue(item) }));
}

// ============================================================================
// 2. AUTOCOMPLETE HANDLERS
// ============================================================================

// ----------------------------------------------------
// A. SUBMIT (Subcommands: add, change, edit)
// ----------------------------------------------------
export async function handleSubmitAutocomplete(interaction: any) {
  try {
    const { matchId, teamKey, campData } = await resolveMatchCamp(interaction.channel_id);
    if (!matchId || !campData?.slug) return { type: 8, data: { choices: [] } };

    const [schedules, teamRoster, reportData] = await Promise.all([
      getSchedules(),
      getTeamPlayers(campData.slug),
      kv.get<any>(`match:report:${matchId}`),
    ]);

    const currentMatch = schedules.find((m) => m.id === matchId);
    if (!currentMatch || currentMatch.isFinished || !isToday(currentMatch.matchDate)) {
      return { type: 8, data: { choices: [] } };
    }

    const rawOptions = interaction.data?.options || [];
    const subCommand = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subName = subCommand?.name || 'add';
    const focused = (subCommand ? subCommand.options || [] : rawOptions).find((o: any) => o.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const fName = focused.name;
    const rawVal = String(focused.value || '').trim();
    const query = rawVal.toLowerCase();
    const existingLineup: any[] = reportData?.[teamKey]?.lineup || [];

    // 1. Master Deck / Archetype
    if (fName.startsWith('deck_') || fName === 'deck') {
      const masterDecks = await getMasterDecks();
      const choices = filterChoices(masterDecks, query, (d) => d, (d) => d);
      
      if (rawVal && !masterDecks.some((d) => d.toLowerCase() === query)) {
        choices.unshift({ 
          name: `➕ Tambah Deck "${rawVal}"`, 
          value: rawVal 
        });
      }
      return { type: 8, data: { choices: choices.slice(0, 25) } };
    }

    // 2. Master Skill (Dengan Tampilan & Pencarian Singkatan [KODE])
    if (fName.startsWith('skill_') || fName === 'skill') {
      const skillsMap = await getMasterSkillsMap();
      const skillEntries = Object.entries(skillsMap).map(([name, code]) => ({
        fullName: name,
        code: code || '',
        displayLabel: code ? `${name} [${code}]` : name,
      }));

      const filtered = skillEntries
        .filter((item) => {
          return (
            item.fullName.toLowerCase().includes(query) ||
            item.code.toLowerCase().includes(query)
          );
        })
        .slice(0, 25)
        .map((item) => ({
          name: item.displayLabel,
          value: item.fullName,
        }));

      if (rawVal && !skillEntries.some((s) => s.fullName.toLowerCase() === query || s.code.toLowerCase() === query)) {
        // Panduan custom input jika belum ada di database
        const helperGuide = !rawVal.includes('(') && !rawVal.includes('[') ? ` [KODE]` : '';
        filtered.unshift({
          name: `➕ Tambah Skill "${rawVal}${helperGuide}"`,
          value: rawVal,
        });
      }

      return { type: 8, data: { choices: filtered.slice(0, 25) } };
    }

    // 3. Lineup Pemain (Edit / Change: Pemain Lama)
    if ((subName === 'edit' && fName === 'pemain') || (subName === 'change' && fName === 'pemain_lama')) {
      const rosterMap = new Map(teamRoster.map((p) => [(p.ign || '').toLowerCase(), p]));
      const choices = existingLineup.map((p) => {
        const ign = p.ign || p.name || '';
        const dl = p.idDuelLinks || rosterMap.get(ign.toLowerCase())?.idDuelLinks || '-';
        const d1 = Boolean(p.deck1?.archetype);
        const d2 = Boolean(p.deck2?.archetype);
        const badge = d1 && d2 ? '✅ (2/2)' : d1 || d2 ? '⚠️ (1/2)' : '⏳ (0/2)';
        return { ign, dl, label: `${ign} (${dl}) ${badge}` };
      });

      return {
        type: 8,
        data: {
          choices: filterChoices(choices, query, (c) => c.label, (c) => c.ign, (c) => [c.ign, c.dl]),
        },
      };
    }

    // 4. Roster Pemain Baru (Add: Pemain 1-5 / Change: Pemain Baru)
    if (fName.startsWith('pemain')) {
      const submitted = existingLineup.map((p) => String(p.ign || p.name || '').toLowerCase());
      const available = teamRoster.filter((p) => !submitted.includes((p.ign || '').toLowerCase()));
      return {
        type: 8,
        data: {
          choices: filterChoices(available, query, (p) => `${p.ign} (${p.idDuelLinks || '-'})`, (p) => p.ign, (p) => [p.ign || '', p.idDuelLinks || '']),
        },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handleSubmitAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// B. TRANSFER
// ----------------------------------------------------
export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    let teamSlug = await kv.hget<string>('global:channel_teams', channelId);
    if (!teamSlug) {
      teamSlug = await kv.hget<string>('global:discord_ids', interaction.member?.user?.id);
    }
    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const focused = (interaction.data?.options?.[0]?.options || interaction.data?.options || []).find((o: any) => o.focused);
    if (!focused || focused.name !== 'user') return { type: 8, data: { choices: [] } };

    const players = await getTeamPlayers(teamSlug);
    return {
      type: 8,
      data: {
        choices: filterChoices(
          players,
          focused.value || '',
          (p) => `${p.ign} (${p.idDuelLinks || '-'}) - ${p.role || 'Anggota'}`,
          (p) => p.discordId || p.discord || p.ign,
          (p) => [p.ign || '', p.idDuelLinks || '', p.discord || '']
        ),
      },
    };
  } catch (error) {
    console.error('Error transfer autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// C. ASSIGN & UNASSIGN
// ----------------------------------------------------
export async function handleAssignAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const typeOption = interaction.data?.options?.find((opt: any) => opt.name === 'type')?.value;
    const query = String(focused.value || '');

    if (focused.name === 'match') {
      const schedules = await getSchedules();
      const activeMatches = schedules.filter((m) => !m.isFinished && m.discordChannelId);
      const activeWeek = activeMatches.length > 0 ? Math.min(...activeMatches.map((m) => m.weekNumber || 1)) : null;

      const filtered = schedules.filter((m) => {
        if (m.isFinished || !m.discordChannelId || (activeWeek !== null && (m.weekNumber || 1) !== activeWeek)) return false;
        if (interaction.data?.name === 'unassign') {
          return typeOption === 'REFEREE' ? Boolean(m.refereeDiscordId) : Boolean(m.streamerDiscordId);
        }
        return true;
      });

      return {
        type: 8,
        data: {
          choices: filterChoices(
            filtered,
            query,
            (m) => `${m.id}: ${m.teamAName} vs ${m.teamBName}`,
            (m) => m.id,
            (m) => [m.id, m.teamAName, m.teamBName]
          ),
        },
      };
    }

    if (focused.name === 'user') {
      const staffList = (await kv.get<StaffItem[]>(typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees')) || [];
      const sorted = [...staffList].sort((a, b) => a.discordName.localeCompare(b.discordName, 'id', { sensitivity: 'base' }));

      return {
        type: 8,
        data: {
          choices: filterChoices(sorted, query, (s) => s.discordName, (s) => s.discordId),
        },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// D. RESCHEDULE
// ----------------------------------------------------
export async function handleRescheduleAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused || focused.name !== 'tanggal') return { type: 8, data: { choices: [] } };

    const schedules = await getSchedules();
    const current = schedules.find((m) => m.discordChannelId === interaction.channel_id);
    const currDate = current ? new Date(current.matchDate) : new Date();

    const allowedDays = [3, 4, 5, 6, 0]; // Rabu s/d Minggu
    const dates: { name: string; value: string }[] = [];

    for (let i = -7; i <= 14 && dates.length < 25; i++) {
      const d = new Date(currDate);
      d.setDate(d.getDate() + i);
      if (allowedDays.includes(d.getDay())) {
        const val = d.toISOString().split('T')[0];
        const name = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
        dates.push({ name, value: val });
      }
    }

    return {
      type: 8,
      data: {
        choices: filterChoices(dates, focused.value || '', (d) => d.name, (d) => d.value),
      },
    };
  } catch (error) {
    console.error('Error reschedule autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// E. MATCH REPORT
// ----------------------------------------------------
export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const schedules = await getSchedules();
    const teams = Array.from(new Set(schedules.flatMap((m) => [m.teamAName, m.teamBName]).filter(Boolean)));

    return {
      type: 8,
      data: {
        choices: filterChoices(teams, focused.value || '', (t) => t, (t) => t),
      },
    };
  } catch (error) {
    console.error('Error match report autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
                                                    }
