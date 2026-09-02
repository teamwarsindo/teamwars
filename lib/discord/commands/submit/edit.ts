import { SubmitContext, parseIgnAndId, createEmptyDeck } from './types';
import { syncCustomDeckAndSkillToMaster } from '@/lib/discord/services/master-sync';

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

  const updatedDecks: string[] = [];

  if (optMap.deck_1) {
    const sync1 = await syncCustomDeckAndSkillToMaster(optMap.deck_1, optMap.skill_1);
    const finalDeck1 = sync1.cleanDeck || optMap.deck_1;
    const finalSkill1 = sync1.cleanSkill || optMap.skill_1 || playerObj.deck1?.skill || '';

    playerObj.deck1 = {
      ...(playerObj.deck1 || createEmptyDeck()),
      archetype: finalDeck1,
      skill: finalSkill1,
    };
    updatedDecks.push(`Deck 1: **${finalDeck1}** (${finalSkill1 || '-'})`);
  }

  if (optMap.deck_2) {
    const sync2 = await syncCustomDeckAndSkillToMaster(optMap.deck_2, optMap.skill_2);
    const finalDeck2 = sync2.cleanDeck || optMap.deck_2;
    const finalSkill2 = sync2.cleanSkill || optMap.skill_2 || playerObj.deck2?.skill || '';

    playerObj.deck2 = {
      ...(playerObj.deck2 || createEmptyDeck()),
      archetype: finalDeck2,
      skill: finalSkill2,
    };
    updatedDecks.push(`Deck 2: **${finalDeck2}** (${finalSkill2 || '-'})`);
  }

  if (updatedDecks.length === 0) {
    return { error: '⚠️ Masukkan minimal nama `deck_1` atau `deck_2` untuk memperbarui data!' };
  }

  targetTeam.lineup = currentLineup;
  return {
    message: `📝 **Berhasil Memperbarui Data Pemain:** **${parsedTarget.ign}**\n${updatedDecks.map((d) => `• ${d}`).join('\n')}`,
  };
}
