import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { StaffItem } from '@/lib/discord/services/staff-assignment';
import { parsePlayers } from '@/lib/discord/services/transfer-service';
import { filterChoices } from './types';

export async function handleAssignAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const typeOption = interaction.data?.options?.find((opt: any) => opt.name === 'type')?.value;
    const query = String(focused.value || '');

    if (focused.name === 'match') {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
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
        data: { choices: filterChoices(sorted, query, (s) => s.discordName, (s) => s.discordId) },
      };
    }

    return { type: 8, data: { choices: [] } };
  } catch (error) {
    console.error('Error assign autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}

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

    const team = await kv.hgetall<any>(`teams:${teamSlug}`);
    const players = team?.players ? parsePlayers(team.players) : [];
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

export async function handleMatchReportAutocomplete(interaction: any) {
  try {
    const focused = interaction.data?.options?.find((opt: any) => opt.focused);
    if (!focused) return { type: 8, data: { choices: [] } };

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const teams = Array.from(new Set(schedules.flatMap((m) => [m.teamAName, m.teamBName]).filter(Boolean)));
    return {
      type: 8,
      data: { choices: filterChoices(teams, focused.value || '', (t) => t, (t) => t) },
    };
  } catch (error) {
    console.error('Error match report autocomplete:', error);
    return { type: 8, data: { choices: [] } };
  }
}
