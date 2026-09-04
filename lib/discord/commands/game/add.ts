import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers } from './types';

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

  if (!pA) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar!`,
    });
  }
  if (!pB) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar!`,
    });
  }

  const dA = [pA.deck1, pA.deck2].find(
    (d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase()
  );
  const dB = [pB.deck1, pB.deck2].find(
    (d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase()
  );

  if (!dA) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!`,
    });
  }
  if (!dB) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!`,
    });
  }

  // Eksekusi Repeat Tim A: Matikan deck pasangannya secara dinamis
  if (isRepeatA) {
    reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
    dA.isRepeatUsed = true;
    dA.isDead = false;
    if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = true;
    if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = true;
    pA.remainingLife = 1;
  }

  // Eksekusi Repeat Tim B: Matikan deck pasangannya secara dinamis
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

  // Kalkulasi Skor & Status Hidup
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

  // Warning SS Hand
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

  // Bypass KV jika mode tes admin sebelum kickoff
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

  // Respon simulasi khusus admin (ephemeral)
  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      embeds: [gameEmbed],
    });
  }

  // Kirim embed publik & patch respon wasit
  await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [gameEmbed] });
  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
}
