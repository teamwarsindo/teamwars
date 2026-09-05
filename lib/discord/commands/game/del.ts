import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { GameContext } from './types';

export async function handleGameDel(ctx: GameContext) {
  const { appId, token, match, reportData, optMap, isBeforeKickoff } = ctx;
  const games: any[] = reportData.games || [];

  if (games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Belum ada riwayat game yang dicatat!**',
    });
  }

  const targetGameNum = optMap.game_number ? Number(optMap.game_number) : games.length;
  if (targetGameNum !== games.length) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Rollback hanya dapat dilakukan pada game terakhir (**Game ${games.length}**)!`,
    });
  }

  // 1. Ambil & Hapus Data Game Terakhir
  const poppedGame = games.pop();
  const winner = poppedGame.winner;

  // 2. Rollback Skor Dasar Duel
  if (winner === 'teamA') {
    reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
  } else {
    reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
  }

  // 3. Rollback Sanksi Deckloss Tambahan (Jika Ada)
  if (poppedGame.isDeckloss) {
    if (poppedGame.decklossTeam === 'teamA') {
      reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
      reportData.teamA.warningsUsed = 1;
    } else if (poppedGame.decklossTeam === 'teamB') {
      reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      reportData.teamB.warningsUsed = 1;
    }
  } else {
    if (poppedGame.ssHandA === false) {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 1) - 1);
    }
    if (poppedGame.ssHandB === false) {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 1) - 1);
    }
  }

  // 4. Rollback State Pemain & Deck Tim A
  const pA = (reportData.teamA?.lineup || []).find(
    (p: any) => p.ign?.toLowerCase() === poppedGame.playerA?.ign?.toLowerCase()
  );
  if (pA) {
    const dA = [pA.deck1, pA.deck2].find(
      (d) => d && d.archetype?.toLowerCase() === poppedGame.playerA?.archetype?.toLowerCase()
    );

    if (winner === 'teamA') {
      if (dA) dA.wins = Math.max(0, (dA.wins || 1) - 1);
      pA.totalWins = Math.max(0, (pA.totalWins || 1) - 1);
    } else {
      if (dA) {
        dA.isDead = false;
        dA.losses = Math.max(0, (dA.losses || 1) - 1);
      }
      pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
      pA.totalLosses = Math.max(0, (pA.totalLosses || 1) - 1);
    }

    const otherGamesWithSameDeckA = games.filter(
      (g) => g.playerA?.ign?.toLowerCase() === pA.ign?.toLowerCase() &&
             g.playerA?.archetype?.toLowerCase() === dA?.archetype?.toLowerCase() &&
             g.playerA?.isRepeat
    );

    if (poppedGame.playerA?.isRepeat && otherGamesWithSameDeckA.length === 0) {
      reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 1) - 1);
      if (dA) dA.isRepeatUsed = false;
      if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = false;
      if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = false;
    }
  }

  // 5. Rollback State Pemain & Deck Tim B
  const pB = (reportData.teamB?.lineup || []).find(
    (p: any) => p.ign?.toLowerCase() === poppedGame.playerB?.ign?.toLowerCase()
  );
  if (pB) {
    const dB = [pB.deck1, pB.deck2].find(
      (d) => d && d.archetype?.toLowerCase() === poppedGame.playerB?.archetype?.toLowerCase()
    );

    if (winner === 'teamB') {
      if (dB) dB.wins = Math.max(0, (dB.wins || 1) - 1);
      pB.totalWins = Math.max(0, (pB.totalWins || 1) - 1);
    } else {
      if (dB) {
        dB.isDead = false;
        dB.losses = Math.max(0, (dB.losses || 1) - 1);
      }
      pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
      pB.totalLosses = Math.max(0, (pB.totalLosses || 1) - 1);
    }

    const otherGamesWithSameDeckB = games.filter(
      (g) => g.playerB?.ign?.toLowerCase() === pB.ign?.toLowerCase() &&
             g.playerB?.archetype?.toLowerCase() === dB?.archetype?.toLowerCase() &&
             g.playerB?.isRepeat
    );

    if (poppedGame.playerB?.isRepeat && otherGamesWithSameDeckB.length === 0) {
      reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 1) - 1);
      if (dB) dB.isRepeatUsed = false;
      if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = false;
      if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = false;
    }
  }

  // 6. Reset Status Match Selesai
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };
  reportData.isFinished = false;
  reportData.winnerTeam = null;

  // 7. Simpan Kembali Data Bersih ke Upstash KV
  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
  }

  // 8. Beri Notifikasi Respon
  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content:
      `🗑️ **Data Game ${poppedGame.gameNumber} berhasil dihapus dari database!**\n` +
      `Skor saat ini kembali ke: **${reportData.teamA.name} \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ${reportData.teamB.name}**.\n\n` +
      `👉 *Silakan gunakan perintah \`/game add\` untuk menambahkan data log game yang benar. Embed laporan pertandingan akan otomatis diperbarui setelah data baru ditambahkan.*`,
  });
}
