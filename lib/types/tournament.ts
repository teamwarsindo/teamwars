export const DIVISION_MAP = {
  GROUP_A: 'Anda Yakin?',
  GROUP_B: 'Sakurasawa Fighters',
} as const;

export interface PlayerDeckInfo {
  playerName: string;
  duellinksId?: string;
  deck1: string;
  skill1: string;
  deck2: string;
  skill2: string;
}

export interface GameDetailLog {
  gameNumber: number;
  playerAId: string;
  playerAName: string;
  deckA: string;
  skillA: string;
  playerBId: string;
  playerBName: string;
  deckB: string;
  skillB: string;
  winnerTeamId: string;
  isRepeatA?: boolean;
  isRepeatB?: boolean;
  isTLA?: boolean;
  isTLB?: boolean;
}

export interface WarningLogItem {
  gameNumber: number;
  teamId: string;
  teamName: string;
  warningNumber: number;
  isTechnicalLossTriggered: boolean;
}

export interface MatchScheduleItem {
  id: string;
  matchDate: string;
  stage: string;
  groupName: string;
  teamAId: string;
  teamAName: string;
  teamALogo: string;
  teamBId: string;
  teamBName: string;
  teamBLogo: string;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
  weekNumber?: number;
  referee?: string;
  refereeDiscordId?: string;
  refereeToken?: string;
  streamer?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  gameLogs?: GameDetailLog[];
  lineupA?: PlayerDeckInfo[];
  lineupB?: PlayerDeckInfo[];
  rosterA?: {
    teamId: string;
    teamName: string;
    teamLogo: string;
    mainPlayers: Array<{ playerId: string; playerName: string }>;
  };
  rosterB?: {
    teamId: string;
    teamName: string;
    teamLogo: string;
    mainPlayers: Array<{ playerId: string; playerName: string }>;
  };
}

export interface MatchDetailsKV {
  matchId: string;
  lineupA: PlayerDeckInfo[];
  lineupB: PlayerDeckInfo[];
  gameLogs: GameDetailLog[];
  warningLogs?: WarningLogItem[];
  referee?: string;
  refereeDiscordId?: string;
  streamer?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  lateDecksA?: number;
  lateDecksB?: number;
  isLineupLocked?: boolean;
  rosterA?: {
    teamId: string;
    teamName: string;
    teamLogo: string;
    mainPlayers: Array<{ playerId: string; playerName: string }>;
  };
  rosterB?: {
    teamId: string;
    teamName: string;
    teamLogo: string;
    mainPlayers: Array<{ playerId: string; playerName: string }>;
  };
}

export interface TeamStandingItem {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  groupName: string;
  matchPlayed: number;
  matchWins: number;
  matchLosses: number;
  setWins: number;
  setLosses: number;
  roundDifference: number;
  points: number;
}