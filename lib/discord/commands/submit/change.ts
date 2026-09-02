import { SubmitContext, parseIgnAndId, createEmptyDeck, createFilledDeck } from './types';
import { syncCustomDeckAndSkillToMaster } from '@/lib/discord/services/master-sync';

export async function handleSubChange(ctx: SubmitContext): Promise<{ error?: string; message?: string }> {
  const { teamKey, reportData, teamRoster, optMap } = ctx;
  const targetTeam = reportData[teamKey];
  const currentLineup: any[] = targetTeam.lineup || [];

  if (currentLineup.length === 0) {
    return { error: '⚠️ **Lineup tim ini masih kosong!** Daftarkan pemain terlebih dahulu dengan `/submit add`.' };
  }

  const rawOld = String(optMap.pemain_lama || '');
  const rawNew = String(optMap.pemain_baru || '');

  if (rawOld === 'EMPTY_LINEUP') {
    return { error: '⚠️ Lineup tim masih kosong. Silakan gunakan `/submit add` terlebih dahulu!' };
  }

  const oldParsed = parseIgnAndId(rawOld);
  const newParsed = parseIgnAndId(rawNew);
  const deckCount = Number(optMap.deck_count) || 2;

  if (!oldParsed.ign || !newParsed.ign) {
    return { error: '❌ Opsi `pemain_lama` dan `pemain_baru` wajib diisi!' };
  }

  const oldIndex = currentLineup.findIndex(
    (p) => String(p.ign || '').toLowerCase() === oldParsed.ign.toLowerCase()
  );

  if (oldIndex === -1) {
    return { error: `❌ Pemain lama **${oldParsed.ign}** tidak ditemukan di lineup!` };
  }

  const hasPlayed = (reportData.games || []).some((g: any) => {
    const duelPlayer = teamKey === 'teamA' ? g.playerA?.ign || g.playerA : g.playerB?.ign || g.playerB;
    return String(duelPlayer || '').toLowerCase() === oldParsed.ign.toLowerCase();
  });

  if (hasPlayed) {
    return {
      error: `❌ **Pergantian Ditolak!** Pemain **${oldParsed.ign}** sudah memiliki riwayat duel di pertandingan ini.`,
    };
  }

  const isNewAlreadyInLineup = currentLineup.some(
    (p, idx) => idx !== oldIndex && String(p.ign || '').toLowerCase() === newParsed.ign.toLowerCase()
  );

  if (isNewAlreadyInLineup) {
    return { error: `❌ Pemain baru **${newParsed.ign}** sudah ada di lineup!` };
  }

  let newDlId = newParsed.idDuelLinks;
  if (!newDlId) {
    const rosterMember = teamRoster.find((p) => p.ign.toLowerCase() === newParsed.ign.toLowerCase());
    newDlId = rosterMember?.idDuelLinks || '';
  }

  let deck1 = createEmptyDeck();
  if (optMap.deck_1) {
    const sync1 = await syncCustomDeckAndSkillToMaster(optMap.deck_1, optMap.skill_1);
    deck1 = createFilledDeck(sync1.cleanDeck || optMap.deck_1, sync1.cleanSkill || optMap.skill_1 || '');
  }

  let deck2 = null;
  if (deckCount === 2) {
    if (optMap.deck_2) {
      const sync2 = await syncCustomDeckAndSkillToMaster(optMap.deck_2, optMap.skill_2);
      deck2 = createFilledDeck(sync2.cleanDeck || optMap.deck_2, sync2.cleanSkill || optMap.skill_2 || '');
    } else {
      deck2 = createEmptyDeck();
    }
  }

  currentLineup[oldIndex] = {
    ign: newParsed.ign,
    idDuelLinks: newDlId,
    totalWins: 0,
    totalLosses: 0,
    remainingLife: deckCount,
    deck1,
    deck2,
  };

  targetTeam.lineup = currentLineup;
  return {
    message: `🔄 **Pergantian Pemain Berhasil!**\n• Keluar: **${oldParsed.ign}**\n• Masuk: **${newParsed.ign}** (${newDlId || '-'})`,
  };
}
