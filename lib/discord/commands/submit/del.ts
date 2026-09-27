import { SubmitContext, parseIgnAndId } from './types';

export async function handleSubDel(ctx: SubmitContext): Promise<{ error?: string; message?: string }> {
  const { teamKey, reportData, optMap } = ctx;
  const targetTeam = reportData[teamKey];
  const currentLineup: any[] = targetTeam.lineup || [];
  const games: any[] = reportData.games || [];
  const hasGameStarted = games.length > 0;

  if (currentLineup.length === 0) {
    return { error: '⚠️ **Lineup tim ini masih kosong!** Tidak ada pemain yang bisa dihapus.' };
  }

  // 1. Kumpulkan seluruh input pemain_1 s/d pemain_5
  const rawInputs: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const val = optMap[`pemain_${i}`];
    if (val && typeof val === 'string' && val.trim() && val !== 'EMPTY_LINEUP') {
      rawInputs.push(val.trim());
    }
  }

  if (rawInputs.length === 0) {
    return { error: '❌ Masukkan minimal 1 pemain pada opsi `pemain_1` untuk dihapus!' };
  }

  // 2. Parse IGN dan bersihkan duplikasi input
  const targetsToDelete = Array.from(
    new Set(rawInputs.map((raw) => parseIgnAndId(raw).ign.toLowerCase()))
  ).filter(Boolean);

  // 3. Pastikan pemain ada di lineup
  const matchedPlayers = currentLineup.filter((p) =>
    targetsToDelete.includes(String(p.ign || '').toLowerCase())
  );

  if (matchedPlayers.length === 0) {
    return { error: '❌ Pemain yang kamu pilih tidak ditemukan di dalam lineup!' };
  }

  // 4. Validasi apakah ada pemain yang sudah pernah duel
  const playedPlayer = matchedPlayers.find((player) =>
    games.some((g: any) => {
      const pA = String(g.playerA?.ign || g.playerA || '').toLowerCase();
      const pB = String(g.playerB?.ign || g.playerB || '').toLowerCase();
      const target = String(player.ign || '').toLowerCase();
      return pA === target || pB === target;
    })
  );

  if (playedPlayer) {
    return {
      error: `❌ **Penghapusan Ditolak!** Pemain **${playedPlayer.ign}** sudah memiliki riwayat duel pada pertandingan ini.`,
    };
  }

  // 5. Eksekusi Penghapusan
  if (hasGameStarted) {
    // Game sudah jalan: Kosongkan nama & ID pemain, BIARKAN deck & skill stay di slot untuk pengganti
    matchedPlayers.forEach((p) => {
      p.ign = '';
      p.idDuelLinks = '';
      p.remainingLife = 2;
      p.totalLosses = 0;
    });

    const deletedNames = matchedPlayers.map((p) => `• **${parseIgnAndId(p.ign).ign || 'Pemain'}**`).join('\n');
    return {
      message: `🔄 **Pemain Dikeluarkan dari Lineup:**\n${deletedNames}\n🔒 **Aturan Penggantian:** Deck dan Skill tetap dikunci di slot ini dan akan otomatis diwarisi oleh pemain pengganti saat didaftarkan via \`/submit add\`.`,
    };
  }

  // Game belum jalan: Hapus total dari array lineup
  const remainingLineup = currentLineup.filter(
    (p) => !targetsToDelete.includes(String(p.ign || '').toLowerCase())
  );

  targetTeam.lineup = remainingLineup;

  const deletedNames = matchedPlayers.map((p) => `• **${p.ign}**`).join('\n');
  return {
    message: `🗑️ **Berhasil Menghapus ${matchedPlayers.length} Pemain Beserta Deck-nya:**\n${deletedNames}\n\nSisa lineup tim saat ini: **${remainingLineup.length} pemain**.`,
  };
}
