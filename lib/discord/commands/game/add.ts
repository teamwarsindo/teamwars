import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers, getTeamEmoji } from './types';

export async function handleGameAdd(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;

  if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
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

  if (!pA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar!` });
  if (!pB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar!` });

  const dA = [pA.deck1, pA.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase());
  const dB = [pB.deck1, pB.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase());

  if (!dA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!` });
  if (!dB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!` });

  // 1. Logika Repeat (Maksimal 2x per tim)
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

  const gameNumber = (reportData.games?.length || 0) + 1;
  const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

  // 2. Kalkulasi Skor & Status Hidup
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

  // 3. Logika 2x Warning SS Hand = Deckloss & Reset
  let decklossNotice = '';
  if (!ssHandA) {
    const currentW = (reportData.teamA.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamA.warningsUsed = 0;
      reportData.teamB.score = (reportData.teamB.score || 0) + 1;
      decklossNotice += `\n⚠️ **${reportData.teamA.name}** terkena akumulasi 2x Warning SS Hand! Kena sanksi **Deckloss** (+1 Poin untuk ${reportData.teamB.name}) & status warning di-reset ke 0.`;
    } else {
      reportData.teamA.warningsUsed = currentW;
    }
  }

  if (!ssHandB) {
    const currentW = (reportData.teamB.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamB.warningsUsed = 0;
      reportData.teamA.score = (reportData.teamA.score || 0) + 1;
      decklossNotice += `\n⚠️ **${reportData.teamB.name}** terkena akumulasi 2x Warning SS Hand! Kena sanksi **Deckloss** (+1 Poin untuk ${reportData.teamA.name}) & status warning di-reset ke 0.`;
    } else {
      reportData.teamB.warningsUsed = currentW;
    }
  }

  const gameRecord = {
    gameNumber,
    winner: winnerTeamKey,
    playerA: { ign: pA.ign, archetype: dA.archetype, skill: dA.skill, isRepeat: isRepeatA },
    playerB: { ign: pB.ign, archetype: dB.archetype, skill: dB.skill, isRepeat: isRepeatB },
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

  const matchWeek = match.weekNumber || 5;

  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    syncCampTrackers(match.id, matchWeek, reportData).catch(console.error);
  }

  // 4. Susun Match Logs baris per baris
  const matchLogsLines = reportData.games.map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const tagRA = g.playerA.isRepeat ? ' `[R]`' : '';
    const tagRB = g.playerB.isRepeat ? ' `[R]`' : '';
    const resA = isAWin ? '`[W]`' : '`[L]`';
    const resB = !isAWin ? '`[W]`' : '`[L]`';
    return `• **G${g.gameNumber}:** **${g.playerA.ign}** *(${g.playerA.archetype})*${tagRA} ${resA} ⸺ ${resB} **${g.playerB.ign}** *(${g.playerB.archetype})*${tagRB}`;
  });

  // 5. Susun Instruksi Publik Singkat & Umum (Anti-Spoiler)
  const winnerPlayerIgn = winnerOpt === 'A' ? pA.ign : pB.ign;
  const loserPlayerObj = winnerOpt === 'A' ? pB : pA;
  const loserTeam = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
  const loserTeamLineup = winnerOpt === 'A' ? lineupB : lineupA;

  let loserInstruction = '';
  if ((loserPlayerObj.remainingLife ?? 2) <= 0) {
    const countGugur = loserTeamLineup.filter((x: any) => (x.remainingLife ?? 2) <= 0).length;
    const urutanStr = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima'][countGugur] || 'berikutnya';
    loserInstruction = `• **${loserTeam.name}** pilih pemain ${urutanStr}`;
  } else {
    loserInstruction = `• **${loserPlayerObj.ign}** silakan gunakan repeat atau pakai deck selanjutnya`;
  }

  const instructions = reportData.isFinished
    ? `• Pertandingan telah selesai! Selamat kepada **${winnerOpt === 'A' ? reportData.teamA.name : reportData.teamB.name}** atas kemenangannya.`
    : `• **${winnerPlayerIgn}** bertahan di meja\n${loserInstruction}`;

  // 6. Data Header & Streamer
  const emojiA = getTeamEmoji(reportData.teamA);
  const emojiB = getTeamEmoji(reportData.teamB);
  const refereeName = match.refereeName || match.referee || 'Wasit Bertugas';
  const streamerInfo = match.streamUrl ? `[Tonton Live Streaming](${match.streamUrl})` : (match.streamer || '-');
  const dateFormatted = match.matchDate
    ? new Date(match.matchDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
  const timeFormatted = match.matchDate
    ? new Date(match.matchDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.') + ' WIB'
    : '-';

  const matchEmbed = {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: winnerOpt === 'A' ? 0x3b82f6 : 0xef4444,
    description:
      `${emojiA} **${reportData.teamA.name}** \`${reportData.teamA.score}\` ⸺ \`${reportData.teamB.score}\` **${reportData.teamB.name}** ${emojiB}\n\n` +
      `**Informasi:**\n` +
      `• **Referee:** ${refereeName}\n` +
      `• **Streamer:** ${streamerInfo}\n` +
      `• **Jadwal:** ${dateFormatted} • ${timeFormatted}\n` +
      (decklossNotice ? `${decklossNotice}\n` : '') +
      `\n**Match Logs:**\n` +
      matchLogsLines.join('\n') +
      `\n\n📢 **Instruksi:**\n${instructions}`,
    footer: { text: getEmbedFooterText() },
  };

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });
  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
    }
