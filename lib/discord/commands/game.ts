import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';

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
    return isAdminOrChief(interaction) || (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE));
  } catch {
    return false;
  }
}

function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) map[opt.name] = opt.value;
  return map;
}

async function resolveMatchFromChannel(channelId: string) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const currentMatch = schedules.find((m) => m.discordChannelId === channelId);
  if (currentMatch) return currentMatch;

  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.matchChannel?.channelId === channelId) {
      return schedules.find((m) => m.id === matchId) || null;
    }
  }
  return null;
}

async function syncCampTrackers(matchId: string, matchDateIso: string, reportData: any) {
  const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  const rawMsg = matchMessages[matchId];
  if (!rawMsg) return;

  const msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
  const mapTracker = (lineup: any[]): TrackerPlayer[] =>
    (lineup || []).map((p) => ({
      ign: p.ign,
      idDuelLinks: p.idDuelLinks || '',
      deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
      deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
    }));

  let changed = false;
  if (msgData.campA?.channelId) {
    const trackerIdA = await sendOrUpdateLiveTracker({
      channelId: msgData.campA.channelId,
      matchDateIso,
      submittedPlayers: mapTracker(reportData.teamA?.lineup),
      existingMsgId: msgData.campA.trackerMsgId,
    });
    msgData.campA.trackerMsgId = trackerIdA;
    changed = true;
  }
  if (msgData.campB?.channelId) {
    const trackerIdB = await sendOrUpdateLiveTracker({
      channelId: msgData.campB.channelId,
      matchDateIso,
      submittedPlayers: mapTracker(reportData.teamB?.lineup),
      existingMsgId: msgData.campB.trackerMsgId,
    });
    msgData.campB.trackerMsgId = trackerIdB;
    changed = true;
  }

  if (changed) {
    await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
  }
}

async function sendFollowup(interaction: any, payload: any) {
  const appId = process.env.DISCORD_CLIENT_ID;
  const token = interaction.token;
  await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', payload).catch(console.error);
}

export async function executeGameTask(interaction: any) {
  try {
    if (!isStaff(interaction)) {
      return sendFollowup(interaction, {
        content: '❌ Akses Ditolak! Hanya **Wasit Bertugas** dan **Admin** yang dapat menggunakan command ini.',
      });
    }

    const channelId = interaction.channel_id;
    const match = await resolveMatchFromChannel(channelId);
    if (!match) {
      return sendFollowup(interaction, {
        content: '❌ Command ini hanya dapat dijalankan di dalam **Channel Match** yang aktif!',
      });
    }

    const kickoffTime = match.matchDate ? new Date(match.matchDate).getTime() : 0;
    const isBeforeKickoff = kickoffTime > 0 && Date.now() < kickoffTime;
    const userIsAdmin = isAdminOrChief(interaction);

    // Blocker Kickoff
    if (isBeforeKickoff && !userIsAdmin) {
      const matchHourStr = new Date(match.matchDate).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).replace(':', '.') + ' WIB';
      return sendFollowup(interaction, {
        content: `⚠️ Pertandingan baru dimulai pukul **${matchHourStr}**. Command \`/game\` belum dapat digunakan sebelum kick-off.`,
      });
    }

    const reportData = (await kv.hget<any>('twi:match_reports', match.id)) || {};
    if (!reportData.teamA || !reportData.teamB) {
      return sendFollowup(interaction, {
        content: '❌ Dokumen match report belum ditemukan untuk pertandingan ini.',
      });
    }

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    // ========================================================================
    // SUBCOMMAND ADD
    // ========================================================================
    if (subCommandName === 'add') {
      const scoreA = reportData.teamA?.score || 0;
      const scoreB = reportData.teamB?.score || 0;

      if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
        return sendFollowup(interaction, {
          content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan.',
        });
      }

      const winnerOpt = optMap.pemenang; // 'A' | 'B'
      const playerAIgn = String(optMap.pemain_a || '').trim();
      const rawDeckA = String(optMap.deck_a || '').trim();
      const playerBIgn = String(optMap.pemain_b || '').trim();
      const rawDeckB = String(optMap.deck_b || '').trim();
      const ssHandA = optMap.ss_hand_a !== undefined ? Boolean(optMap.ss_hand_a) : true;
      const ssHandB = optMap.ss_hand_b !== undefined ? Boolean(optMap.ss_hand_b) : true;
      const notes = optMap.catatan || '';

      const isRepeatA = rawDeckA.startsWith('REPEAT:');
      const isRepeatB = rawDeckB.startsWith('REPEAT:');
      const deckAName = isRepeatA ? rawDeckA.replace('REPEAT:', '') : rawDeckA;
      const deckBName = isRepeatB ? rawDeckB.replace('REPEAT:', '') : rawDeckB;

      const lineupA: any[] = reportData.teamA?.lineup || [];
      const lineupB: any[] = reportData.teamB?.lineup || [];

      const pA = lineupA.find((p) => String(p.ign || '').toLowerCase() === playerAIgn.toLowerCase());
      const pB = lineupB.find((p) => String(p.ign || '').toLowerCase() === playerBIgn.toLowerCase());

      if (!pA) return sendFollowup(interaction, { content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar!` });
      if (!pB) return sendFollowup(interaction, { content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar!` });

      const dA = [pA.deck1, pA.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase());
      const dB = [pB.deck1, pB.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase());

      if (!dA) return sendFollowup(interaction, { content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!` });
      if (!dB) return sendFollowup(interaction, { content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!` });

      // Eksekusi Repeat: Matikan deck kedua
      if (isRepeatA) {
        reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
        dA.isRepeatUsed = true;
        dA.isDead = false;
        if (pA.deck2) pA.deck2.isDead = true;
        pA.remainingLife = 1;
      }

      if (isRepeatB) {
        reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
        dB.isRepeatUsed = true;
        dB.isDead = false;
        if (pB.deck2) pB.deck2.isDead = true;
        pB.remainingLife = 1;
      }

      const gameNumber = (reportData.games?.length || 0) + 1;
      const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

      // Kalkulasi Skor & Nyawa
      if (winnerOpt === 'A') {
        reportData.teamA.score = scoreA + 1;
        dA.wins = (dA.wins || 0) + 1;
        pA.totalWins = (pA.totalWins || 0) + 1;

        pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
        dB.isDead = true;
        dB.losses = (dB.losses || 0) + 1;
        pB.totalLosses = (pB.totalLosses || 0) + 1;
      } else {
        reportData.teamB.score = scoreB + 1;
        dB.wins = (dB.wins || 0) + 1;
        pB.totalWins = (pB.totalWins || 0) + 1;

        pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
        dA.isDead = true;
        dA.losses = (dA.losses || 0) + 1;
        pA.totalLosses = (pA.totalLosses || 0) + 1;
      }

      dA.lastGameNumber = gameNumber;
      dB.lastGameNumber = gameNumber;

      // Pengecekan SS Hand
      const warningLogs: string[] = [];
      if (!ssHandA) {
        reportData.teamA.warningsUsed = (reportData.teamA.warningsUsed || 0) + 1;
        warningLogs.push(`⚠️ ${reportData.teamA.name} tidak kirim SS Hand (Warning ke-${reportData.teamA.warningsUsed})`);
      }
      if (!ssHandB) {
        reportData.teamB.warningsUsed = (reportData.teamB.warningsUsed || 0) + 1;
        warningLogs.push(`⚠️ ${reportData.teamB.name} tidak kirim SS Hand (Warning ke-${reportData.teamB.warningsUsed})`);
      }

      const gameRecord = {
        gameNumber,
        winner: winnerTeamKey,
        playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill, isRepeat: isRepeatA },
        playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill, isRepeat: isRepeatB },
        ssHandA,
        ssHandB,
        notes,
        timestamp: new Date().toISOString(),
      };

      if (!reportData.games) reportData.games = [];
      reportData.games.push(gameRecord);
      reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

      const isTeamAWon = reportData.teamA.score >= 10 || lineupB.every((p: any) => (p.remainingLife ?? 0) <= 0);
      const isTeamBWon = reportData.teamB.score >= 10 || lineupA.every((p: any) => (p.remainingLife ?? 0) <= 0);

      if (isTeamAWon) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamA';
      } else if (isTeamBWon) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamB';
      }

      // Bypass KV & Camp Tracker jika admin sebelum kickoff
      if (!isBeforeKickoff) {
        await kv.hset('twi:match_reports', { [match.id]: reportData });
        syncCampTrackers(match.id, match.matchDate, reportData).catch(console.error);
      }

      const winnerName = winnerOpt === 'A' ? reportData.teamA.name : reportData.teamB.name;
      const gameEmbed = {
        title: `⚔️ HASIL GAME ${gameNumber} — ${winnerName} WIN!`,
        color: winnerOpt === 'A' ? 0x3b82f6 : 0xef4444,
        description:
          `**${reportData.teamA.name}** \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` **${reportData.teamB.name}**\n\n` +
          `• **Tim A:** ${pA.ign} (${isRepeatA ? 'Repeat ' : ''}${dA.archetype})\n` +
          `• **Tim B:** ${pB.ign} (${isRepeatB ? 'Repeat ' : ''}${dB.archetype})\n` +
          (warningLogs.length > 0 ? `• ${warningLogs.join('\n• ')}\n` : '') +
          (notes ? `• **Catatan Wasit:** *${notes}*\n` : ''),
        footer: { text: getEmbedFooterText() },
      };

      // Jika sebelum kickoff oleh admin, hanya tampil di respon interaksi (ephemeral)
      if (isBeforeKickoff && userIsAdmin) {
        return sendFollowup(interaction, { embeds: [gameEmbed] });
      }

      // Kirim hasil resmi ke channel publik
      await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [gameEmbed] });
      return sendFollowup(interaction, { content: `✅ **Game ${gameNumber} berhasil dicatat.**` });
    }

    // ========================================================================
    // SUBCOMMAND DEL (ROLLBACK)
    // ========================================================================
    if (subCommandName === 'del') {
      const games: any[] = reportData.games || [];
      if (games.length === 0) {
        return sendFollowup(interaction, {
          content: '⚠️ **Belum ada riwayat game yang dicatat!**',
        });
      }

      const poppedGame = games.pop();
      const winner = poppedGame.winner;

      if (winner === 'teamA') {
        reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      } else {
        reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
      }

      if (!poppedGame.ssHandA) reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 1) - 1);
      if (!poppedGame.ssHandB) reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 1) - 1);

      const pA = (reportData.teamA.lineup || []).find((p: any) => p.ign.toLowerCase() === poppedGame.playerA.ign.toLowerCase());
      if (pA) {
        const dA = [pA.deck1, pA.deck2].find((d) => d && d.archetype?.toLowerCase() === poppedGame.playerA.archetype?.toLowerCase());
        if (winner === 'teamA') {
          if (dA) dA.wins = Math.max(0, (dA.wins || 1) - 1);
          pA.totalWins = Math.max(0, (pA.totalWins || 1) - 1);
        } else {
          if (dA) {
            dA.isDead = false;
            dA.losses = Math.max(0, (dA.losses || 1) - 1);
          }
          pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
          pA.totalLosses = Math.max(0, (pA.totalLosses || 1) - 1);
        }
        if (poppedGame.playerA.isRepeat) {
          reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 1) - 1);
          if (dA) dA.isRepeatUsed = false;
          if (pA.deck2) pA.deck2.isDead = false;
        }
      }

      const pB = (reportData.teamB.lineup || []).find((p: any) => p.ign.toLowerCase() === poppedGame.playerB.ign.toLowerCase());
      if (pB) {
        const dB = [pB.deck1, pB.deck2].find((d) => d && d.archetype?.toLowerCase() === poppedGame.playerB.archetype?.toLowerCase());
        if (winner === 'teamB') {
          if (dB) dB.wins = Math.max(0, (dB.wins || 1) - 1);
          pB.totalWins = Math.max(0, (pB.totalWins || 1) - 1);
        } else {
          if (dB) {
            dB.isDead = false;
            dB.losses = Math.max(0, (dB.losses || 1) - 1);
          }
          pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
          pB.totalLosses = Math.max(0, (pB.totalLosses || 1) - 1);
        }
        if (poppedGame.playerB.isRepeat) {
          reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 1) - 1);
          if (dB) dB.isRepeatUsed = false;
          if (pB.deck2) pB.deck2.isDead = false;
        }
      }

      reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };
      reportData.isFinished = false;
      reportData.winnerTeam = null;

      if (!isBeforeKickoff) {
        await kv.hset('twi:match_reports', { [match.id]: reportData });
        syncCampTrackers(match.id, match.matchDate, reportData).catch(console.error);
      }

      return sendFollowup(interaction, {
        content: `🔄 **Game ${poppedGame.gameNumber} Di-Rollback!** Skor kembali menjadi **${reportData.teamA.name} \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ${reportData.teamB.name}**.`,
      });
    }

    return sendFollowup(interaction, { content: 'Subcommand tidak dikenali.' });
  } catch (error: any) {
    console.error('Error executeGameTask:', error);
    return sendFollowup(interaction, { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}` });
  }
}

export async function handleGameCommand(interaction: any) {
  executeGameTask(interaction);
  return { type: 5, data: { flags: 64 } };
    }
      
