import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/services/staff-assignment';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';

// ============================================================================
// 1. REUSABLE INTERNAL HELPERS
// ============================================================================

// Helper membaca seluruh jadwal dari KV
async function getSchedulesFromKV(): Promise<MatchScheduleItem[]> {
  try {
    return (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  } catch {
    return [];
  }
}

// Helper membaca & mem-parse roster tim dari KV
async function getTeamPlayersBySlug(teamSlug: string): Promise<PlayerItem[]> {
  try {
    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return [];
    return parsePlayers(teamData.players);
  } catch {
    return [];
  }
}

// Helper validasi apakah pertandingan berlangsung pada HARI INI (Zona Waktu WIB)
function isMatchScheduledForToday(matchDateIso?: string): boolean {
  if (!matchDateIso) return false;
  try {
    const nowWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
    const matchWib = new Date(matchDateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return nowWib === matchWib;
  } catch {
    return false;
  }
}

// Helper mendeteksi matchId & data camp berdasarkan Channel Discord
async function resolveMatchAndCampFromChannel(channelId: string) {
  try {
    const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

    for (const [matchId, rawData] of Object.entries(matchMessages)) {
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (data.campA?.channelId === channelId) {
        return { matchId, teamKey: 'teamA' as const, campData: data.campA, allData: data };
      }
      if (data.campB?.channelId === channelId) {
        return { matchId, teamKey: 'teamB' as const, campData: data.campB, allData: data };
      }
    }
  } catch (error) {
    console.error('Error resolveMatchAndCampFromChannel:', error);
  }

  return { matchId: null, teamKey: null, campData: null, allData: null };
}

// ============================================================================
// 2. AUTOCOMPLETE HANDLERS
// ============================================================================

// ----------------------------------------------------
// A. SUBMIT AUTOCOMPLETE (Dengan Cek Hari Ini & Roster)
// ----------------------------------------------------
export async function handleSubmitAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    const { matchId, teamKey, campData } = await resolveMatchAndCampFromChannel(channelId);

    if (!matchId || !campData?.slug) {
      return { type: 8, data: { choices: [] } };
    }

    // 1. Cek apakah match dijadwalkan HARI INI
    const schedules = await getSchedulesFromKV();
    const currentMatch = schedules.find((m) => m.id === matchId);
    
    // Jika tidak ada jadwal / match bukan hari ini / match sudah selesai, kosongkan pilihan
    if (!currentMatch || currentMatch.isFinished || !isMatchScheduledForToday(currentMatch.matchDate)) {
      return { type: 8, data: { choices: [] } };
    }

    const options = interaction.data?.options || [];
    const focused = options.find((o: any) => o.focused);
    const query = (focused?.value || '').toString().toLowerCase();

    // 2. Ambil roster resmi dari teams:<slug>
    const teamRoster = await getTeamPlayersBySlug(campData.slug);

    // 3. Filter pemain yang sudah masuk di match:report:${matchId}
    const reportData = await kv.get<any>(`match:report:${matchId}`);
    const existingLineup: any[] = reportData?.[teamKey]?.lineup || [];
    const alreadySubmitted = existingLineup.map((p) =>
      String(p.ign || p.name || '').toLowerCase()
    );

    const availablePlayers = teamRoster.filter(
      (p) => !alreadySubmitted.includes((p.ign || '').toLowerCase())
    );

    // 4. Format pilihan: IGN (ID DL)
    const choices = availablePlayers
      .filter((p) => {
        const ign = (p.ign || '').toLowerCase();
        const dl = (p.idDuelLinks || '').toLowerCase();
        return ign.includes(query) || dl.includes(query);
      })
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (${p.idDuelLinks || '-'})`,
        value: p.ign,
      }));

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error handleSubmitAutocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// B. TRANSFER AUTOCOMPLETE
// ----------------------------------------------------
export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    let teamSlug = await kv.hget<string>('global:channel_teams', channelId);

    if (!teamSlug) {
      const userId = interaction.member?.user?.id;
      teamSlug = await kv.hget<string>('global:discord_ids', userId);
    }

    if (!teamSlug) return { type: 8, data: { choices: [] } };

    const options = interaction.data?.options || [];
    const subOptions = options[0]?.options || options;
    const focusedOption = subOptions.find((opt: any) => opt.focused);

    if (!focusedOption || focusedOption.name !== 'user') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const players = await getTeamPlayersBySlug(teamSlug);

    const choices = players
      .filter((p) => {
        const ign = (p.ign || '').toLowerCase();
        const dl = (p.idDuelLinks || '').toLowerCase();
        const discord = (p.discord || '').toLowerCase();
        return ign.includes(query) || dl.includes(query) || discord.includes(query);
      })
      .slice(0, 25)
      .map((p) => ({
        name: `${p.ign} (${p.idDuelLinks || '-'}) - ${p.role || 'Anggota'}`,
        value: p.discordId || p.discord || p.ign,
      }));

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error handling transfer autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// C. ASSIGN & UNASSIGN AUTOCOMPLETE
// ----------------------------------------------------
export async function handleAssignAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toString().toLowerCase();
    const commandName = interaction.data?.name;
    const typeOption = interaction.data?.options?.find((opt: any) => opt.name === 'type')?.value;

    // 1. Opsi Match
    if (focusedOption.name === 'match') {
      const schedules = await getSchedulesFromKV();

      const activeUnfinishedMatches = schedules.filter(
        (m: any) => !m.isFinished && m.discordChannelId
      );

      const currentActiveWeek = activeUnfinishedMatches.length > 0
        ? Math.min(...activeUnfinishedMatches.map((m: any) => m.weekNumber || 1))
        : null;

      const filteredMatches = schedules.filter((m: any) => {
        if (m.isFinished || !m.discordChannelId) return false;

        if (currentActiveWeek !== null && (m.weekNumber || 1) !== currentActiveWeek) {
          return false;
        }

        if (commandName === 'unassign') {
          if (typeOption === 'REFEREE') return Boolean(m.refereeDiscordId);
          if (typeOption === 'STREAMER') return Boolean(m.streamerDiscordId);
        }

        return true;
      });

      const choices = filteredMatches
        .filter((m) => {
          const matchLabel = `${m.id} - ${m.teamAName} vs ${m.teamBName}`.toLowerCase();
          return matchLabel.includes(query);
        })
        .slice(0, 25)
        .map((m) => ({
          name: `${m.id}: ${m.teamAName} vs ${m.teamBName}`,
          value: m.id,
        }));

      return { type: 8, data: { choices } };
    }

    // 2. Opsi User Staf
    if (focusedOption.name === 'user') {
      const staffType = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
      const staffList = (await kv.get<StaffItem[]>(staffType)) || [];

      const sortedStaffList = [...staffList].sort((a, b) =>
        a.discordName.localeCompare(b.discordName, 'id', { sensitivity: 'base' })
      );

      const choices = sortedStaffList
        .filter((s) => s.discordName.toLowerCase().includes(query))
        .slice(0, 25)
        .map((s) => ({
          name: s.discordName,
          value: s.discordId,
        }));

      return { type: 8, data: { choices } };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error handling assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// D. RESCHEDULE AUTOCOMPLETE
// ----------------------------------------------------
export async function handleRescheduleAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption || focusedOption.name !== 'tanggal') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = await getSchedulesFromKV();
    const channelId = interaction.channel_id;

    const currentMatch = schedules.find((m: any) => m.discordChannelId === channelId);
    const currentDate = currentMatch ? new Date(currentMatch.matchDate) : new Date();

    const availableDays = [3, 4, 5, 6, 0]; // Rabu s/d Minggu
    const choices: { name: string; value: string }[] = [];

    for (let i = -7; i <= 14; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);

      if (availableDays.includes(d.getDay())) {
        const isoDate = d.toISOString().split('T')[0];
        const display = d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        });

        if (display.toLowerCase().includes(query) || isoDate.includes(query)) {
          choices.push({ name: display, value: isoDate });
        }
      }
      if (choices.length >= 25) break;
    }

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error reschedule autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

// ----------------------------------------------------
// E. MATCH REPORT AUTOCOMPLETE
// ----------------------------------------------------
export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = await getSchedulesFromKV();

    const teams = Array.from(
      new Set(schedules.flatMap((m) => [m.teamAName, m.teamBName]).filter(Boolean))
    );

    const choices = teams
      .filter((team) => team.toLowerCase().includes(query))
      .slice(0, 25)
      .map((team) => ({
        name: team,
        value: team,
      }));

    return { type: 8, data: { choices } };
  } catch (error) {
    console.error('Error match report autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
