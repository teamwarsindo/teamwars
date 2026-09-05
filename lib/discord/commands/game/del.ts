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

  // Ambil game terakhir untuk di-rollback
  const lastGame = games.pop();
  const deletedGameNumber = lastGame.gameNumber;

  const isAWin = lastGame.winner === 'teamA';
  const winnerTeamKey = isAWin ? 'teamA' : 'teamB';

  reportData[winnerTeamKey].score = Math.max(0, (reportData[winnerTeamKey].score || 0) - 1);

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => p.ign?.toLowerCase() === lastGame.playerA?.ign?.toLowerCase());
  const pB = lineupB.find((p) => p.ign?.toLowerCase() === lastGame.playerB?.ign?.toLowerCase());

  const dA = pA ? [pA.deck1, pA.deck2].find((d) => d && d.archetype?.toLowerCase() === lastGame.playerA?.archetype?.toLowerCase()) : null;
  const dB = pB ? [pB.deck1, pB.deck2].find((d) => d && d.archetype?.toLowerCase() === lastGame.playerB?.archetype?.toLowerCase()) : null;

  // 1. Rollback Statistik Duel Normal
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

  // 2. Rollback Status Repeat (Perbaikan: Kembalikan deck mati yang bukan repeat)
  if (lastGame.playerA?.isRepeat && pA && dA) {
    dA.isRepeatUsed = false;
    // Deck yang barusan dipakai repeat kembali menjadi deck yang sudah kalah sebelumnya
    dA.isDead = true;

    // Deck pasangannya dihidupkan kembali sebagai opsi deck yang masih tersisa
    const otherDeckA = dA === pA.deck1 ? pA.deck2 : pA.deck1;
    if (otherDeckA) otherDeckA.isDead = false;

    // Sisa life pemain setelah membatalkan aktivasi repeat kembali ke 1
    pA.remainingLife = 1;
  }

  if (lastGame.playerB?.isRepeat && pB && dB) {
    dB.isRepeatUsed = false;
    dB.isDead = true;

    const otherDeckB = dB === pB.deck1 ? pB.deck2 : pB.deck1;
    if (otherDeckB) otherDeckB.isDead = false;

    pB.remainingLife = 1;
  }

  // Hitung ulang total repeat yang valid murni dari lineup
  reportData.teamA.repeatsUsed = lineupA.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );
  reportData.teamB.repeatsUsed = lineupB.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );

  // 3. Rollback Warning SS Hand (Cukup kurangi 1 jika game yang dihapus ada pelanggaran SS)
  if (lastGame.ssHandA === false) {
    reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) - 1);
  }

  if (lastGame.ssHandB === false) {
    reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) - 1);
  }

  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  // 4. Reset status penyelesaian jika skor turun di bawah 10
  const isStillEnded = (reportData.teamA?.score || 0) >= 10 || (reportData.teamB?.score || 0) >= 10;
  if (!isStillEnded) {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  // 5. Simpan data KV yang telah di-rollback
  await kv.hset('twi:match_reports', { [match.id]: reportData });

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `🗑️ **Game ${deletedGameNumber} berhasil dihapus dan data KV telah di-rollback.**`,
  });
}
