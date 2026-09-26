import { waitUntil } from '@vercel/functions';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { sendOfficialScoreLog } from '@/lib/discord/messages/score-log';
import { getMatchContext } from '@/lib/discord/commands/assign/helpers';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';
import { resolveMatchFromChannel, getOptionMap, GameContext } from './game/types';
import { buildMatchReportEmbed, publishMatchReport } from './game/renderer';
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
 * 🔄 SATU PINTU SINKRONISASI GAME STATE:
 * 1. Simpan twi:match_reports
 * 2. Update twi:schedules (skor & status selesai)
 * 3. Update & publish match report embed ke Channel Match
 * 4. Update live tracker di Camp Tim A & B (via discord:match_messages)
 * 5. Kirim Score Log publik jika match tuntas
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

  // A. SIMPAN MATCH REPORT
  await kv.hset('twi:match_reports', { [matchId]: reportData });

  // B. SINKRONISASI KE TWI:SCHEDULES
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

  // C. UPDATE REPORT EMBED DI MATCH ROOM
  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);
  if (!isBeforeKickoff || !userIsAdmin) {
    await publishMatchReport(channelId, matchId, matchEmbed);
  }

  // D. UPDATE LIVE TRACKER DI CAMP TIM A & TIM B
  try {
    const allMatchMessages =
      (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
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

      const toTrackerPlayers = (lineup: any[] = []): TrackerPlayer[] =>
        lineup.map((p: any) => ({
          ign: p.ign,
          idDuelLinks: p.idDuelLinks || '',
          deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
          deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
        }));

      // Patch Tracker Camp A
      if (matchMsgData.campA?.channelId) {
        const trackerPlayersA = toTrackerPlayers(reportData.teamA?.lineup);
        const existingIdA = matchMsgData.campA.activeMsgId || matchMsgData.campA.submitMsgId;
        const newMsgIdA = await sendOrUpdateLiveTracker({
          channelId: matchMsgData.campA.channelId,
          matchDateIso: match.matchDate || new Date().toISOString(),
          week: reportData.week || 1,
          submittedPlayers: trackerPlayersA,
          existingMsgId: existingIdA,
          shouldRepost: forceRepostCamp,
        });

        if (newMsgIdA && newMsgIdA !== matchMsgData.campA.activeMsgId) {
          matchMsgData.campA.activeMsgId = newMsgIdA;
          isMsgUpdated = true;
        }
      }

      // Patch Tracker Camp B
      if (matchMsgData.campB?.channelId) {
        const trackerPlayersB = toTrackerPlayers(reportData.teamB?.lineup);
        const existingIdB = matchMsgData.campB.activeMsgId || matchMsgData.campB.submitMsgId;
        const newMsgIdB = await sendOrUpdateLiveTracker({
          channelId: matchMsgData.campB.channelId,
          matchDateIso: match.matchDate || new Date().toISOString(),
          week: reportData.week || 1,
          submittedPlayers: trackerPlayersB,
          existingMsgId: existingIdB,
          shouldRepost: forceRepostCamp,
        });

        if (newMsgIdB && newMsgIdB !== matchMsgData.campB.activeMsgId) {
          matchMsgData.campB.activeMsgId = newMsgIdB;
          isMsgUpdated = true;
        }
      }

      if (isMsgUpdated) {
        await kv.hset('discord:match_messages', { [matchId]: matchMsgData });
      }
    }
  } catch (err) {
    console.error('[CAMP LIVE TRACKER SYNC ERROR]:', err);
  }

  // E. KIRIM OFFICIAL SCORE LOG JIKA MATCH SELESAI
  if (isFinished) {
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
  // 1. Validasi Hak Akses Cepat (<1ms)
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

  // 2. Cek Match Terkait Channel
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

  // 3. ATOMIC LOCK (Cegah Tabrakan Input Admin & Wasit)
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

  // 4. Background Task Eksekusi Penuh dengan waitUntil
  waitUntil(
    (async () => {
      try {
        const kickoffTime = match.matchDate ? new Date(match.matchDate).getTime() : 0;
        const isBeforeKickoff = kickoffTime > 0 && Date.now() < kickoffTime;
        const userIsAdmin = isAdminOrChief(interaction);

        // Blocker Kickoff untuk Wasit
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

        // Routing Subcommand
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

  // 5. Response Instan Type 5
  return {
    type: 5,
    data: { flags: 64 },
  };
}        
