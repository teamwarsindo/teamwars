import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/services/staff-assignment';

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

      // Ambil match yang belum selesai dan sudah memiliki channel Discord aktif
      const activeUnfinishedMatches = schedules.filter(
        (m: any) => !m.isFinished && m.discordChannelId
      );

      // Cari week terkecil yang sedang berjalan dari match yang belum selesai
      const currentActiveWeek = activeUnfinishedMatches.length > 0
        ? Math.min(...activeUnfinishedMatches.map((m: any) => m.weekNumber || 1))
        : null;

      const filteredMatches = schedules.filter((m: any) => {
        // Syarat mutlak: Channel Discord sudah ada dan match belum selesai
        if (m.isFinished || !m.discordChannelId) return false;

        // Kunci tampilan hanya pada Week yang sedang berjalan (jika ada)
        if (currentActiveWeek !== null && (m.weekNumber || 1) !== currentActiveWeek) {
          return false;
        }

        // Filter khusus untuk command /unassign
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

    // 2. Autocomplete untuk Opsi User Staf
    if (focusedOption.name === 'user') {
      const staffType = typeOption === 'STREAMER' ? 'staff:streamers' : 'staff:referees';
      const staffList = (await kv.get<StaffItem[]>(staffType)) || [];

      const choices = staffList
        .filter((s) => s.discordName.toLowerCase().includes(query) || s.discordId.includes(query))
        .slice(0, 25)
        .map((s) => ({
          name: `${s.discordName} (${s.discordId})`,
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

    const availableDays = [3, 4, 5, 6, 0]; // Rabu (3) s.d. Minggu (0)
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