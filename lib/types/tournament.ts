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

export interface TeamItem {
  id?: string;
  name: string;
  slug?: string;
  kodeTim?: string;
  abbreviation?: string;
  logo?: string;
  groupName?: string;
  discordEmojiId?: string;
  discordRoleId?: string;
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
  refereeDiscordId?: string;       // ID Discord Wasit (Untuk Auth Bot)
  refereeDiscordUsername?: string; // Username Discord Wasit
  refereeToken?: string;           // Passcode / Token Khusus Link Wasit
  streamer?: string;
  caster?: string;
  streamerDiscordId?: string;
  casterDiscordId?: string;
  streamPlatform?: "Youtube" | "Twitch" | "TikTok" | "Other";
  streamLink?: string;

  // Skor Akhir (Quick Score / Sync dari Analyst)
  scoreA: number; // 0 - 10
  scoreB: number; // 0 - 10
  isFinished: boolean;

  // Detail Match Analyst Report
  rosterA?: MatchRosterConfig;
  rosterB?: MatchRosterConfig;
  gameLogs?: GameDetailLog[];

  // 🟢 WEEK INFORMATION
  weekName?: string;                  // Contoh: "Week 1"
  weekNumber?: number;                // Contoh: 1
  calculatedWeekNumber?: number;      // Alternatif kalkulasi minggu

  // 🟢 DISCORD AUTOMATION IDS (Penyimpanan ID Channel & Message Embed)
  discordChannelId?: string;          // ID Text Channel Match
  openingMsgId?: string;              // ID Pesan Embed Opening
  recapMsgId?: string;                // ID Pesan Embed Weekly Recap
  scheduleMsgId?: string;             // ID Pesan Embed Jadwal Publik (#schedule)
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

export interface StandingsItem {
  teamName: string;
  teamLogo?: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  matchDiff: number;
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