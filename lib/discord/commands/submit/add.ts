import { SubmitContext, parseIgnAndId, createEmptyDeck } from './types';

export function handleSubAdd(ctx: SubmitContext): { error?: string; message?: string } {
  const { teamKey, reportData, teamRoster, optMap } = ctx;
  const targetTeam = reportData[teamKey];
  const currentLineup: any[] = targetTeam.lineup || [];

  const inputPlayerEntries: { rawInput: string; count: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    const raw = optMap[`pemain_${i}`];
    if (raw && typeof raw === 'string' && raw.trim()) {
      const count = Number(optMap[`deck_count_${i}`]) || 2;
      inputPlayerEntries.push({ rawInput: raw.trim(), count });
    }
  }

  if (inputPlayerEntries.length === 0) {
    return { error: '❌ Masukkan minimal 1 pemain pada opsi `pemain_1`!' };
  }

  const remainingSlots = 5 - currentLineup.length;
  if (remainingSlots <= 0) {
    return { error: '⚠️ **Gagal Submit:** Kuota 5 pemain untuk tim ini sudah lengkap!' };
  }

  const parsedEntries = inputPlayerEntries.map((item) => {
    const parsed = parseIgnAndId(item.rawInput);
    let idDl = parsed.idDuelLinks;
    if (!idDl) {
      const found = teamRoster.find((p) => p.ign.toLowerCase() === parsed.ign.toLowerCase());
      idDl = found?.idDuelLinks || '';
    }
    return { ign: parsed.ign, idDuelLinks: idDl, count: item.count };
  });

  const newValidEntries = parsedEntries.filter(
    (entry) => !currentLineup.some((p) => String(p.ign || '').toLowerCase() === entry.ign.toLowerCase())
  );

  if (newValidEntries.length === 0) {
    return { error: '⚠️ Semua pemain yang kamu masukkan sudah terdaftar di lineup!' };
  }

  if (newValidEntries.length > remainingSlots) {
    return {
      error: `❌ **Gagal Submit! Kuota Melebihi Batas.**\nTim ini sudah terisi **${currentLineup.length}/5 pemain**.\nSisa slot yang tersedia hanya **${remainingSlots} pemain lagi**.`,
    };
  }

  const addedList: string[] = [];
  newValidEntries.forEach(({ ign, idDuelLinks, count }) => {
    currentLineup.push({
      ign,
      idDuelLinks,
      totalWins: 0,
      totalLosses: 0,
      remainingLife: count,
      deck1: createEmptyDeck(),
      deck2: count === 1 ? null : createEmptyDeck(),
    });

    const dlText = idDuelLinks ? ` (${idDuelLinks})` : '';
    const statusText = count === 1 ? '*(1 Deck - Menunggu Input)*' : '*(2 Deck - Menunggu Input)*';
    addedList.push(`• **${ign}**${dlText} ${statusText}`);
  });

  targetTeam.lineup = currentLineup;
  return {
    message: `✅ **Berhasil Mendaftarkan ${newValidEntries.length} Pemain ke Lineup!**\n${addedList.join('\n')}`,
  };
}
