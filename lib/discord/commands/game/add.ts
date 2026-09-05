import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers, getTeamEmojiByMatch, resolveStreamDisplay } from './types';

export async function handleGameAdd(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;

  if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan.',
    });
  }

  const winnerOpt = optMap.pemenang;
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

  if (!pA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar!` });
  if (!pB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar!` });

  const dA = [pA.deck1, pA.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase());
  const dB = [pB.deck1, pB.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase());

  if (!dA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!` });
  if (!dB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!` });

  const gameNumber = (reportData.games?.length || 0) + 1;

  // 1. Logika Repeat
  if (isRepeatA) {
    reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
    dA.isRepeatUsed = true;
    dA.isDead = false;
    if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = true;
    if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = true;
    pA.remainingLife = 1;
  }

  if (isRepeatB) {
    reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
    dB.isRepeatUsed = true;
    dB.isDead = false;
    if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = true;
    if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = true;
    pB.remainingLife = 1;
  }

  const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

  // 2. Kalkulasi Skor & Status Hidup
  if (winnerOpt === 'A') {
    reportData.teamA.score = scoreA + 1;
    dA.wins = (dA.wins || 0) + 1;
    dA.lastGameNumber = gameNumber;
    pA.totalWins = (pA.totalWins || 0) + 1;

    pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
    dB.isDead = true;
    dB.losses = (dB.losses || 0) + 1;
    dB.lastGameNumber = gameNumber;
    pB.totalLosses = (pB.totalLosses || 0) + 1;
  } else {
    reportData.teamB.score = scoreB + 1;
    dB.wins = (dB.wins || 0) + 1;
    dB.lastGameNumber = gameNumber;
    pB.totalWins = (pB.totalWins || 0) + 1;

    pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
    dA.isDead = true;
    dA.losses = (dA.losses || 0) + 1;
    dA.lastGameNumber = gameNumber;
    pA.totalLosses = (pA.totalLosses || 0) + 1;
  }

  // 3. Akumulasi Warning SS Hand & Deckloss
  let isDecklossOccurred = false;
  let decklossTeam = '';

  if (!ssHandA) {
    const currentW = (reportData.teamA.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamA.warningsUsed = 0;
      reportData.teamB.score = (reportData.teamB.score || 0) + 1;
      isDecklossOccurred = true;
      decklossTeam = 'teamA';
    } else {
      reportData.teamA.warningsUsed = currentW;
    }
  }

  if (!ssHandB) {
    const currentW = (reportData.teamB.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamB.warningsUsed = 0;
      reportData.teamA.score = (reportData.teamA.score || 0) + 1;
      isDecklossOccurred = true;
      decklossTeam = 'teamB';
    } else {
      reportData.teamB.warningsUsed = currentW;
    }
  }

  const isPlayerARepeatActive = dA.isRepeatUsed === true;
  const isPlayerBRepeatActive = dB.isRepeatUsed === true;

  const gameRecord = {
    gameNumber,
    winner: winnerTeamKey,
    playerA: { ign: pA.ign, archetype: dA.archetype, skill: dA.skill, isRepeat: isPlayerARepeatActive },
    playerB: { ign: pB.ign, archetype: dB.archetype, skill: dB.skill, isRepeat: isPlayerBRepeatActive },
    ssHandA,
    ssHandB,
    isDeckloss: isDecklossOccurred,
    decklossTeam,
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

  const matchWeek = match.weekNumber ?? 5;

  // Simpan KV & Tunggu Sync Camp Trackers Selesai
  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    await syncCampTrackers(match.id, matchWeek, reportData, match, gameRecord).catch(console.error);
  }

  // 4. Format Match Logs Simetris
  let hasRepeatInLogs = false;
  let hasDecklossInLogs = false;

  const matchLogsLines = reportData.games.map((g: any) => {
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

  // Keterangan Legenda Rapat
  let glossaryText = '';
  if (hasRepeatInLogs && hasDecklossInLogs) {
    glossaryText = `\n*Keterangan: WR/LR = Win/Loss (Repeat) • TL = Technical Loss (Deckloss)*`;
  } else if (hasRepeatInLogs) {
    glossaryText = `\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDecklossInLogs) {
    glossaryText = `\n*Keterangan: TL = Technical Loss (Deckloss)*`;
  }

  // 5. Metadata Pertandingan & Warna Garis
  const m = match as any;
  const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
  const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);

  const refereeDisplay = m.refereeDiscordId ? `<@${m.refereeDiscordId}>` : m.refereeName || m.referee || 'Belum ditentukan';
  const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);

  const winnerColorHex = winnerOpt === 'A' 
    ? (match?.teamAColor || '#3b82f6') 
    : (match?.teamBColor || '#ef4444');

  // 6. Instruksi Game Berikutnya
  const nextGameNumber = reportData.games.length + 1;
  const winnerPlayerIgn = winnerOpt === 'A' ? pA.ign : pB.ign;
  const loserPlayerObj = winnerOpt === 'A' ? pB : pA;
  const loserTeam = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
  const loserTeamRepeatsUsed = loserTeam.repeatsUsed || 0;

  let instructionLines: string[] = [];

  if (reportData.isFinished) {
    instructionLines.push(
      `• Pertandingan telah selesai! Selamat kepada **${winnerOpt === 'A' ? reportData.teamA.name : reportData.teamB.name}** atas kemenangannya.`
    );
  } else {
    instructionLines.push(`• **${winnerPlayerIgn}** (Stay table)`);

    if (isDecklossOccurred && (loserPlayerObj.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loserTeam.name}** terkena sanksi akumulasi 2x Warning SS Hand (Deckloss)`);
      instructionLines.push(`• **${loserPlayerObj.ign}** telah gugur, sanksi Deckloss wajib dibebankan ke pemain pilihan tim selanjutnya`);
      instructionLines.push(`• **${loserTeam.name}** tentukan pemain berikutnya beserta deck yang akan dipotong Deckloss`);
    } else if ((loserPlayerObj.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loserTeam.name}** (Next player)`);
    } else {
      const canRepeat = loserTeamRepeatsUsed < 2 && (loserPlayerObj.totalWins || 0) === 0;
      if (canRepeat) {
        instructionLines.push(`• **${loserPlayerObj.ign}** (Next deck or repeat)`);
      } else {
        instructionLines.push(`• **${loserPlayerObj.ign}** (Next deck)`);
      }
    }
  }

  // 7. Render Embed Match Report Rapat
  const matchEmbed = {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: hexToDecimal(winnerColorHex),
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Live Match:** ${streamUrlDisplay}\n\n` +
      `**Match Logs:**\n` +
      matchLogsLines.join('\n') +
      `${glossaryText}\n\n` +
      `## ${emojiA} **${reportData.teamA.score} — ${reportData.teamB.score}** ${emojiB}\n\n` +
      `📢 **Instruksi Game #${nextGameNumber}:**\n` +
      instructionLines.join('\n'),
    footer: { text: getEmbedFooterText() },
  };

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  // 8. Delete Terlebih Dahulu, Lalu Post Baru & Simpan ID
  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', match.id);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};

    // Hapus pesan report lama jika ID-nya ada
    const oldReportMsgId = msgData.matchChannel?.lastReportMsgId;
    if (oldReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${oldReportMsgId}`, 'DELETE').catch((err) => {
        console.warn(`Gagal menghapus pesan lama ${oldReportMsgId}:`, err);
      });
    }

    // Setelah delete berhasil dijalankan, baru kirim embed baru
    const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });

    // Simpan ID pesan yang baru saja di-post ke database
    if (postRes?.id) {
      const freshRaw = await kv.hget<any>('discord:match_messages', match.id);
      let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : msgData;

      if (!freshData.matchChannel) freshData.matchChannel = { channelId };
      freshData.matchChannel.channelId = channelId;
      freshData.matchChannel.lastReportMsgId = postRes.id;

      await kv.hset('discord:match_messages', { [match.id]: freshData });
    }
  } catch (err) {
    console.error('Error saat delete-and-repost match report:', err);
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
      }
