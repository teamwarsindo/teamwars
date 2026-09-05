import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { GameContext } from './types';

export async function handleGameDel(ctx: GameContext) {
  const { appId, token, match, reportData } = ctx;

  const games: any[] = reportData.games || [];
  if (games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '❌ **Belum ada game yang dicatat untuk pertandingan ini.**',
    });
  }

  // Ambil game paling terakhir untuk di-rollback (LIFO)
  const lastGame = games.pop();
  const deletedGameNumber = lastGame.gameNumber;

  // 1. Rollback Statistik Skor Tim & Pemain
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

  // Rollback status repeat jika duel menggunakan repeat
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

  // Rollback warning SS Hand & sanksi Deckloss
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

  // 2. Reset status penyelesaian jika skor turun di bawah 10
  const isStillEnded = (reportData.teamA?.score || 0) >= 10 || (reportData.teamB?.score || 0) >= 10;
  if (!isStillEnded) {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  // 3. Simpan data KV yang telah bersih
  await kv.hset('twi:match_reports', { [match.id]: reportData });

  // 4. Balas respon command secara langsung tanpa menyentuh postingan room
  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🗑️ **Game ${deletedGameNumber} berhasil dihapus dan data KV telah di-rollback.**`,
  });
}
