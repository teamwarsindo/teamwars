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
import { syncOfficialMatchReport } from './game/official-report';

// Auto-publish berlaku jika minimal 4 pemain dan seluruh deck yang dialokasikan terisi
function checkIsLineupFullyCompleted(lineup: any[]): boolean {
  if (!Array.isArray(lineup) || lineup.length < 4) return false;

  for (const p of lineup) {
    if (!p.ign || !p.ign.trim()) return false;
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

  // 2. Eksekusi Background Worker dengan waitUntil
  waitUntil(
    (async () => {
      try {
        const userIsAdmin = isAdminOrChief(interaction);

        // Resolusi channel camp dari discord:match_messages
        const allMatchMessages =
          (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};

        const candidates: Array<{
          matchId: string;
          match: any;
          teamKey: 'teamA' | 'teamB';
          camp: any;
        }> = [];

        for (const mId in allMatchMessages) {
          let item = allMatchMessages[mId];
          if (typeof item === 'string') {
            try {
              item = JSON.parse(item);
            } catch {
              continue;
            }
          }

          if (item?.campA?.channelId === channelId) {
            candidates.push({
              matchId: item.matchId || mId,
              match: item,
              teamKey: 'teamA',
              camp: item.campA,
            });
          } else if (item?.campB?.channelId === channelId) {
            candidates.push({
              matchId: item.matchId || mId,
              match: item,
              teamKey: 'teamB',
              camp: item.campB,
            });
          }
        }

        if (candidates.length === 0) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: '❌ Command ini hanya dapat digunakan di dalam **Channel Camp Tim** yang terdaftar di jadwal pertandingan!',
            });
          }
          return;
        }

        const todayCand = candidates.find((c) => isToday(c.match.matchDate));
        const graceCand = candidates.find((c) => isWithinAdminGracePeriod(c.match.matchDate));
        const selected = todayCand || (userIsAdmin ? graceCand : null);

        if (!selected) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: userIsAdmin
                ? '⚠️ Tidak ada jadwal match di channel ini yang berada dalam masa toleransi rekap (Selasa 23:59 WIB).'
                : '⚠️ Tidak ada jadwal pertandingan untuk hari ini di channel camp ini. (Hubungi Admin jika butuh revisi jadwal).',
            });
          }
          return;
        }

        const matchId = selected.matchId;
        const matchData = selected.match;
        const teamKey = selected.teamKey;
        const activeCamp = {
          ...selected.camp,
          matchId: selected.matchId,
          teamKey: selected.teamKey,
          week: selected.match.week,
          matchDate: selected.match.matchDate,
          submitMsgId: selected.camp.submitMsgId || selected.camp.activeMsgId || null,
        };

        const rawOptions = interaction.data?.options || [];
        const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
        const subCommandName = subCommandObj?.name || 'add';
        const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
        const optMap = getOptionMap(subOptions);

        const teamData = await kv.hgetall<any>(`teams:${activeCamp.slug}`);
        const teamRoster: PlayerItem[] = teamData?.players ? parsePlayers(teamData.players) : [];

        let reportData = await kv.hget<any>('twi:match_reports', matchId);
        if (!reportData) {
          const matchDateStr = activeCamp.matchDate ? activeCamp.matchDate.split('T')[0] : '';
          reportData = {
            matchId,
            week: matchData.week,
            metadata: {
              date: matchDateStr,
              streamPlatform: '',
              streamer: '',
              referee: '',
              streamUrl: '',
            },
            teamA: {
              name: matchData.campA?.name || (teamKey === 'teamA' ? activeCamp.name : ''),
              slug: matchData.campA?.slug || (teamKey === 'teamA' ? activeCamp.slug : ''),
              score: 0,
              repeatsUsed: 0,
              warningsUsed: 0,
              lineup: [],
            },
            teamB: {
              name: matchData.campB?.name || (teamKey === 'teamB' ? activeCamp.name : ''),
              slug: matchData.campB?.slug || (teamKey === 'teamB' ? activeCamp.slug : ''),
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
        const games: any[] = reportData.games || [];
        const hasGameStarted = games.length > 0;
        const isMatchFinished = Boolean(reportData.isFinished);

        const hasPublishOption = optMap.publish !== undefined;
        const manualPublish = optMap.publish === true || optMap.publish === 'true';

        // Jika game sudah jalan: selalu edit di tempat (shouldRepost = false) agar tidak spam camp
        let shouldRepost = false;
        if (!hasGameStarted) {
          shouldRepost = hasPublishOption ? manualPublish : isFullyComplete;
        }

        const trackerPlayers: TrackerPlayer[] = targetLineup.map((p: any) => ({
          ign: p.ign || '*(Slot Kosong - Menunggu Pengganti)*',
          idDuelLinks: p.idDuelLinks || '',
          deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
          deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
        }));

        const newSubmitMsgId = await sendOrUpdateLiveTracker({
          channelId,
          matchDateIso: activeCamp.matchDate,
          week: reportData.week,
          submittedPlayers: trackerPlayers,
          existingMsgId: activeCamp.submitMsgId,
          shouldRepost,
        });

        // Simpan message tracker ID terbaru
        if (teamKey === 'teamA' && matchData.campA) {
          matchData.campA.activeMsgId = newSubmitMsgId;
          matchData.campA.submitMsgId = newSubmitMsgId;
        } else if (teamKey === 'teamB' && matchData.campB) {
          matchData.campB.activeMsgId = newSubmitMsgId;
          matchData.campB.submitMsgId = newSubmitMsgId;
        }

        await kv.hset('discord:match_messages', { [matchId]: matchData });
        await kv.hset('twi:match_reports', { [matchId]: reportData });

        // Jika match sudah selesai, sinkronkan official report agar daftar lineup terupdate
        if (isMatchFinished) {
          await syncOfficialMatchReport(matchData, reportData).catch(console.error);
        }

        let publishNotice = '\n🔇 *Tracker diedit di tempat (tanpa repost).*';
        if (shouldRepost) {
          if (manualPublish) {
            publishNotice = '\n📢 *Live tracker di-publish ulang ke paling bawah channel!*';
          } else if (isFullyComplete) {
            publishNotice = '\n🎉 **Lineup & Deck Lengkap!** Tracker otomatis dipublikasikan ke paling bawah!';
          }
        }

        const registeredCount = targetLineup.filter((p: any) => p.ign && p.ign.trim()).length;

        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `${result.message}\n\n📊 Status Lineup: **${registeredCount}/5 Pemain Terdaftar**.${publishNotice}`,
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

  return {
    type: 5,
    data: { flags: 64 },
  };
}
