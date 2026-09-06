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

  // 🎯 SINKRONISASI DENGAN tournamentCommands (tipe_game)
  const tipeGame = String(optMap.tipe_game || 'NORMAL').toUpperCase();
  const isDecklossOpt = tipeGame === 'DECKLOSS_TIMER';
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

  // 📸 1. SIMPAN SNAPSHOT KONDISI TIM SEBELUM MUTASI DATA
  const snapshotBeforeGame = {
    teamA: JSON.parse(JSON.stringify(reportData.teamA)),
    teamB: JSON.parse(JSON.stringify(reportData.teamB)),
  };

  const gameNumber = (reportData.games?.length || 0) + 1;

  // 2. Aktivasi Repeat (Hanya jika duel fisik normal)
  if (!isDecklossOpt) {
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
  }

  // 3. Kalkulasi Skor & Status Hidup
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

  // 4. Warning SS Hand (hanya dihitung jika duel normal, sanksi timer tidak menambah counter)
  if (!isDecklossOpt) {
    if (!ssHandA) reportData.teamA.warningsUsed = (reportData.teamA.warningsUsed || 0) + 1;
    if (!ssHandB) reportData.teamB.warningsUsed = (reportData.teamB.warningsUsed || 0) + 1;
  }

  const loserTeamKey = winnerOpt === 'A' ? 'teamB' : 'teamA';

  const gameRecord = {
    gameNumber,
    winner: winnerOpt === 'A' ? 'teamA' : 'teamB',
    playerA: {
      ign: pA.ign,
      idDuelLinks: pA.idDuelLinks,
      archetype: dA.archetype,
      skill: dA.skill,
      isRepeat: Boolean(dA.isRepeatUsed),
    },
    playerB: {
      ign: pB.ign,
      idDuelLinks: pB.idDuelLinks,
      archetype: dB.archetype,
      skill: dB.skill,
      isRepeat: Boolean(dB.isRepeatUsed),
    },
    ssHandA,
    ssHandB,
    isDeckloss: isDecklossOpt,
    decklossTeam: isDecklossOpt ? loserTeamKey : '',
    notes: notes || (isDecklossOpt ? 'Sanksi Deckloss (Timer Habis)' : ''),
    timestamp: new Date().toISOString(),
    snapshot: snapshotBeforeGame,
  };

  if (!reportData.games) reportData.games = [];
  reportData.games.push(gameRecord);
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  const isTeamAWon = reportData.teamA.score >= 10;
  const isTeamBWon = reportData.teamB.score >= 10;
  reportData.isFinished = isTeamAWon || isTeamBWon;
  reportData.winnerTeam = isTeamAWon ? 'teamA' : isTeamBWon ? 'teamB' : null;

  // 5. Evaluasi Instruksi Ronde Berikutnya
  const { isTeamAPenalty, isTeamBPenalty } = computeNextInstructions(reportData, winnerOpt, pA, pB);

  // Jika ini game deckloss timer dan pertandingan belum selesai, susun instruksi dengan format standar
  if (isDecklossOpt && !reportData.isFinished) {
    const penaltyTeam = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
    const penaltyPlayer = winnerOpt === 'A' ? pB : pA;
    const innocentPlayer = winnerOpt === 'A' ? pA : pB;
    const nextGameNumber = gameNumber + 1;

    const instructionLines: string[] = [];
    instructionLines.push(`• **${penaltyTeam.name}** (Sanksi Deckloss Timer)`);
    if ((penaltyPlayer.remainingLife || 0) <= 0) {
      instructionLines.push(`  └ **${penaltyTeam.name}** (Next player) — Extra Timer 3 Menit`);
    } else {
      instructionLines.push(`  └ **${penaltyPlayer.ign}** (Next deck) — Extra Timer 3 Menit`);
    }
    instructionLines.push(`• **${innocentPlayer.ign}** (Stay table)`);

    reportData.currentInstructions = {
      header: `📢 **Instruksi Game #${nextGameNumber}:**`,
      lines: instructionLines,
    };
  }

  if (!isBeforeKickoff) {
    await saveAndSyncMatchState(match, reportData);
  }

  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  await publishMatchReport(channelId, match.id, matchEmbed);

  // 6. Select Menu Sanksi Deckloss jika tembus 2x Warning SS Hand
  if (!reportData.isFinished && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';
    const components = buildDecklossClaimMenu(match.id, innocentTeamKey, innocentTeam, 'warning');

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

  const successMsg = isDecklossOpt
    ? `⚖️ **Game ${gameNumber} berhasil dicatat sebagai Sanksi Deckloss (Timer Habis)!**`
    : `✅ **Game ${gameNumber} berhasil dicatat.**`;

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: successMsg,
  });
}
