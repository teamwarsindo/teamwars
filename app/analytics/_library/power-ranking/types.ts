export interface GameEntry {
  gameNumber: number;
  winner: "teamA" | "teamB" | string;
  playerA?: {
    ign: string;
    archetype?: string;
  };
  playerB?: {
    ign: string;
    archetype?: string;
  };
}

export interface LineupPlayer {
  ign: string;
  totalWins?: number;
  totalLosses?: number;
  deck1?: {
    archetype?: string;
    wins?: number;
    losses?: number;
  };
  deck2?: {
    archetype?: string;
    wins?: number;
    losses?: number;
  };
}

export interface RawMatchReport {
  matchId?: string;
  id?: string;
  week?: number;
  teamA: {
    name: string;
    slug?: string;
    score?: number;
    lineup?: LineupPlayer[];
    groupName?: string;
    logo?: string;
  };
  teamB: {
    name: string;
    slug?: string;
    score?: number;
    lineup?: LineupPlayer[];
    groupName?: string;
    logo?: string;
  };
  games?: GameEntry[];
  isFinished?: boolean;
}

export type MatchReportData = RawMatchReport;

export interface TeamMemberItem {
  ign?: string;
  name?: string;
  role?: string;
  teamsJoinedCount?: number;
  isAdded?: boolean;
  isTransfer?: boolean;
}

export interface TeamRosterData {
  slug: string;
  name: string;
  logo?: string;
  color?: string;
  groupName?: string;
  members?: TeamMemberItem[] | string;
  players?: TeamMemberItem[] | string;
}

export interface PowerRankingPlayer {
  rank: number;
  name: string;
  teamSlug: string;
  teamName: string;
  teamLogo?: string;
  groupName?: string;
  played: number;
  won: number;
  lost: number;
  wpm: number;
  agg: number;
  isExPlayer?: boolean;
  isAdded?: boolean;
  bestDeck?: string;
}

export interface PowerRankingGrandTotal {
  played: number;
  won: number;
  lost: number;
  wpm: number;
  agg: number;
}
