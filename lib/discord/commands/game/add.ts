import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getOptionMap } from './types';
import {
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
  buildDecklossClaimMenu,
  computeNextInstructions,
  hasPlayerPhysicalWin,
} from './renderer';

export async function handleGameAdd(interaction: any) {
  const channelId = interaction.channel_id;

  const schedules = await kv.get<any[]>('twi:schedules');
  const match = (schedules || []).find(
    (s) => s.channelId === channelId || s.matchChannelId === channelId
  );

  if (!match) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Channel ini tidak terdaftar untuk pertandingan aktif.', flags: 64 },
    });
  }

  const reportData = await kv.hget<any>('twi:match_reports', match.id);
  if (!reportData) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Laporan pertandingan belum dibuat atau tidak ditemukan.', flags: 64 },
    });
  }

  if (reportData.isFinished) {
    return NextResponse.json({
      type: 4,
      data: { content: '⚠️ Pertandingan ini sudah selesai.', flags: 64 },
    });
  }

  const optMap = getOptionMap(interaction.data?.options || []);

  const pemainA = String(optMap.pemain_a || '').trim();
  const deckA = String(optMap.deck_a || '').trim();
  const pemainB = String(optMap.pemain_b || '').trim();
  const deckB = String(optMap.deck_b || '').trim();
  const winnerOpt = String(optMap.pemenang || '').toUpperCase() as 'A' | 'B';
  const tipeGame = String(optMap.tipe_game || 'NORMAL').toUpperCase();
  const notes = optMap.catatan ? String(optMap.catatan).trim() : '';

  // Deckloss berlaku umum (mencakup DECKLOSS regulasi apapun)
  const isDecklossOpt = tipeGame.startsWith('DECKLOSS');

  if (!pemainA || !deckA || !pemainB || !deckB || !winnerOpt) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Semua parameter pertandingan wajib diisi lengkap.', flags: 64 },
    });
  }

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => p.ign.toLowerCase() === pemainA.toLowerCase());
  const pB = lineupB.find((p) => p.ign.toLowerCase() === pemainB.toLowerCase());

  if (!pA || !pB) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Pemain A atau Pemain B tidak terdaftar di roster pertandingan.', flags: 64 },
    });
  }

  const isARepeat = deckA.startsWith('REPEAT:');
  const cleanDeckA = isARepeat ? deckA.replace('REPEAT:', '') : deckA;
  const isBRepeat = deckB.startsWith('REPEAT:');
  const cleanDeckB = isBRepeat ? deckB.replace('REPEAT:', '') : deckB;

  const targetDeckA = [pA.deck1, pA.deck2].find(
    (d) => d && d.archetype.toLowerCase() === cleanDeckA.toLowerCase()
  );
  const targetDeckB = [pB.deck2, pB.deck1].find(
    (d) => d && d.archetype.toLowerCase() === cleanDeckB.toLowerCase()
  );

  if (isARepeat && targetDeckA) {
    targetDeckA.isRepeatUsed = true;
    targetDeckA.isDead = false;
    reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
  }
  if (isBRepeat && targetDeckB) {
    targetDeckB.isRepeatUsed = true;
    targetDeckB.isDead = false;
    reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
  }

  const games: any[] = reportData.games || [];
  const gameNumber = games.length + 1;

  const penaltyTeamKey = isDecklossOpt ? (winnerOpt === 'A' ? 'teamB' : 'teamA') : null;

  if (winnerOpt === 'A') {
    reportData.teamA.score = (reportData.teamA.score || 0) + 1;
    if (targetDeckB) targetDeckB.isDead = true;
    pB.remainingLife = Math.max(0, (pB.remainingLife ?? 2) - 1);
    pB.totalLosses = (pB.totalLosses || 0) + 1;
  } else {
    reportData.teamB.score = (reportData.teamB.score || 0) + 1;
    if (targetDeckA) targetDeckA.isDead = true;
    pA.remainingLife = Math.max(0, (pA.remainingLife ?? 2) - 1);
    pA.totalLosses = (pA.totalLosses || 0) + 1;
  }

  const isMatchFinished =
    (reportData.teamA.score || 0) >= 10 || (reportData.teamB.score || 0) >= 10;
  reportData.isFinished = isMatchFinished;

  // Catatan Deckloss umum mengikuti input wasit secara dinamis
  const defaultDecklossNote = 'Sanksi Deckloss';
  const gameNotes = isDecklossOpt ? (notes || defaultDecklossNote) : notes;

  const gameRecord = {
    gameNumber,
    playerA: {
      ign: pA.ign,
      archetype: cleanDeckA,
      isRepeat: isARepeat,
    },
    playerB: {
      ign: pB.ign,
      archetype: cleanDeckB,
      isRepeat: isBRepeat,
    },
    winner: winnerOpt === 'A' ? 'teamA' : 'teamB',
    isDeckloss: isDecklossOpt,
    decklossTeam: penaltyTeamKey,
    notes: gameNotes,
  };

  games.push(gameRecord);
  reportData.games = games;

  // Instruksi deckloss umum tanpa hardcode timer 3 menit
  if (isDecklossOpt && !reportData.isFinished) {
    const penaltyTeam = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
    const penaltyPlayer = winnerOpt === 'A' ? pB : pA;
    const innocentPlayer = winnerOpt === 'A' ? pA : pB;
    const nextGameNumber = gameNumber + 1;

    const penaltyReasonText = notes ? `Sanksi Deckloss: ${notes}` : defaultDecklossNote;

    const instructionLines: string[] = [];
    instructionLines.push(`• **${penaltyTeam.name}** (${penaltyReasonText})`);

    if ((penaltyPlayer.remainingLife || 0) <= 0) {
      instructionLines.push(`  └ **${penaltyTeam.name}** (Next player)`);
    } else {
      const hasWonPhysically = hasPlayerPhysicalWin(games, penaltyPlayer.ign);
      const canRepeat = (penaltyTeam.repeatsUsed || 0) < 2 && !hasWonPhysically;
      instructionLines.push(`  └ **${penaltyPlayer.ign}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'})`);
    }
    instructionLines.push(`• **${innocentPlayer.ign}** (Stay table)`);

    reportData.currentInstructions = {
      header: `📢 **Instruksi Game #${nextGameNumber}:**`,
      lines: instructionLines,
    };
  } else {
    computeNextInstructions(reportData, winnerOpt, pA, pB);
  }

  const isTeamAPenalty = (reportData.teamA?.warningsUsed || 0) >= 2;
  const isTeamBPenalty = (reportData.teamB?.warningsUsed || 0) >= 2;

  await saveAndSyncMatchState(match, reportData);
  const embed = await buildMatchReportEmbed(match, reportData, winnerOpt);
  await publishMatchReport(channelId, match.id, embed);

  if (!reportData.isFinished && (isTeamAPenalty || isTeamBPenalty)) {
    const targetInnocentKey = isTeamAPenalty ? 'teamB' : 'teamA';
    const innocentTeam = targetInnocentKey === 'teamA' ? reportData.teamA : reportData.teamB;
    const claimMenuComponents = buildDecklossClaimMenu(
      match.id,
      targetInnocentKey,
      innocentTeam,
      'warning'
    );

    if (claimMenuComponents) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `⚠️ **PERHATIAN:** Tim **${isTeamAPenalty ? reportData.teamA.name : reportData.teamB.name}** telah mengumpulkan 2x Warning SS Hand. Silakan tentukan penerima Technical Win:`,
          components: claimMenuComponents,
        },
      });
    }
  }

  return NextResponse.json({
    type: 4,
    data: {
      content: `✅ **Game #${gameNumber} berhasil dicatat.**`,
    },
  });
}
