import { kv } from '@vercel/kv';
import {
  discordAPI,
  respondInteraction,
  respondInteractionWithComponents,
} from '@/lib/discord/utils';
import {
  MatchScheduleItem,
  hasPlayerPhysicalWin,
  getMatchData,
} from './types';
import {
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
  buildDecklossClaimMenu,
  computeNextInstructions,
} from './renderer';

export async function handleGameAdd(interaction: any) {
  const channelId = interaction.channel_id;
  const match = await getMatchData(channelId);

  if (!match) {
    return respondInteraction('Channel ini tidak terdaftar untuk pertandingan aktif.');
  }

  const reportData = await kv.hget<any>('twi:match_reports', match.id);
  if (!reportData) {
    return respondInteraction('Laporan pertandingan belum dibuat atau tidak ditemukan.');
  }

  if (reportData.isFinished) {
    return respondInteraction('Pertandingan ini sudah selesai.');
  }

  const rawOptions = interaction.data?.options || [];
  const subCommand = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
  const options = subCommand ? subCommand.options || [] : rawOptions;

  const optMap: Record<string, any> = {};
  for (const opt of options) {
    optMap[opt.name] = opt.value;
  }

  const pemainA = String(optMap.pemain_a || '').trim();
  const deckA = String(optMap.deck_a || '').trim();
  const pemainB = String(optMap.pemain_b || '').trim();
  const deckB = String(optMap.deck_b || '').trim();
  const winnerOpt = String(optMap.pemenang || '').toUpperCase() as 'A' | 'B';
  const tipeGame = String(optMap.tipe_game || 'NORMAL').toUpperCase();
  const notes = String(optMap.catatan || '').trim();

  // Fleksibel: mencakup DECKLOSS umum maupun DECKLOSS_TIMER lama
  const isDecklossOpt = tipeGame.startsWith('DECKLOSS');

  if (!pemainA || !deckA || !pemainB || !deckB || !winnerOpt) {
    return respondInteraction('Semua field pertandingan (pemain, deck, pemenang) wajib diisi.');
  }

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => p.ign.toLowerCase() === pemainA.toLowerCase());
  const pB = lineupB.find((p) => p.ign.toLowerCase() === pemainB.toLowerCase());

  if (!pA || !pB) {
    return respondInteraction('Pemain A atau Pemain B tidak terdaftar di roster pertandingan.');
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

  // Proses repeat kuota
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

  // Sanksi Deckloss: tim yang kalah di input adalah penerima sanksi TL
  const penaltyTeamKey = isDecklossOpt ? (winnerOpt === 'A' ? 'teamB' : 'teamA') : null;
  const innocentTeamKey = isDecklossOpt ? (winnerOpt === 'A' ? 'teamA' : 'teamB') : null;

  // Update status deck & nyawa pemain yang kalah
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

  // Catatan game dinamis dari input wasit
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

  // Penanganan instruksi berikutnya
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

  // Cek akumulasi warning SS Hand (2x Warning memicu menu klaim TW)
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
      return respondInteractionWithComponents(
        `⚠️ **PERHATIAN:** Tim **${isTeamAPenalty ? reportData.teamA.name : reportData.teamB.name}** telah mengumpulkan 2x Warning SS Hand. Silakan tentukan penerima Technical Win:`,
        claimMenuComponents
      );
    }
  }

  return respondInteraction(`✅ **Game #${gameNumber} berhasil dicatat.**`);
}
