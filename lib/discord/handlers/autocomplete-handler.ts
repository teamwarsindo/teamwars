import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/services/staff-assignment';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';

// ==========================================
// TRANSFER AUTOCOMPLETE HANDLER
// ==========================================
export async function handleTransferAutocomplete(interaction: any) {
  try {
    const channelId = interaction.channel_id;
    let teamSlug = await kv.hget<string>('global:channel_teams', channelId);

    // Fallback jika belum terpetakan di channel camp
    if (!teamSlug) {
      const userId = interaction.member?.user?.id;
      teamSlug = await kv.hget<string>('global:discord_ids', userId);
    }

    if (!teamSlug) return { type: 8, data: { choices: [] } };

    // Ekstrak nested options dari subcommand
    const options = interaction.data?.options || [];
    const subOptions = options[0]?.options || options;
    const focusedOption = subOptions.find((opt: any) => opt.focused);

    if (!focusedOption || focusedOption.name !== 'user') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const teamData = await kv.hgetall<any>(`teams:${teamSlug}`);
    if (!teamData || !teamData.players) return { type: 8, data: { choices: [] } };

    const players: PlayerItem[] = parsePlayers(teamData.players);

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

// ==========================================
// ASSIGN & UNASSIGN AUTOCOMPLETE HANDLER
// ==========================================
export async function handleAssignAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toString().toLowerCase();
    const commandName = interaction.data?.name;
    const typeOption = interaction.data?.options?.find((opt: any) => opt.name === 'type')?.value;

    // 1. Autocomplete untuk Opsi Match
    if (focusedOption.name === 'match') {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

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
          if (typeOption === 'REFEREE') {
            return Boolean(m.refereeDiscordId);
          }
          if (typeOption === 'STREAMER') {
            return Boolean(m.streamerDiscordId);
          }
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

    // 2. Autocomplete untuk Opsi User Staf (Urut Abjad & Tanpa ID)
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

// ==========================================
// RESCHEDULE AUTOCOMPLETE HANDLER
// ==========================================
export async function handleRescheduleAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption || focusedOption.name !== 'tanggal') {
      return { type: 8, data: { choices: [] } };
    }

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const channelId = interaction.channel_id;

    const currentMatch = schedules.find((m: any) => m.discordChannelId === channelId);
    const currentDate = currentMatch ? new Date(currentMatch.matchDate) : new Date();

    const availableDays = [3, 4, 5, 6, 0];
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

// ==========================================
// MATCH REPORT AUTOCOMPLETE HANDLER
// ==========================================
export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const focusedOption = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focusedOption) return { type: 8, data: { choices: [] } };

    const query = (focusedOption.value || '').toString().toLowerCase();
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

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
