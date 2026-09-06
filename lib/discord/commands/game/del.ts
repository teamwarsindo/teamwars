import { discordAPI } from '@/lib/discord/utils';
import { GameContext } from './types';
import {
  computeNextInstructions,
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
} from './renderer';

export async function handleGameDel(ctx: GameContext) {
  const { channelId, appId, token, match, reportData } = ctx;

  const games: any[] = reportData.games || [];
  if (games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '❌ **Belum ada game yang dicatat untuk pertandingan ini.**',
    });
  }

  // 1. Ambil game terakhir
  const lastGame = games.pop();
  const deletedGameNumber = lastGame.gameNumber;

  const isAWin = lastGame.winner === 'teamA';
  const winnerTeamKey = isAWin ? 'teamA' : 'teamB';

  // Rollback Skor Tim Pemenang
  reportData[winnerTeamKey].score = Math.max(0, (reportData[winnerTeamKey].score || 0) - 1);

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => p.ign?.toLowerCase() === lastGame.playerA?.ign?.toLowerCase());
  const pB = lineupB.find((p) => p.ign?.toLowerCase() === lastGame.playerB?.ign?.toLowerCase());

  const dA = pA
    ? [pA.deck1, pA.deck2].find(
        (d) => d && d.archetype?.toLowerCase() === lastGame.playerA?.archetype?.toLowerCase()
      )
    : null;
  const dB = pB
    ? [pB.deck1, pB.deck2].find(
        (d) => d && d.archetype?.toLowerCase() === lastGame.playerB?.archetype?.toLowerCase()
      )
    : null;

  // 2. Cabut Statistik Kemenangan
  if (isAWin) {
    if (pA) pA.totalWins = Math.max(0, (pA.totalWins || 0) - 1);
    if (dA) dA.wins = Math.max(0, (dA.wins || 0) - 1);
  } else {
    if (pB) pB.totalWins = Math.max(0, (pB.totalWins || 0) - 1);
    if (dB) dB.wins = Math.max(0, (dB.wins || 0) - 1);
  }

  // 3. Rollback Status Kekalahan (Deckloss vs Duel Fisik)
  if (lastGame.isDeckloss) {
    const penaltyTeamKey = lastGame.decklossTeam;
    const penaltyPlayer = penaltyTeamKey === 'teamA' ? pA : pB;
    const penaltyDeck = penaltyTeamKey === 'teamA' ? dA : dB;

    if (penaltyPlayer) {
      penaltyPlayer.totalLosses = Math.max(0, (penaltyPlayer.totalLosses || 0) - 1);
      penaltyPlayer.remainingLife = Math.min(2, (penaltyPlayer.remainingLife || 0) + 1);
    }
    if (penaltyDeck) {
      penaltyDeck.losses = Math.max(0, (penaltyDeck.losses || 0) - 1);
      penaltyDeck.isDead = false;
    }
    reportData[penaltyTeamKey].warningsUsed = 2;
  } else {
    if (isAWin) {
      if (pB) {
        pB.totalLosses = Math.max(0, (pB.totalLosses || 0) - 1);
        pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
      }
      if (dB) {
        dB.losses = Math.max(0, (dB.losses || 0) - 1);
        dB.isDead = false;
      }
    } else {
      if (pA) {
        pA.totalLosses = Math.max(0, (pA.totalLosses || 0) - 1);
        pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
      }
      if (dA) {
        dA.losses = Math.max(0, (dA.losses || 0) - 1);
        dA.isDead = false;
      }
    }

    if (lastGame.ssHandA === false) {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) - 1);
    }
    if (lastGame.ssHandB === false) {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) - 1);
    }
  }

  // 4. Rollback Status Repeat
  if (lastGame.playerA?.isRepeat && pA && dA) {
    dA.isRepeatUsed = false;
    dA.isDead = true;
    const otherDeckA = dA === pA.deck1 ? pA.deck2 : pA.deck1;
    if (otherDeckA) otherDeckA.isDead = false;
    pA.remainingLife = 1;
  }

  if (lastGame.playerB?.isRepeat && pB && dB) {
    dB.isRepeatUsed = false;
    dB.isDead = true;
    const otherDeckB = dB === pB.deck1 ? pB.deck2 : pB.deck1;
    if (otherDeckB) otherDeckB.isDead = false;
    pB.remainingLife = 1;
  }

  reportData.teamA.repeatsUsed = lineupA.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );
  reportData.teamB.repeatsUsed = lineupB.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );

  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  const isStillEnded = (reportData.teamA?.score || 0) >= 10 || (reportData.teamB?.score || 0) >= 10;
  if (!isStillEnded) {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  // 5. Rekalkulasi Instruksi ke Game Sebelumnya (atau Game 1 jika kosong)
  const currentLastGame = games[games.length - 1];
  const lastWinnerOpt = currentLastGame?.winner === 'teamA' ? 'A' : 'B';
  const currPA = lineupA.find((p) => p.ign === currentLastGame?.playerA?.ign);
  const currPB = lineupB.find((p) => p.ign === currentLastGame?.playerB?.ign);

  computeNextInstructions(reportData, lastWinnerOpt, currPA, currPB);

  // 6. Simpan KV & Update Seluruh Embed (Match Room + Camp Tracker)
  await saveAndSyncMatchState(match, reportData);
  const matchEmbed = await buildMatchReportEmbed(match, reportData, currentLastGame ? lastWinnerOpt : undefined);
  await publishMatchReport(channelId, match.id, matchEmbed);

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🗑️ **Game ${deletedGameNumber} berhasil dihapus dan seluruh embed laporan telah diperbarui.**`,
  });
}
