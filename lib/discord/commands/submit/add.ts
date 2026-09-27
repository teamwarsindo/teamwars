import { SubmitContext, parseIgnAndId, createEmptyDeck } from './types';

export function handleSubAdd(ctx: SubmitContext): { error?: string; message?: string } {
  const { teamKey, reportData, teamRoster, optMap } = ctx;
  const targetTeam = reportData[teamKey];
  const currentLineup: any[] = targetTeam.lineup || [];

  // 1. Kumpulkan seluruh input pemain_1 s/d pemain_5
  const inputPlayerEntries: { rawInput: string; count: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    const raw = optMap[`pemain_${i}`];
    if (raw && typeof raw === 'string' && raw.trim() && raw !== 'FULL_LINEUP') {
      const count = Number(optMap[`deck_count_${i}`]) || 2;
      inputPlayerEntries.push({ rawInput: raw.trim(), count });
    }
  }

  if (inputPlayerEntries.length === 0) {
    return { error: '❌ Masukkan minimal 1 pemain pada opsi `pemain_1`!' };
  }

  // 2. Parse IGN & sinkronkan ID Duel Links dari roster
  const parsedEntries = inputPlayerEntries.map((item) => {
    const parsed = parseIgnAndId(item.rawInput);
    let idDl = parsed.idDuelLinks;
    if (!idDl) {
      const found = teamRoster.find((p) => p.ign.toLowerCase() === parsed.ign.toLowerCase());
      idDl = found?.idDuelLinks || '';
    }
    return { ign: parsed.ign, idDuelLinks: idDl, count: item.count };
  });

  // Filter duplikasi internal (input berulang) dan pemain yang sudah ada di lineup
  const seenIgns = new Set<string>();
  const newValidEntries = parsedEntries.filter((entry) => {
    const ignLower = entry.ign.toLowerCase();
    const isAlreadyInLineup = currentLineup.some(
      (p) => String(p.ign || '').toLowerCase() === ignLower
    );
    if (isAlreadyInLineup || seenIgns.has(ignLower)) {
      return false;
    }
    seenIgns.add(ignLower);
    return true;
  });

  if (newValidEntries.length === 0) {
    return { error: '⚠️ Semua pemain yang kamu masukkan sudah terdaftar di lineup!' };
  }

  // 3. PRIORITAS: Cari slot kosong bertuan deck (hasil /submit del saat match berjalan)
  const vacantSlotIndexes: number[] = [];
  currentLineup.forEach((p, index) => {
    if ((!p.ign || !p.ign.trim()) && (p.deck1 || p.deck2)) {
      vacantSlotIndexes.push(index);
    }
  });

  // Hitung jumlah slot baru yang benar-benar bisa ditambahkan ke array
  const activePlayersCount = currentLineup.filter((p) => p.ign && p.ign.trim()).length;
  const remainingNewSlots = Math.max(0, 5 - currentLineup.length);
  const totalAvailableSlots = vacantSlotIndexes.length + remainingNewSlots;

  if (newValidEntries.length > totalAvailableSlots) {
    return {
      error: `❌ **Gagal Submit! Kuota Melebihi Batas.**\nLineup tim saat ini terisi **${activePlayersCount}/5 pemain**.\nSlot yang tersedia: **${totalAvailableSlots} slot** (${vacantSlotIndexes.length} slot ganti, ${remainingNewSlots} slot baru).`,
    };
  }

  const addedList: string[] = [];

  // 4. Proses Pendaftaran: Isi slot kosong terlebih dahulu, sisanya tambahkan ke array
  newValidEntries.forEach(({ ign, idDuelLinks, count }) => {
    if (vacantSlotIndexes.length > 0) {
      const targetSlotIndex = vacantSlotIndexes.shift()!;
      const slot = currentLineup[targetSlotIndex];

      slot.ign = ign;
      slot.idDuelLinks = idDuelLinks;
      slot.totalWins = 0;
      slot.totalLosses = 0;

      const dlText = idDuelLinks ? ` (${idDuelLinks})` : '';
      const d1Name = slot.deck1?.archetype ? `• Deck 1: ${slot.deck1.archetype}` : '';
      const d2Name = slot.deck2?.archetype ? `• Deck 2: ${slot.deck2.archetype}` : '';
      addedList.push(`• **${ign}**${dlText} *(Mengisi Slot Ganti & Mewarisi Deck)*\n  ${d1Name}\n  ${d2Name}`);
    } else {
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
    }
  });

  targetTeam.lineup = currentLineup;
  return {
    message: `✅ **Berhasil Mendaftarkan ${newValidEntries.length} Pemain ke Lineup!**\n${addedList.join('\n')}`,
  };
}
