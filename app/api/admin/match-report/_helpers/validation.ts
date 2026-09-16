export function isPlayerLockedInDuel(ign: string, games: any[], teamKey: 'teamA' | 'teamB'): boolean {
  if (!ign || !games || games.length === 0) return false;
  const targetIgn = ign.trim().toLowerCase();

  return games.some((g) => {
    const duelPlayer = teamKey === 'teamA' ? g.playerA : g.playerB;
    const duelIgn = typeof duelPlayer === 'object' ? duelPlayer?.ign : duelPlayer;
    return String(duelIgn || '').trim().toLowerCase() === targetIgn;
  });
}

export function normalizeDecksAndLife(player: any): {
  deck1: any;
  deck2: any;
  remainingLife: number;
  error?: string;
} {
  const d1 = player.deck1;
  const d2 = player.deck2;

  const hasD1 = Boolean(d1 && d1.archetype && d1.archetype.trim() !== '' && d1.archetype.trim() !== '-');
  const hasD2 = Boolean(d2 && d2.archetype && d2.archetype.trim() !== '' && d2.archetype.trim() !== '-');

  if (hasD1 && (!d1.skill || d1.skill.trim() === '' || d1.skill.trim() === '-')) {
    return { deck1: null, deck2: null, remainingLife: 0, error: `Pemain ${player.ign}: Deck 1 (${d1.archetype}) wajib memiliki Skill!` };
  }
  if (hasD2 && (!d2.skill || d2.skill.trim() === '' || d2.skill.trim() === '-')) {
    return { deck1: null, deck2: null, remainingLife: 0, error: `Pemain ${player.ign}: Deck 2 (${d2.archetype}) wajib memiliki Skill!` };
  }

  // 2 Deck Lengkap
  if (hasD1 && hasD2) {
    return {
      deck1: {
        archetype: d1.archetype.trim(),
        skill: d1.skill.trim(),
        wins: Number(d1.wins || 0),
        losses: Number(d1.losses || 0),
        isDead: Boolean(d1.isDead),
        isRepeatUsed: Boolean(d1.isRepeatUsed),
      },
      deck2: {
        archetype: d2.archetype.trim(),
        skill: d2.skill.trim(),
        wins: Number(d2.wins || 0),
        losses: Number(d2.losses || 0),
        isDead: Boolean(d2.isDead),
        isRepeatUsed: Boolean(d2.isRepeatUsed),
      },
      remainingLife: 2,
    };
  }

  // Auto-shift: Deck 2 ke Deck 1, Deck 2 diset null
  if (!hasD1 && hasD2) {
    return {
      deck1: {
        archetype: d2.archetype.trim(),
        skill: d2.skill.trim(),
        wins: Number(d2.wins || 0),
        losses: Number(d2.losses || 0),
        isDead: Boolean(d2.isDead),
        isRepeatUsed: Boolean(d2.isRepeatUsed),
      },
      deck2: null,
      remainingLife: 1,
    };
  }

  // 1 Deck murni di Deck 1
  if (hasD1 && !hasD2) {
    return {
      deck1: {
        archetype: d1.archetype.trim(),
        skill: d1.skill.trim(),
        wins: Number(d1.wins || 0),
        losses: Number(d1.losses || 0),
        isDead: Boolean(d1.isDead),
        isRepeatUsed: Boolean(d1.isRepeatUsed),
      },
      deck2: null,
      remainingLife: 1,
    };
  }

  return {
    deck1: null,
    deck2: null,
    remainingLife: Number(player.remainingLife ?? 0),
  };
    }
        
