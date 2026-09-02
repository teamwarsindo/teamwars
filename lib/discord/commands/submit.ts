import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';
import { isStaff, getOptionMap, isToday } from './submit/types';
import { handleSubAdd } from './submit/add';
import { handleSubChange } from './submit/change';
import { handleSubEdit } from './submit/edit';

async function resolveMatchAndCampFromChannel(channelId: string) {
  const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);
  if (!activeCamp?.matchId || !activeCamp?.teamKey) {
    return { matchId: null, teamKey: null, campData: null };
  }
  if (!isToday(activeCamp.matchDate)) {
    return { matchId: null, teamKey: null, campData: null, isExpired: true };
  }
  return {
    matchId: activeCamp.matchId as string,
    teamKey: activeCamp.teamKey as 'teamA' | 'teamB',
    campData: activeCamp,
  };
}

export async function handleSubmitCommand(interaction: any) {
  try {
    if (!isStaff(interaction)) {
      return {
        type: 4,
        data: { content: '❌ Akses Ditolak! Hanya **Referee** dan **Admin** yang dapat menggunakan command ini.', flags: 64 },
      };
    }

    const channelId = interaction.channel_id;
    const resolved = await resolveMatchAndCampFromChannel(channelId);

    if ((resolved as any).isExpired) {
      return {
        type: 4,
        data: { content: '⚠️ Pertandingan di camp ini tidak dijadwalkan untuk hari ini atau sudah berakhir.', flags: 64 },
      };
    }

    const { matchId, teamKey, campData } = resolved;
    if (!matchId || !campData || !teamKey) {
      return {
        type: 4,
        data: { content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang aktif bertanding hari ini!', flags: 64 },
      };
    }

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    const teamData = await kv.hgetall<any>(`teams:${campData.slug}`);
    const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

    let reportData = await kv.hget<any>('twi:match_reports', matchId);
    if (!reportData) {
      reportData = {
        matchId,
        week: campData.week || 1,
        metadata: {
          date: campData.matchDate ? campData.matchDate.split('T')[0] : new Date().toISOString().split('T')[0],
          streamPlatform: 'YouTube',
          streamer: '',
          referee: '',
          streamUrl: '',
        },
        teamA: { name: teamKey === 'teamA' ? campData.name : '', slug: teamKey === 'teamA' ? campData.slug : '', score: 0, repeatsUsed: 0, warningsUsed: 0, lineup: [] },
        teamB: { name: teamKey === 'teamB' ? campData.name : '', slug: teamKey === 'teamB' ? campData.slug : '', score: 0, repeatsUsed: 0, warningsUsed: 0, lineup: [] },
        games: [],
        finalScore: { teamA: 0, teamB: 0 },
        winnerTeam: null,
        isFinished: false,
      };
    }

    if (reportData.isFinished) {
      return {
        type: 4,
        data: { content: '⚠️ Pertandingan ini sudah selesai (`isFinished: true`). Lineup sudah dikunci.', flags: 64 },
      };
    }

    const ctx = { interaction, channelId, matchId, teamKey, campData, reportData, teamRoster, optMap };
    let result: { error?: string; message?: string } = {};

    if (subCommandName === 'add') {
      result = handleSubAdd(ctx);
    } else if (subCommandName === 'change') {
      result = await handleSubChange(ctx);
    } else if (subCommandName === 'edit') {
      result = await handleSubEdit(ctx);
    }

    if (result.error) {
      return { type: 4, data: { content: result.error, flags: 64 } };
    }

    // Sinkronisasi Live Tracker & KV
    const targetLineup = reportData[teamKey].lineup || [];
    const trackerPlayers: TrackerPlayer[] = targetLineup.map((p: any) => ({
      ign: p.ign,
      idDuelLinks: p.idDuelLinks || '',
      deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
      deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
    }));

    const newSubmitMsgId = await sendOrUpdateLiveTracker({
      channelId,
      matchDateIso: campData.matchDate || new Date().toISOString(),
      week: reportData.week,
      submittedPlayers: trackerPlayers,
      existingMsgId: campData.submitMsgId,
    });

    campData.submitMsgId = newSubmitMsgId;
    await kv.hset('twi:active_camp_channels', { [channelId]: campData });
    await kv.hset('twi:match_reports', { [matchId]: reportData });

    return {
      type: 4,
      data: {
        content: `${result.message}\n\n📊 Status Lineup: **${targetLineup.length}/5 Pemain Terdaftar**.`,
        flags: 64,
      },
    };
  } catch (error: any) {
    console.error('Error in handleSubmitCommand:', error);
    return {
      type: 4,
      data: { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`, flags: 64 },
    };
  }
}
