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

  // 2. RESTORASI SNAPSHOT ATAU FALLBACK MANUAL
  if (lastGame.snapshot) {
    // Kembalikan kondisi tim persis ke detik sebelum game ini dibuat
    reportData.teamA = lastGame.snapshot.teamA;
    reportData.teamB = lastGame.snapshot.teamB;
  } else {
    // Fallback darurat jika game lama belum memiliki snapshot
    const isAWin = lastGame.winner === 'teamA';
    const winnerTeamKey = isAWin ? 'teamA' : 'teamB';
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

    if (lastGame.ssHandA === false) {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) - 1);
    }
    if (lastGame.ssHandB === false) {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) - 1);
    }
  }

  // 3. Reset Skor Akhir & Status Kemenangan Pertandingan
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };
  const isStillEnded = (reportData.teamA?.score || 0) >= 10 || (reportData.teamB?.score || 0) >= 10;
  if (!isStillEnded) {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  // 4. Rekalkulasi Instruksi ke Ronde Sebelumnya yang Sah
  const currentLastGame = games[games.length - 1];
  const lastWinnerOpt = currentLastGame?.winner === 'teamA' ? 'A' : 'B';
  const currPA = (reportData.teamA?.lineup || []).find((p: any) => p.ign?.toLowerCase() === currentLastGame?.playerA?.ign?.toLowerCase());
  const currPB = (reportData.teamB?.lineup || []).find((p: any) => p.ign?.toLowerCase() === currentLastGame?.playerB?.ign?.toLowerCase());

  computeNextInstructions(reportData, currentLastGame ? lastWinnerOpt : undefined, currPA, currPB);

  // 5. Simpan KV & Update Seluruh Embed (Match Room + Camp Tracker)
  await saveAndSyncMatchState(match, reportData);
  const matchEmbed = await buildMatchReportEmbed(match, reportData, currentLastGame ? lastWinnerOpt : undefined);
  await publishMatchReport(channelId, match.id, matchEmbed);

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🗑️ **Game ${deletedGameNumber} berhasil dihapus dan kondisi match telah di-rollback secara sempurna.**`,
  });
}
