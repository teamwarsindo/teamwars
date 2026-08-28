import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getCurrentServerWeek,
  TWI_START_DATETIME,
} from '@/app/tournament/_library';
import { isValidSnowflake } from '@/lib/discord/utils';
import { DeckSubmissionStore } from '@/lib/discord/messages/match-briefing';

export interface StaffItem {
  discordId: string;
  discordName: string;
  assignMatch?: string[];
}

// 🟢 Baseline Resmi: Senin Pukul 08.00 WIB
const START_DATE_ENV = process.env.TWI_START_DATE || TWI_START_DATETIME;

function getMatchWeekNumber(matchDateIso: string): number {
  if (!matchDateIso) return 1;
  const matchDate = new Date(matchDateIso).getTime();
  const startDate = new Date(START_DATE_ENV).getTime();

  if (isNaN(matchDate) || isNaN(startDate)) return 1;

  // Dihitung berdasarkan interval 7 hari (168 jam) dari Senin 08.00 WIB
  const diffMs = matchDate - startDate;
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1);
}

// Helper sinkron dengan getCurrentServerWeek (Pukul 08.00 WIB)
function getCurrentWeekNumber(): number {
  return getCurrentServerWeek();
}

function formatWIBShort(isoString: string): string {
  if (!isoString) return 'TBA';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'TBA';
  const day = d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jakarta',
  });
  const time = d
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
    .replace('.', ':');
  return `${day} • ${time} WIB`;
}

// 🟢 1. AUTO-COMPLETE ASSIGN COMMAND
export async function handleAssignAutocomplete(interaction: any) {
  const options = interaction.data?.options || [];
  const focusedOption = options.find((opt: any) => opt.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const query = (focusedOption.value || '').toLowerCase();

  // A. AUTO-COMPLETE MATCH
  if (focusedOption.name === 'match') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (!schedules.length) return { type: 8, data: { choices: [] } };

    const schedulesWithWeek = schedules.map((m) => ({
      ...m,
      calculatedWeekNumber: m.weekNumber || getMatchWeekNumber(m.matchDate),
    }));

    const currentWeek = getCurrentWeekNumber();

    let activeWeekMatches = schedulesWithWeek.filter(
      (m) => m.calculatedWeekNumber === currentWeek
    );

    if (activeWeekMatches.length === 0) {
      activeWeekMatches = schedulesWithWeek.filter((m) => !m.isFinished);
    }

    const sortedByMatchId = activeWeekMatches.sort((a, b) => {
      const numA = parseInt(a.id.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    const choices = sortedByMatchId
      .filter((m) =>
        `${m.id} ${m.teamAName} vs ${m.teamBName}`.toLowerCase().includes(query)
      )
      .slice(0, 25)
      .map((m) => ({
        name: `[W${m.calculatedWeekNumber}] ${m.id.toUpperCase()}: ${m.teamAName} vs ${m.teamBName} (${formatWIBShort(m.matchDate)})`,
        value: m.id,
      }));

    return { type: 8, data: { choices } };
  }

  // B. AUTO-COMPLETE USER
  if (focusedOption.name === 'user') {
    const typeOption = options.find((opt: any) => opt.name === 'type')?.value;
    const kvKey = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
    const staffList = (await kv.get<StaffItem[]>(kvKey)) || [];

    const choices = staffList
      .filter(
        (s) =>
          isValidSnowflake(s.discordId) &&
          s.discordName.toLowerCase().includes(query)
      )
      .slice(0, 25)
      .map((s) => ({ name: s.discordName, value: s.discordId }));

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}

// 🟢 2. AUTO-COMPLETE RESCHEDULE COMMAND
export async function handleRescheduleAutocomplete(interaction: any) {
  const channelId = interaction.channel_id;
  const options = interaction.data?.options || [];
  const focusedOption = options.find((opt: any) => opt.focused);
  if (!focusedOption) return { type: 8, data: { choices: [] } };

  const query = (focusedOption.value || '').toLowerCase();

  if (focusedOption.name === 'tanggal') {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m) => (m as any).discordChannelId === channelId);

    if (!match) return { type: 8, data: { choices: [] } };

    const { getAvailableRescheduleSlots } = await import('@/app/tournament/_library/reschedule-helper');
    const availableSlots = getAvailableRescheduleSlots(schedules, match);

    const choices = availableSlots
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 25);

    return { type: 8, data: { choices } };
  }

  return { type: 8, data: { choices: [] } };
}

// 🟢 3. AUTO-COMPLETE MATCH REPORT COMMAND
export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const options = interaction.data?.options || [];
    const focusedOption = options.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toLowerCase();

    if (focusedOption.name === 'team') {
      const allTeamSlugs = (await kv.smembers('global:teams')) || [];
      const allTeams = await Promise.all(allTeamSlugs.map((slug) => kv.hgetall<any>(`teams:${slug}`)));
      const choices: Array<{ name: string; value: string }> = [];

      for (let i = 0; i < allTeamSlugs.length; i++) {
        const teamData = allTeams[i];
        const slug = allTeamSlugs[i];
        if (teamData && teamData.namaTim) {
          if (teamData.namaTim.toLowerCase().includes(query) || slug.toLowerCase().includes(query)) {
            choices.push({ name: teamData.namaTim, value: teamData.namaTim });
          }
        }
      }

      choices.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
      return { type: 8, data: { choices: choices.slice(0, 25) } };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error Match Report Autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// 🟢 4. AUTO-COMPLETE SUBMIT COMMAND (DISAMAKAN STRUKTURNYA)
export async function handleSubmitAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const options = interaction.data?.options || [];
    const focusedOption = options.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toLowerCase();

    // 1. Ambil seluruh data tim secara paralel
    const allTeamSlugs = (await kv.smembers('global:teams')) || [];
    const allTeams = await Promise.all(allTeamSlugs.map((slug) => kv.hgetall<any>(`teams:${slug}`)));

    let targetSlug: string | null = null;
    let targetTeam: any = null;

    // 2. Cari tim pemilik channel camp ini
    for (let i = 0; i < allTeamSlugs.length; i++) {
      const team = allTeams[i];
      if (
        team &&
        (team.channelCampId === channelId ||
          team.discordChannelId === channelId ||
          team.channelId === channelId)
      ) {
        targetSlug = allTeamSlugs[i];
        targetTeam = team;
        break;
      }
    }

    if (!targetSlug || !targetTeam?.players) {
      return { type: 8, data: { choices: [] } };
    }

    // 3. Parse data roster
    let players: any[] = [];
    if (typeof targetTeam.players === 'string') {
      try {
        players = JSON.parse(targetTeam.players);
      } catch {
        players = [];
      }
    } else if (Array.isArray(targetTeam.players)) {
      players = targetTeam.players;
    }

    // 4. Sembunyikan pemain yang sudah tercatat submit
    const submissionKey = `match:decks:${targetSlug}`;
    const store = (await kv.get<DeckSubmissionStore>(submissionKey)) || {
      matchId: '',
      teamSlug: targetSlug,
      submittedPlayers: [],
      totalDecks: 0,
    };
    const alreadySubmitted = (store.submittedPlayers || []).map((p) => p.name.toLowerCase());

    const availablePlayers = players.filter(
      (p) => p.ign && !alreadySubmitted.includes(String(p.ign).toLowerCase())
    );

    // 5. Kembalikan opsi IGN murni
    const choices = availablePlayers
      .filter((p) => String(p.ign).toLowerCase().includes(query))
      .slice(0, 25)
      .map((p) => ({
        name: String(p.ign),
        value: String(p.ign),
      }));

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error Submit Autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}