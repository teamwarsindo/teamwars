export interface DeckInfo {
  archetype: string;
  skill: string;
  wins?: number;
  losses?: number;
  isDead?: boolean;
  isRepeatUsed?: boolean;
}

export interface PlayerLineupItem {
  ign: string;
  idDuelLinks: string;
  remainingLife: number;
  totalWins: number;
  totalLosses: number;
  deck1: DeckInfo;
  deck2: DeckInfo;
}

export interface GameEntry {
  gameNumber: number;
  winner: 'teamA' | 'teamB';
  playerA: {
    ign: string;
    idDuelLinks: string;
    archetype: string;
    skill: string;
    isRepeat?: boolean;
  };
  playerB: {
    ign: string;
    idDuelLinks: string;
    archetype: string;
    skill: string;
    isRepeat?: boolean;
  };
  isDeckloss?: boolean;
  decklossTeam?: '' | 'teamA' | 'teamB';
  notes?: string;
  timestamp: string;
}

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

export interface MatchReportData {
  matchId: string;
  week: number;
  metadata: {
    date: string;
    referee: string;
    streamer?: string;
    day?: string;
    time?: string;
  };
  teamA: {
    name: string;
    score: number;
    repeatsUsed: number;
    warningsUsed: number;
    lineup: PlayerLineupItem[];
  };
  teamB: {
    name: string;
    score: number;
    repeatsUsed: number;
    warningsUsed: number;
    lineup: PlayerLineupItem[];
  };
  games: GameEntry[];
  isFinished: boolean;
}
