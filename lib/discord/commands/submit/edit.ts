import { SubmitContext, parseIgnAndId, createEmptyDeck } from './types';
import { syncCustomDeckAndSkillToMaster } from './master-sync';

export async function handleSubEdit(ctx: SubmitContext): Promise<{ error?: string; message?: string }> {
  const { teamKey, reportData, optMap } = ctx;
  const targetTeam = reportData[teamKey];
  const currentLineup: any[] = targetTeam.lineup || [];

  if (currentLineup.length === 0) {
    return { error: '⚠️ **Lineup tim ini masih kosong!** Daftarkan pemain terlebih dahulu dengan `/submit add`.' };
  }

  const rawPemain = String(optMap.pemain || '');
  if (rawPemain === 'EMPTY_LINEUP') {
    return { error: '⚠️ Lineup tim masih kosong. Daftarkan pemain terlebih dahulu dengan `/submit add`!' };
  }

  const parsedTarget = parseIgnAndId(rawPemain);
  if (!parsedTarget.ign) {
    return { error: '❌ Pilih pemain di lineup yang ingin diedit!' };
  }

  const playerObj = currentLineup.find(
    (p) => String(p.ign || '').toLowerCase() === parsedTarget.ign.toLowerCase()
  );

  if (!playerObj) {
    return { error: `❌ Pemain **${parsedTarget.ign}** tidak ditemukan di lineup!` };
  }

  // Perbaikan No. 4: Abaikan whitespace/string kosong agar tidak menimpa data yang ada
  const rawDeck1 = optMap.deck_1?.trim() || undefined;
  const rawSkill1 = optMap.skill_1?.trim() || undefined;
  const rawDeck2 = optMap.deck_2?.trim() || undefined;
  const rawSkill2 = optMap.skill_2?.trim() || undefined;

  // Validasi fleksibel: Terima bila salah satu dari keempat opsi diisi
  if (!rawDeck1 && !rawSkill1 && !rawDeck2 && !rawSkill2) {
    return { error: '⚠️ Masukkan minimal salah satu data: **Nama Deck** atau **Skill** untuk memperbarui data!' };
  }

  const updatedDecks: string[] = [];

  // -------------------------------------------------------------
  // PROSES DECK 1
  // -------------------------------------------------------------
  if (rawDeck1 || rawSkill1) {
    const existingDeck1 = playerObj.deck1 || createEmptyDeck();

    // Perbaikan No. 1: Tolak edit jika deck 1 sudah gugur atau sudah pernah dimainkan
    if (existingDeck1.isDead || (existingDeck1.wins || 0) > 0 || (existingDeck1.losses || 0) > 0) {
      return { error: `❌ **Deck 1** milik **${playerObj.ign}** tidak dapat diedit karena sudah pernah dimainkan atau sudah gugur!` };
    }

    const targetDeckName = rawDeck1 !== undefined ? rawDeck1 : existingDeck1.archetype || '';
    const targetSkillName = rawSkill1 !== undefined ? rawSkill1 : existingDeck1.skill || '';

    const sync1 = await syncCustomDeckAndSkillToMaster(targetDeckName, targetSkillName);
    const finalDeck1 = sync1.cleanDeck || targetDeckName;
    const finalSkill1 = sync1.cleanSkill || targetSkillName;

    playerObj.deck1 = {
      ...existingDeck1,
      archetype: finalDeck1,
      skill: finalSkill1,
    };

    const deckLabel = finalDeck1 ? `**${finalDeck1}**` : '*(Menunggu Archetype)*';
    const skillLabel = finalSkill1 ? `(${finalSkill1})` : '(-)';
    updatedDecks.push(`Deck 1: ${deckLabel} ${skillLabel}`);
  }

  // -------------------------------------------------------------
  // PROSES DECK 2
  // -------------------------------------------------------------
  if (rawDeck2 || rawSkill2) {
    const existingDeck2 = playerObj.deck2 || createEmptyDeck();

    // Perbaikan No. 1: Tolak edit jika deck 2 sudah gugur atau sudah pernah dimainkan
    if (existingDeck2.isDead || (existingDeck2.wins || 0) > 0 || (existingDeck2.losses || 0) > 0) {
      return { error: `❌ **Deck 2** milik **${playerObj.ign}** tidak dapat diedit karena sudah pernah dimainkan atau sudah gugur!` };
    }

    const targetDeckName = rawDeck2 !== undefined ? rawDeck2 : existingDeck2.archetype || '';
    const targetSkillName = rawSkill2 !== undefined ? rawSkill2 : existingDeck2.skill || '';

    const sync2 = await syncCustomDeckAndSkillToMaster(targetDeckName, targetSkillName);
    const finalDeck2 = sync2.cleanDeck || targetDeckName;
    const finalSkill2 = sync2.cleanSkill || targetSkillName;

    playerObj.deck2 = {
      ...existingDeck2,
      archetype: finalDeck2,
      skill: finalSkill2,
    };

    const deckLabel = finalDeck2 ? `**${finalDeck2}**` : '*(Menunggu Archetype)*';
    const skillLabel = finalSkill2 ? `(${finalSkill2})` : '(-)';
    updatedDecks.push(`Deck 2: ${deckLabel} ${skillLabel}`);
  }

  targetTeam.lineup = currentLineup;
  return {
    message: `📝 **Berhasil Memperbarui Data Pemain:** **${parsedTarget.ign}**\n${updatedDecks.map((d) => `• ${d}`).join('\n')}`,
  };
}
