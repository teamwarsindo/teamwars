export type TournamentStage = 'GROUP_STAGE' | 'PLAYOFFS' | 'FINALS';

export type AdminRole = 'SUPER_ADMIN' | 'ROULETTE_ADMIN' | 'MATCH_ADMIN';

export interface AdminUser {
  username: string;
  role: AdminRole;
  createdAt: string;
}

export interface MasterData {
  referees: string[];
  streamers: string[];
  decks: string[];
  skills: string[];
  streamPlatforms: string[];
}

export interface MatchReportRow {
  id: string;
  playerA: string;
  deckA: string;
  skillA: string;
  resultA: 'W' | 'L' | '-';
  resultB: 'W' | 'L' | '-';
  skillB: string;
  deckB: string;
  playerB: string;
}

export interface MatchReportData {
  streamPlatform: string;
  streamer: string;
  referee: string;
  matchDateFormatted: string;
  rosterA: string[]; // 5 pemain terpilih
  rosterB: string[]; // 5 pemain terpilih
  games: MatchReportRow[];
}

export interface MatchScheduleItem {
  id: string;
  matchDate: string; // ISO string
  stage: TournamentStage;
  groupName: 'Group A' | 'Group B' | 'Playoffs';
  weekNumber: number;
  teamAId: string;
  teamAName: string;
  teamALogo: string;
  teamBId: string;
  teamBName: string;
  teamBLogo: string;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
  referee: string;
  streamer: string;
  report?: MatchReportData | null;
}

export interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  groupName: string;
  played: number;
  win: number;
  lose: number;
  points: number;
  matchDiff: number;
}
