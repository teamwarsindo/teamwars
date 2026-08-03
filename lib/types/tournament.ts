export interface PlayerItem {
  id: string;
  name: string;
  teamId: string;
}

export interface DeckSkillSelection {
  deckName: string;
  skillName: string;
}

export interface MatchPlayerConfig {
  playerId: string;
  playerName: string;
  decks: [DeckSkillSelection, DeckSkillSelection]; // Tepat 2 Deck & Skill per pemain
}

export interface MatchRosterConfig {
  teamId: string;
  teamName: string;
  teamLogo: string;
  mainPlayers: MatchPlayerConfig[]; // 5 Pemain Utama
  substitutePlayer?: MatchPlayerConfig; // 1 Pemain Cadangan (Opsional)
}

export interface GameDetailLog {
  gameNumber: number;
  teamAPlayerId: string;
  teamAPlayerName: string;
  teamADeck: string;
  teamASkill: string;
  teamBPlayerId: string;
  teamBPlayerName: string;
  teamBDeck: string;
  teamBSkill: string;
  winnerTeamId: string; // ID Tim Pemenang di Game ini
}

export interface MatchScheduleItem {
  id: string;
  matchDate: string; // ISO / Waktu WIB
  stage: "GROUP_STAGE" | "PLAY_INS" | "QUARTER_FINALS" | "SEMI_FINALS" | "FINALS";
  groupName?: "Group A" | "Group B";
  teamAId: string;
  teamAName: string;
  teamALogo: string;
  teamBId: string;
  teamBName: string;
  teamBLogo: string;
  
  // Data Administrasi Match & Lock Wasit
  referee?: string;
  refereeDiscordId?: string;       // 🟢 ID Discord Wasit (Untuk Auth Bot)
  refereeDiscordUsername?: string; // 🟢 Username Discord Wasit
  refereeToken?: string;           // 🟢 Passcode / Token Khusus Match
  streamer?: string;
  caster?: string;
  streamPlatform?: "Youtube" | "Twitch" | "TikTok" | "Other";
  streamLink?: string;

  // Skor Akhir
  scoreA: number; // 0 - 10
  scoreB: number; // 0 - 10
  isFinished: boolean;

  // Detail Match Analyst Report
  rosterA?: MatchRosterConfig;
  rosterB?: MatchRosterConfig;
  gameLogs?: GameDetailLog[];
}

export interface TeamStandingItem {
  teamId: string;
  teamName: string;
  teamLogo: string;
  groupName: "Group A" | "Group B";
  matchPlayed: number;
  matchWins: number;
  matchLosses: number;
  setWins: number;      // Total Game Individu Menang
  setLosses: number;    // Total Game Individu Kalah
  roundDifference: number; // setWins - setLosses
  points: number;       // (matchWins * 10)
}

export interface PlayerPowerRankingItem {
  playerId: string;
  playerName: string;
  teamName: string;
  playedGames: number;
  wins: number;
  losses: number;
  winRatePercentage: number;
  wpm: number; // Wins Per Match
  aggregateScore: number;
}
