import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { sendOfficialScoreLog } from '@/lib/discord/messages/score-log';
import { getMatchContext } from '@/lib/discord/commands/assign/helpers';
import { resolveMatchFromChannel, getOptionMap, GameContext } from './game/types';
import { buildMatchReportEmbed, publishMatchReport } from './game/renderer';
import { renderCampTrackerEmbed } from './game/camp-tracker';
import { syncOfficialMatchReport } from './game/official-report';
import { handleGameAdd } from './game/add';
import { handleGameEdit } from './game/edit';
import { handleGameDel } from './game/del';

function isAdminOrChief(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    return (
      (permissions & BigInt(0x8)) === BigInt(0x8) ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF))
    );
  } catch {
    return false;
  }
}

function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    return (
      isAdminOrChief(interaction) ||
      (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE))
    );
  } catch {
    return false;
  }
}

/**
 * 🔄 SATU PINTU SINKRONISASI GAME STATE
 * Menggunakan single key `activeMsgId` untuk pelacakan pesan di Camp A & B
 */
export async function syncAndBroadcastGameState({
  match,
  reportData,
  channelId,
  winnerOpt,
  isBeforeKickoff = false,
  userIsAdmin = false,
  forceRepostCamp = false,
}: {
  match: MatchScheduleItem;
  reportData: any;
  channelId: string;
  winnerOpt?: 'A' | 'B';
  isBeforeKickoff?: boolean;
  userIsAdmin?: boolean;
  forceRepostCamp?: boolean;
}) {
  const matchId = match.id;
  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;
  const isFinished = scoreA >= 10 || scoreB >= 10;

  // A. SIMPAN MATCH REPORT KE KV
  await kv.hset('twi:match_reports', { [matchId]: reportData });

  // B. UPDATE TWI:SCHEDULES
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const idx = schedules.findIndex((m) => m.id === matchId);
    if (idx !== -1) {
      schedules[idx].scoreA = scoreA;
      schedules[idx].scoreB = scoreB;
      schedules[idx].isFinished = isFinished;
      await kv.set('twi:schedules', schedules);
    }
  } catch (err) {
    console.error('[SYNC SCHEDULES ERROR]:', err);
  }

  // C. UPDATE REPORT EMBED DI MATCH ROOM (ROOM WASIT)
  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);
  if (!isBeforeKickoff || !userIsAdmin) {
    await publishMatchReport(channelId, matchId, matchEmbed);
  }

  // D. UPDATE LIVE TRACKER DI CAMP TIM A & B (FOKUS PADA activeMsgId)
  try {
    const allMatchMessages =
      (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};[span_1](start_span)[span_1](end_span)
    let matchMsgData: any = allMatchMessages[matchId];

    if (typeof matchMsgData === 'string') {
      try {
        matchMsgData = JSON.parse(matchMsgData);
      } catch {
        matchMsgData = null;
      }
    }

    if (matchMsgData) {
      let isMsgUpdated = false;
      const matchWeek = reportData.week || match.weekNumber || 1;

      // 1. UPDATE TRACKER CAMP A
      if (matchMsgData.campA?.channelId) {
        const campEmbedA = await renderCampTrackerEmbed('teamA', reportData, match, matchWeek);
        const targetMsgIdA = matchMsgData.campA.activeMsgId;

        if (targetMsgIdA && !forceRepostCamp) {
          await discordAPI(`/channels/${matchMsgData.campA.channelId}/messages/${targetMsgIdA}`, 'PATCH', {
            embeds: [campEmbedA],
          }).catch(() => null);
        } else {
          const postRes = await discordAPI(`/channels/${matchMsgData.campA.channelId}/messages`, 'POST', {
            embeds: [campEmbedA],
          });
          if (postRes?.id) {
            matchMsgData.campA.activeMsgId = postRes.id;
            isMsgUpdated = true;
          }
        }
      }

      // 2. UPDATE TRACKER CAMP B
      if (matchMsgData.campB?.channelId) {
        const campEmbedB = await renderCampTrackerEmbed('teamB', reportData, match, matchWeek);
        const targetMsgIdB = matchMsgData.campB.activeMsgId;

        if (targetMsgIdB && !forceRepostCamp) {
          await discordAPI(`/channels/${matchMsgData.campB.channelId}/messages/${targetMsgIdB}`, 'PATCH', {
            embeds: [campEmbedB],
          }).catch(() => null);
        } else {
          const postRes = await discordAPI(`/channels/${matchMsgData.campB.channelId}/messages`, 'POST', {
            embeds: [campEmbedB],
          });
          if (postRes?.id) {
            matchMsgData.campB.activeMsgId = postRes.id;
            isMsgUpdated = true;
          }
        }
      }

      if (isMsgUpdated) {
        await kv.hset('discord:match_messages', { [matchId]: matchMsgData });
      }
    }
  } catch (err) {
    console.error('[CAMP LIVE TRACKER SYNC ERROR]:', err);
  }

  // E. SINKRONISASI KE CHANNEL OFFICIAL REPORT JIKA PERTANDINGAN SELESAI
  if (isFinished) {
    await syncOfficialMatchReport(match, reportData).catch((err) =>
      console.error('[SYNC OFFICIAL REPORT ERROR]:', err)
    );

    try {
      const chScore = DISCORD_CONFIG.CH_SCORE || DISCORD_CONFIG.CH_LOG;
      if (chScore) {
        const matchCtx = await getMatchContext(match);
        const isWinnerA = scoreA >= 10;
        const winnerData = isWinnerA ? matchCtx.teamA : matchCtx.teamB;
        const winnerHex = winnerData?.warna || (isWinnerA ? '#3498db' : '#e74c3c');

        await sendOfficialScoreLog({
          channelId: chScore,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          teamAEmoji: matchCtx.teamAEmoji,
          teamBEmoji: matchCtx.teamBEmoji,
          scoreA,
          scoreB,
          winnerHex,
        });
      }
    } catch (err) {
      console.error('[OFFICIAL SCORE LOG ERROR]:', err);
    }
  }

  return { matchEmbed };
}

export async function handleGameCommand(interaction: any) {
  if (!isStaff(interaction)) {
    return {
      type: 4,
      data: {
        content: '❌ Akses Ditolak! Hanya **Wasit Bertugas** dan **Admin** yang dapat menggunakan command ini.',
        flags: 64,
      },
    };
  }

  const channelId = interaction.channel_id;
  const token = interaction.token;
  const appId = interaction.application_id || process.env.DISCORD_CLIENT_ID;

  const match = await resolveMatchFromChannel(channelId);
  if (!match) {
    return {
      type: 4,
      data: {
        content: '❌ Command ini hanya dapat dijalankan di dalam **Channel Match** yang aktif!',
        flags: 64,
      },
    };
  }

  const lockKey = `lock:match:${match.id}`;
  const acquiredLock = await kv.set(lockKey, 'LOCKED', { nx: true, ex: 5 });

  if (!acquiredLock) {
    return {
      type: 4,
      data: {
        content:
          '⚠️ **Pertandingan sedang diproses oleh Wasit/Admin lain!** Mohon tunggu beberapa detik sebelum menginput command berikutnya.',
        flags: 64,
      },
    };
  }

  waitUntil(
    (async () => {
      try {
        const kickoffTime = match.matchDate ? new Date(match.matchDate).getTime() : 0;
        const isBeforeKickoff = kickoffTime > 0 && Date.now() < kickoffTime;
        const userIsAdmin = isAdminOrChief(interaction);

        if (isBeforeKickoff && !userIsAdmin) {
          const matchHourStr =
            new Date(match.matchDate)
              .toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta',
              })
              .replace(':', '.') + ' WIB';

          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: `⚠️ Pertandingan baru dimulai pukul **${matchHourStr}**. Command \`/game\` belum dapat digunakan sebelum kick-off.`,
            });
          }
          return;
        }

        const reportData = (await kv.hget<any>('twi:match_reports', match.id)) || {};
        if (!reportData.teamA || !reportData.teamB) {
          if (appId && token) {
            await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
              content: '❌ Dokumen match report belum ditemukan untuk pertandingan ini.',
            });
          }
          return;
        }

        const rawOptions = interaction.data?.options || [];
        const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
        const subCommandName = subCommandObj?.name || 'add';
        const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
        const optMap = getOptionMap(subOptions);

        const ctx: GameContext = {
          interaction,
          channelId,
          appId,
          token,
          match,
          reportData,
          optMap,
          isBeforeKickoff,
          userIsAdmin,
        };

        if (subCommandName === 'add') {
          await handleGameAdd(ctx);
        } else if (subCommandName === 'edit') {
          await handleGameEdit(ctx);
        } else if (subCommandName === 'del') {
          await handleGameDel(ctx);
        } else if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ Subcommand '${subCommandName}' tidak dikenali.`,
          });
        }
      } catch (error: any) {
        console.error('Error in handleGameCommand worker:', error);
        if (appId && token) {
          await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
            content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}`,
          }).catch(() => null);
        }
      } finally {
        await kv.del(lockKey).catch(() => {});
      }
    })()
  );

  return {
    type: 5,
    data: { flags: 64 },
  };
  }
