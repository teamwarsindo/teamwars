import { kv } from '@vercel/kv';
import { parsePlayers, PlayerItem } from '@/lib/discord/services/transfer-service';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';
import { discordAPI } from '@/lib/discord/utils';
import {
  isStaff,
  isAdminOrChief,
  getOptionMap,
  isToday,
  isWithinAdminGracePeriod,
} from './submit/types';
import { handleSubAdd } from './submit/add';
import { handleSubChange } from './submit/change';
import { handleSubEdit } from './submit/edit';

function checkIsLineupFullyCompleted(lineup: any[]): boolean {
  if (!Array.isArray(lineup) || lineup.length < 5) return false;

  for (const p of lineup) {
    if (!p.deck1 || !p.deck1.archetype || !p.deck1.archetype.trim()) {
      return false;
    }
    if (p.deck2 !== null) {
      if (!p.deck2 || !p.deck2.archetype || !p.deck2.archetype.trim()) {
        return false;
      }
    }
  }

  return true;
}

export async function handleSubmitCommand(interaction: any) {
  try {
    if (!isStaff(interaction)) {
      return {
        type: 4,
        data: {
          content: '❌ Akses Ditolak! Hanya **Referee** dan **Admin** yang dapat menggunakan command ini.',
          flags: 64,
        },
      };
    }

    const channelId = interaction.channel_id;
    const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);

    if (!activeCamp?.matchId || !activeCamp?.teamKey) {
      return {
        type: 4,
        data: {
          content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang terdaftar!',
          flags: 64,
        },
      };
    }

    const userIsAdmin = isAdminOrChief(interaction);
    const matchIsToday = isToday(activeCamp.matchDate);
    const isWithinGracePeriod = isWithinAdminGracePeriod(activeCamp.matchDate);

    // Proteksi Waktu: Referee hanya hari H, Admin/Chief kebal sampai Selasa 23:59 WIB pekan berikutnya
    if (!matchIsToday) {
      if (userIsAdmin && isWithinGracePeriod) {
        // Bypass akses untuk Admin / Chief
      } else {
        return {
          type: 4,
          data: {
            content: userIsAdmin
              ? '⚠️ Match ini sudah melewati batas rekap pekan (Selasa 23:59 WIB). Akses edit ditutup.'
              : '⚠️ Pertandingan di camp ini tidak dijadwalkan untuk hari ini atau sudah berakhir. (Hubungi Admin jika butuh revisi).',
            flags: 64,
          },
        };
      }
    }

    const { matchId, teamKey } = activeCamp;
    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    const teamData = await kv.hgetall<any>(`teams:${activeCamp.slug}`);
    const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

    let reportData = await kv.hget<any>('twi:match_reports', matchId);
    if (!reportData) {
      reportData = {
        matchId,
        week: activeCamp.week || 1,
        metadata: {
          date: activeCamp.matchDate
            ? activeCamp.matchDate.split('T')[0]
            : new Date().toISOString().split('T')[0],
          streamPlatform: 'YouTube',
          streamer: '',
          referee: '',
          streamUrl: '',
        },
        teamA: {
          name: teamKey === 'teamA' ? activeCamp.name : '',
          slug: teamKey === 'teamA' ? activeCamp.slug : '',
          score: 0,
          repeatsUsed: 0,
          warningsUsed: 0,
          lineup: [],
        },
        teamB: {
          name: teamKey === 'teamB' ? activeCamp.name : '',
          slug: teamKey === 'teamB' ? activeCamp.slug : '',
          score: 0,
          repeatsUsed: 0,
          warningsUsed: 0,
          lineup: [],
        },
        games: [],
        finalScore: { teamA: 0, teamB: 0 },
        winnerTeam: null,
        isFinished: false,
      };
    }

    if (reportData.isFinished && !userIsAdmin) {
      return {
        type: 4,
        data: { content: '⚠️ Pertandingan ini sudah selesai (`isFinished: true`). Lineup sudah dikunci.', flags: 64 },
      };
    }

    const ctx = {
      interaction,
      channelId,
      matchId,
      teamKey,
      campData: activeCamp,
      reportData,
      teamRoster,
      optMap,
    };

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

    const targetLineup = reportData[teamKey].lineup || [];
    const isFullyComplete = checkIsLineupFullyCompleted(targetLineup);
    const manualPublish = Boolean(optMap.publish ?? false);
    const shouldRepost = manualPublish || isFullyComplete;

    // 🧹 Jika harus repost (publish/lengkap) dan pesan lama ada, hapus dulu agar pesan baru turun ke paling bawah
    if (shouldRepost && activeCamp.submitMsgId) {
      try {
        await discordAPI(`/channels/${channelId}/messages/${activeCamp.submitMsgId}`, 'DELETE');
      } catch (delErr) {
        console.warn('Gagal menghapus pesan tracker lama:', delErr);
      }
    }

    const trackerPlayers: TrackerPlayer[] = targetLineup.map((p: any) => ({
      ign: p.ign,
      idDuelLinks: p.idDuelLinks || '',
      deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
      deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
    }));

    // Jika shouldRepost = true, kirim null agar fungsi sendOrUpdateLiveTracker membuat pesan baru (POST)
    const newSubmitMsgId = await sendOrUpdateLiveTracker({
      channelId,
      matchDateIso: activeCamp.matchDate || new Date().toISOString(),
      week: reportData.week,
      submittedPlayers: trackerPlayers,
      existingMsgId: shouldRepost ? null : activeCamp.submitMsgId,
    });

    activeCamp.submitMsgId = newSubmitMsgId;
    await kv.hset('twi:active_camp_channels', { [channelId]: activeCamp });
    await kv.hset('twi:match_reports', { [matchId]: reportData });

    let publishNotice = '\n🔇 *Tracker diedit di tempat (tanpa repost).*';
    if (isFullyComplete) {
      publishNotice = '\n🎉 **Semua Deck & Lineup Lengkap!** Tracker otomatis dipublikasikan ke paling bawah!';
    } else if (manualPublish) {
      publishNotice = '\n📢 *Live tracker di-publish ulang ke paling bawah channel!*';
    }

    return {
      type: 4,
      data: {
        content: `${result.message}\n\n📊 Status Lineup: **${targetLineup.length}/5 Pemain Terdaftar**.${publishNotice}`,
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
