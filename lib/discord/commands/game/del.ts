import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers, getTeamEmojiByMatch, resolveStreamDisplay } from './types';

export async function handleGameDel(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff } = ctx;
  const games: any[] = reportData.games || [];

  if (games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Belum ada riwayat game yang dicatat!**',
    });
  }

  const targetGameNum = optMap.game_number ? Number(optMap.game_number) : games.length;
  if (targetGameNum !== games.length) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Rollback saat ini hanya dapat dilakukan pada game terakhir (**Game ${games.length}**)!`,
    });
  }

  const poppedGame = games.pop();
  const winner = poppedGame.winner;

  // 1. Rollback Skor Dasar Duel
  if (winner === 'teamA') {
    reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
  } else {
    reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
  }

  // 2. Rollback Sanksi Deckloss Tambahan
  if (poppedGame.isDeckloss) {
    if (poppedGame.decklossTeam === 'teamA') {
      reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
      reportData.teamA.warningsUsed = 1;
    } else if (poppedGame.decklossTeam === 'teamB') {
      reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      reportData.teamB.warningsUsed = 1;
    }
  } else {
    if (poppedGame.ssHandA === false) {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 1) - 1);
    }
    if (poppedGame.ssHandB === false) {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 1) - 1);
    }
  }

  // 3. Rollback State Pemain & Deck Tim A
  const pA = (reportData.teamA.lineup || []).find(
    (p: any) => p.ign?.toLowerCase() === poppedGame.playerA?.ign?.toLowerCase()
  );
  if (pA) {
    const dA = [pA.deck1, pA.deck2].find(
      (d) => d && d.archetype?.toLowerCase() === poppedGame.playerA?.archetype?.toLowerCase()
    );

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

    const otherGamesWithSameDeckA = games.filter(
      (g) => g.playerA?.ign?.toLowerCase() === pA.ign?.toLowerCase() &&
             g.playerA?.archetype?.toLowerCase() === dA?.archetype?.toLowerCase() &&
             g.playerA?.isRepeat
    );

    if (poppedGame.playerA?.isRepeat && otherGamesWithSameDeckA.length === 0) {
      reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 1) - 1);
      if (dA) dA.isRepeatUsed = false;
      if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = false;
      if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = false;
    }
  }

  // 4. Rollback State Pemain & Deck Tim B
  const pB = (reportData.teamB.lineup || []).find(
    (p: any) => p.ign?.toLowerCase() === poppedGame.playerB?.ign?.toLowerCase()
  );
  if (pB) {
    const dB = [pB.deck1, pB.deck2].find(
      (d) => d && d.archetype?.toLowerCase() === poppedGame.playerB?.archetype?.toLowerCase()
    );

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

    const otherGamesWithSameDeckB = games.filter(
      (g) => g.playerB?.ign?.toLowerCase() === pB.ign?.toLowerCase() &&
             g.playerB?.archetype?.toLowerCase() === dB?.archetype?.toLowerCase() &&
             g.playerB?.isRepeat
    );

    if (poppedGame.playerB?.isRepeat && otherGamesWithSameDeckB.length === 0) {
      reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 1) - 1);
      if (dB) dB.isRepeatUsed = false;
      if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = false;
      if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = false;
    }
  }

  // 5. Update Status Match Selesai & Skor Akhir
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };
  reportData.isFinished = false;
  reportData.winnerTeam = null;

  const matchWeek = match.weekNumber ?? 5;

  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    // Pada rollback selalu trigger pembaruan tracker
    syncCampTrackers(match.id, matchWeek, reportData, match).catch(console.error);
  }

  // 6. Susun Ulang Match Report Embed Setelah Rollback
  const m = match as any;
  const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
  const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);
  const refereeDisplay = m.refereeDiscordId ? `<@${m.refereeDiscordId}>` : m.refereeName || m.referee || 'Belum ditentukan';
  const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);

  let hasRepeatInLogs = false;
  let hasDecklossInLogs = false;

  const matchLogsLines = games.map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const isDecklossA = g.isDeckloss && g.decklossTeam === 'teamA';
    const isDecklossB = g.isDeckloss && g.decklossTeam === 'teamB';

    if (g.isDeckloss) hasDecklossInLogs = true;
    if (g.playerA?.isRepeat || g.playerB?.isRepeat) hasRepeatInLogs = true;

    let scoreTagA = isAWin ? 'W' : 'L';
    let scoreTagB = isAWin ? 'L' : 'W';

    if (g.playerA?.isRepeat) scoreTagA = isAWin ? 'WR' : 'LR';
    if (g.playerB?.isRepeat) scoreTagB = isAWin ? 'LR' : 'WR';
    if (isDecklossA) scoreTagA = 'TL';
    if (isDecklossB) scoreTagB = 'TL';

    return `• **G${g.gameNumber}:** ${g.playerA.ign} **${scoreTagA} — ${scoreTagB}** ${g.playerB.ign}`;
  });

  let glossaryText = '';
  if (hasRepeatInLogs && hasDecklossInLogs) {
    glossaryText = `\n*Keterangan: WR/LR = Win/Loss (Repeat) • TL = Technical Loss (Deckloss)*`;
  } else if (hasRepeatInLogs) {
    glossaryText = `\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDecklossInLogs) {
    glossaryText = `\n*Keterangan: TL = Technical Loss (Deckloss)*`;
  }

  const nextGameNumber = games.length + 1;
  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  let instructionLines: string[] = [];

  if (!lastGame) {
    instructionLines.push(`• **${reportData.teamA.name}** & **${reportData.teamB.name}** persiapkan pemain pertama.`);
  } else {
    const isLastWinA = lastGame.winner === 'teamA';
    const winPlayer = isLastWinA ? lastGame.playerA?.ign : lastGame.playerB?.ign;
    const losePlayerObj = isLastWinA
      ? (reportData.teamB.lineup || []).find((p: any) => p.ign?.toLowerCase() === lastGame.playerB?.ign?.toLowerCase())
      : (reportData.teamA.lineup || []).find((p: any) => p.ign?.toLowerCase() === lastGame.playerA?.ign?.toLowerCase());
    const loseTeam = isLastWinA ? reportData.teamB : reportData.teamA;

    instructionLines.push(`• **${winPlayer}** (Stay table)`);
    if ((losePlayerObj?.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loseTeam.name}** (Next player)`);
    } else {
      const canRepeat = (loseTeam.repeatsUsed || 0) < 2 && (losePlayerObj?.totalWins || 0) === 0;
      if (canRepeat) {
        instructionLines.push(`• **${losePlayerObj?.ign}** (Next deck or repeat)`);
      } else {
        instructionLines.push(`• **${losePlayerObj?.ign}** (Next deck)`);
      }
    }
  }

  // Gunakan warna tim pemenang dari game terakhir, atau default amber saat rollback ke game awal
  let rollbackColorHex = '#f59e0b';
  if (lastGame) {
    rollbackColorHex = lastGame.winner === 'teamA' 
      ? (match?.teamAColor || '#3b82f6') 
      : (match?.teamBColor || '#ef4444');
  }

  const matchEmbed = {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: hexToDecimal(rollbackColorHex),
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Live Match:** ${streamUrlDisplay}\n\n` +
      `**Match Logs:**\n` +
      (matchLogsLines.length > 0 ? matchLogsLines.join('\n') : '• *Belum ada riwayat game.*') +
      `${glossaryText}\n\n` +
      `## ${emojiA} **${reportData.teamA.score} — ${reportData.teamB.score}** ${emojiB}\n\n` +
      `📢 **Instruksi Game #${nextGameNumber}:**\n` +
      instructionLines.join('\n'),
    footer: { text: getEmbedFooterText() },
  };

  // 7. Delete-and-Repost Match Report di Channel Utama
  const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  const rawMsg = matchMessages[match.id];
  let msgData: any = {};
  if (rawMsg) {
    msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (msgData.matchChannel?.lastReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${msgData.matchChannel.lastReportMsgId}`, 'DELETE').catch(() => null);
    }
  }

  const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });
  if (postRes?.id) {
    if (!msgData.matchChannel) msgData.matchChannel = { channelId };
    msgData.matchChannel.lastReportMsgId = postRes.id;
    await kv.hset('discord:match_messages', { [match.id]: JSON.stringify(msgData) });
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🔄 **Game ${poppedGame.gameNumber} Di-Rollback!** Skor kembali menjadi **${reportData.teamA.name} \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ${reportData.teamB.name}**.`,
  });
}
