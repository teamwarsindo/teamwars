import { MatchScheduleItem } from '@/app/tournament/_library';

export interface GameSnapshot {
  teamA: any;
  teamB: any;
}

export interface GameRecord {
  gameNumber: number;
  winner: 'teamA' | 'teamB';
  playerA: {
    ign: string;
    idDuelLinks?: string;
    archetype: string;
    skill?: string;
    isRepeat?: boolean;
  };
  playerB: {
    ign: string;
    idDuelLinks?: string;
    archetype: string;
    skill?: string;
    isRepeat?: boolean;
  };
  ssHandA: boolean;
  ssHandB: boolean;
  isDeckloss?: boolean;
  decklossTeam?: string;
  notes?: string;
  timestamp: string;
  snapshot?: GameSnapshot;
}

export interface GameContext {
  interaction: any;
  channelId: string;
  appId: string;
  token: string;
  match: MatchScheduleItem;
  reportData: any;
  optMap: Record<string, any>;
  isBeforeKickoff: boolean;
  userIsAdmin: boolean;
}

// Re-export agar file lain yang mengimpor dari './types' tetap berjalan normal
export * from './helpers';
export * from './camp-tracker';
