import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { discordAPI, parsePlayers, PlayerItem } from '@/lib/discord/utils';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';
import {
  isStaff,
  isAdminOrChief,
  getOptionMap,
  isToday,
  isWithinAdminGracePeriod,
} from './submit/types';
import { handleSubAdd } from './submit/add';
import { handleSubDel } from './submit/del';
import { handleSubEdit } from './submit/edit';

// 🔍 Auto-publish berlaku jika minimal 4 pemain dan seluruh deck yang dialokasikan terisi
function checkIsLineupFullyCompleted(lineup: any[]): boolean {
  if (!Array.isArray(lineup) || lineup.length < 4) return false;

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
  // 1. Validasi Cepat Akses Staff (<1ms)
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
  const token = interaction.token;
  const appId = interaction.application_id || process.env.DISCORD_CLIENT_ID;

  // 2. Eksekusi Background Worker dengan waitUntil (Mencegah "Interaction Failed" 3 detik)
  waitUntil(
    (async () => {
      try {
        const activeCamp = await kv.hget<any>('twi:active_camp_channels', channelId);

        if (!activeCamp?.matchId || !activeCamp?.teamKey) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang terdaftar!',
            });
          }
          return;
        }

        const userIsAdmin = isAdminOrChief(interaction);
        const matchIsToday = isToday(activeCamp.matchDate);
        const isWithinGracePeriod = isWithinAdminGracePeriod(activeCamp.matchDate);

        // Proteksi Waktu: Referee hanya hari H, Admin kebal s/d Selasa 23:59 WIB pekan berikutnya
        if (!matchIsToday) {
          if (userIsAdmin && isWithinGracePeriod) {
            // Bypass akses untuk Admin / Chief
          } else {
            if (appId && token) {
              await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
                content: userIsAdmin
                  ? '⚠️ Match ini sudah melewati batas rekap pekan (Selasa 23:59 WIB). Akses edit ditutup.'
                  : '⚠️ Pertandingan di camp ini tidak dijadwalkan untuk hari ini atau sudah berakhir. (Hubungi Admin jika butuh revisi).',
              });
            }
            return;
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
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: '⚠️ Pertandingan ini sudah selesai (`isFinished: true`). Lineup sudah dikunci.',
            });
          }
          return;
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
        } else if (subCommandName === 'del') {
          result = await handleSubDel(ctx);
        } else if (subCommandName === 'edit') {
          result = await handleSubEdit(ctx);
        }

        if (result.error) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: result.error,
            });
          }
          return;
        }

        const targetLineup = reportData[teamKey].lineup || [];
        const isFullyComplete = checkIsLineupFullyCompleted(targetLineup);

        // Parsing publish: aman terhadap boolean true maupun string "true"
        const hasPublishOption = optMap.publish !== undefined;
        const manualPublish = optMap.publish === true || optMap.publish === 'true';

        // Prioritas: jika user mengisi publish eksplisit, ikuti pilihan user.
        // Jika tidak diisi sama sekali, hanya repost jika lineup sudah lengkap semua deck-nya.
        const shouldRepost = hasPublishOption ? manualPublish : isFullyComplete;

        const trackerPlayers: TrackerPlayer[] = targetLineup.map((p: any) => ({
          ign: p.ign,
          idDuelLinks: p.idDuelLinks || '',
          deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
          deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
        }));

        // Delegasikan proses PATCH atau REPOST ke helper
        const newSubmitMsgId = await sendOrUpdateLiveTracker({
          channelId,
          matchDateIso: activeCamp.matchDate || new Date().toISOString(),
          week: reportData.week,
          submittedPlayers: trackerPlayers,
          existingMsgId: activeCamp.submitMsgId,
          shouldRepost,
        });

        activeCamp.submitMsgId = newSubmitMsgId;
        await kv.hset('twi:active_camp_channels', { [channelId]: activeCamp });
        await kv.hset('twi:match_reports', { [matchId]: reportData });

        let publishNotice = '\n🔇 *Tracker diedit di tempat (tanpa repost).*';
        if (manualPublish) {
          publishNotice = '\n📢 *Live tracker di-publish ulang ke paling bawah channel!*';
        } else if (isFullyComplete && !hasPublishOption) {
          publishNotice = '\n🎉 **Lineup & Deck Lengkap!** Tracker otomatis dipublikasikan ke paling bawah!';
        }

        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `${result.message}\n\n📊 Status Lineup: **${targetLineup.length}/5 Pemain Terdaftar**.${publishNotice}`,
          });
        }
      } catch (error: any) {
        console.error('Error in handleSubmitCommand background worker:', error);
        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`,
          }).catch(() => null);
        }
      }
    })()
  );

  // Respon Type 5 instan ke Discord agar tidak kena batas 3 detik
  return {
    type: 5,
    data: { flags: 64 },
  };
}
