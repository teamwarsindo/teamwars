export interface DeckItem {
  archetype: string;
  skill: string;
  isDead: boolean;
  wins?: number;
  losses?: number;
  isRepeatUsed?: boolean;
}

export interface PlayerLineup {
  ign: string;
  idDuelLinks: string;
  remainingLife: number;
  totalWins?: number;
  totalLosses?: number;
  deck1: DeckItem;
  deck2: DeckItem;
}

export const createEmptyPlayer = (): PlayerLineup => ({
  ign: '',
  idDuelLinks: '',
  remainingLife: 2,
  deck1: { archetype: '', skill: '', isDead: false },
  deck2: { archetype: '', skill: '', isDead: false },
});
