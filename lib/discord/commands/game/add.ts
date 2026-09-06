import { discordAPI } from '@/lib/discord/utils';
import { GameContext } from './types';
import {
  computeNextInstructions,
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
  buildDecklossClaimMenu,
} from './renderer';

export async function handleGameAdd(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;

  if (scoreA >= 10 || scoreB >= 10) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan 10.',
    });
  }

  const winnerOpt = optMap.pemenang as 'A' | 'B';
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

  // 1. Aktivasi Repeat
  if (isRepeatA && !dA.isRepeatUsed) {
    dA.isRepeatUsed = true;
    dA.isDead = false;
    if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = true;
    if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = true;
    pA.remainingLife = 1;
  }

  if (isRepeatB && !dB.isRepeatUsed) {
    dB.isRepeatUsed = true;
    dB.isDead = false;
    if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = true;
    if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = true;
    pB.remainingLife = 1;
  }

  reportData.teamA.repeatsUsed = lineupA.reduce((count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0), 0);
  reportData.teamB.repeatsUsed = lineupB.reduce((count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0), 0);

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

  // 3. Warning SS Hand
  if (!ssHandA) reportData.teamA.warningsUsed = (reportData.teamA.warningsUsed || 0) + 1;
  if (!ssHandB) reportData.teamB.warningsUsed = (reportData.teamB.warningsUsed || 0) + 1;

  const gameRecord = {
    gameNumber,
    winner: winnerOpt === 'A' ? 'teamA' : 'teamB',
    playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill, isRepeat: Boolean(dA.isRepeatUsed) },
    playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill, isRepeat: Boolean(dB.isRepeatUsed) },
    ssHandA,
    ssHandB,
    isDeckloss: false,
    decklossTeam: '',
    notes,
    timestamp: new Date().toISOString(),
  };

  if (!reportData.games) reportData.games = [];
  reportData.games.push(gameRecord);
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  const isTeamAWon = reportData.teamA.score >= 10;
  const isTeamBWon = reportData.teamB.score >= 10;
  reportData.isFinished = isTeamAWon || isTeamBWon;
  reportData.winnerTeam = isTeamAWon ? 'teamA' : isTeamBWon ? 'teamB' : null;

  // 4. Instruksi & Sinkronisasi via Renderer
  const { isTeamAPenalty, isTeamBPenalty } = computeNextInstructions(reportData, winnerOpt, pA, pB);

  if (!isBeforeKickoff) {
    await saveAndSyncMatchState(match, reportData);
  }

  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  await publishMatchReport(channelId, match.id, matchEmbed);

  // 5. Select Menu Sanksi Deckloss jika tembus 2x Warning
  if (!reportData.isFinished && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';
    const components = buildDecklossClaimMenu(match.id, innocentTeamKey, innocentTeam);

    if (components) {
      return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
        content:
          `✅ **Game ${gameNumber} berhasil dicatat.**\n\n` +
          `⚠️ **PERINGATAN SANKSI DECKLOSS!**\n` +
          `• **${penaltyTeam.name}** telah mencapai **2x Warning SS Hand**.\n` +
          `• Silakan pilih pemain dan deck dari **${innocentTeam.name}** untuk klaim **Technical Win (TW)**:`,
        components,
      });
    }
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
      }
