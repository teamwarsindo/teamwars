import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers, getTeamEmojiByMatch, resolveStreamDisplay } from './types';
import { syncOfficialMatchReport } from './official-report';

export async function handleGameDel(ctx: GameContext) {
  const { channelId, appId, token, match, reportData } = ctx;

  const games: any[] = reportData.games || [];
  if (games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '❌ **Belum ada game yang dicatat untuk pertandingan ini.**',
    });
  }

  // Ambil game terakhir yang akan di-rollback
  const lastGame = games.pop();
  const deletedGameNumber = lastGame.gameNumber;

  // 1. Rollback Statistik Tim & Pemain
  const isAWin = lastGame.winner === 'teamA';
  const winnerTeamKey = isAWin ? 'teamA' : 'teamB';
  const loserTeamKey = isAWin ? 'teamB' : 'teamA';

  reportData[winnerTeamKey].score = Math.max(0, (reportData[winnerTeamKey].score || 0) - 1);

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => p.ign?.toLowerCase() === lastGame.playerA?.ign?.toLowerCase());
  const pB = lineupB.find((p) => p.ign?.toLowerCase() === lastGame.playerB?.ign?.toLowerCase());

  const dA = pA ? [pA.deck1, pA.deck2].find((d) => d && d.archetype?.toLowerCase() === lastGame.playerA?.archetype?.toLowerCase()) : null;
  const dB = pB ? [pB.deck1, pB.deck2].find((d) => d && d.archetype?.toLowerCase() === lastGame.playerB?.archetype?.toLowerCase()) : null;

  if (isAWin) {
    if (pA) pA.totalWins = Math.max(0, (pA.totalWins || 0) - 1);
    if (dA) dA.wins = Math.max(0, (dA.wins || 0) - 1);

    if (pB) {
      pB.totalLosses = Math.max(0, (pB.totalLosses || 0) - 1);
      pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
    }
    if (dB) {
      dB.losses = Math.max(0, (dB.losses || 0) - 1);
      dB.isDead = false;
    }
  } else {
    if (pB) pB.totalWins = Math.max(0, (pB.totalWins || 0) - 1);
    if (dB) dB.wins = Math.max(0, (dB.wins || 0) - 1);

    if (pA) {
      pA.totalLosses = Math.max(0, (pA.totalLosses || 0) - 1);
      pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
    }
    if (dA) {
      dA.losses = Math.max(0, (dA.losses || 0) - 1);
      dA.isDead = false;
    }
  }

  // Rollback status repeat jika duel tersebut memakai repeat
  if (lastGame.playerA?.isRepeat && pA && dA) {
    reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 0) - 1);
    dA.isRepeatUsed = false;
    if (pA.deck1) pA.deck1.isDead = false;
    if (pA.deck2) pA.deck2.isDead = false;
    pA.remainingLife = 2;
  }

  if (lastGame.playerB?.isRepeat && pB && dB) {
    reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 0) - 1);
    dB.isRepeatUsed = false;
    if (pB.deck1) pB.deck1.isDead = false;
    if (pB.deck2) pB.deck2.isDead = false;
    pB.remainingLife = 2;
  }

  // Rollback pelanggaran SS Hand & Deckloss
  if (lastGame.ssHandA === false) {
    if (lastGame.isDeckloss && lastGame.decklossTeam === 'teamA') {
      reportData.teamA.warningsUsed = 1;
      reportData.teamB.score = Math.max(0, (reportData.teamB.score || 0) - 1);
    } else {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) - 1);
    }
  }

  if (lastGame.ssHandB === false) {
    if (lastGame.isDeckloss && lastGame.decklossTeam === 'teamB') {
      reportData.teamB.warningsUsed = 1;
      reportData.teamA.score = Math.max(0, (reportData.teamA.score || 0) - 1);
    } else {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) - 1);
    }
  }

  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  // 2. Reset Status Selesai jika skor turun di bawah 10
  const isStillEnded = reportData.teamA.score >= 10 || reportData.teamB.score >= 10;
  if (!isStillEnded) {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  const matchWeek = match.weekNumber ?? reportData.week ?? 5;

  // Simpan KV
  await kv.hset('twi:match_reports', { [match.id]: reportData });

  // Sync Camp Trackers setelah rollback
  const currentLastGame = games.length > 0 ? games[games.length - 1] : null;
  await syncCampTrackers(match.id, matchWeek, reportData, match, currentLastGame).catch(console.error);

  // Jika sebelumnya sudah mengirim official report dan sekarang skor turun, lakukan patch ulang
  if (isStillEnded) {
    await syncOfficialMatchReport(match, reportData).catch(console.error);
  }

  // 3. Render Ulang Embed Match Report di Match Channel
  let hasRepeatInLogs = false;
  let hasDecklossInLogs = false;

  const matchLogsLines = games.map((g: any) => {
    const isWin = g.winner === 'teamA';
    const isDecklossA = g.isDeckloss && g.decklossTeam === 'teamA';
    const isDecklossB = g.isDeckloss && g.decklossTeam === 'teamB';

    if (g.isDeckloss) hasDecklossInLogs = true;
    if (g.playerA?.isRepeat || g.playerB?.isRepeat) hasRepeatInLogs = true;

    let tagA = isWin ? 'W' : 'L';
    let tagB = isWin ? 'L' : 'W';

    if (g.playerA?.isRepeat) tagA = isWin ? 'WR' : 'LR';
    if (g.playerB?.isRepeat) tagB = isWin ? 'LR' : 'WR';
    if (isDecklossA) tagA = 'TL';
    if (isDecklossB) tagB = 'TL';

    return `• **G${g.gameNumber}:** ${g.playerA.ign} **${tagA} — ${tagB}** ${g.playerB.ign}`;
  });

  let glossaryText = '';
  if (hasRepeatInLogs && hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat) • TL = Technical Loss (Deckloss)*`;
  } else if (hasRepeatInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: TL = Technical Loss (Deckloss)*`;
  }

  const m = match as any;
  const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
  const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);

  const teamNameA = String(reportData.teamA?.name || 'TIM A').toUpperCase();
  const teamNameB = String(reportData.teamB?.name || 'TIM B').toUpperCase();

  const refereeDisplay = m.refereeDiscordId ? `<@${m.refereeDiscordId}>` : m.refereeName || m.referee || 'Belum ditentukan';
  const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);

  const nextGameNumber = games.length + 1;
  let sectionHeader = `📢 **Instruksi Game #${nextGameNumber}:**`;
  let instructionLines: string[] = [];

  if (games.length === 0) {
    instructionLines.push(`• Pertandingan di-reset ke Game 1. Persiapkan pemain pertama.`);
  } else {
    instructionLines.push(`• Game ${deletedGameNumber} telah dihapus. Silakan wasit mencatat ulang Game #${nextGameNumber}.`);
  }

  const matchEmbed = {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: hexToDecimal('#f59e0b'),
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Live Match:** ${streamUrlDisplay}\n\n` +
      `**Match Logs:**\n` +
      (matchLogsLines.length > 0 ? matchLogsLines.join('\n') : '• Belum ada log duel.') +
      `${glossaryText}\n\n` +
      `${sectionHeader}\n` +
      instructionLines.join('\n') +
      `\n\n` +
      `### ${emojiA} ${teamNameA} vs ${teamNameB} ${emojiB}\n` +
      `# **${reportData.teamA.score} — ${reportData.teamB.score}**`,
    footer: { text: getEmbedFooterText() },
  };

  // Delete pesan match report lama lalu kirim yang baru
  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', match.id);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};

    const oldReportMsgId = msgData.matchChannel?.lastReportMsgId;
    if (oldReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${oldReportMsgId}`, 'DELETE').catch(() => null);
    }

    const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });

    if (postRes?.id) {
      const freshRaw = await kv.hget<any>('discord:match_messages', match.id);
      let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : msgData;

      if (!freshData.matchChannel) freshData.matchChannel = { channelId };
      freshData.matchChannel.channelId = channelId;
      freshData.matchChannel.lastReportMsgId = postRes.id;

      await kv.hset('discord:match_messages', { [match.id]: freshData });
    }
  } catch (err) {
    console.error('Error saat update match report di del.ts:', err);
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🗑️ **Game ${deletedGameNumber} berhasil dihapus dan skor di-rollback.**`,
  });
}
