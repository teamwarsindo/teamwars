import { MatchScheduleItem, MatchRosterConfig } from "@/lib/types/tournament";

export const DUMMY_ROSTER_A: MatchRosterConfig = {
  teamId: "team-black-titans",
  teamName: "Black Titans",
  teamLogo: "/logo.webp",
  mainPlayers: [
    {
      playerId: "p1",
      playerName: "Venoso",
      decks: [
        { deckName: "Destiny HERO", skillName: "The Power of D" },
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
      ],
    },
    {
      playerId: "p2",
      playerName: "Itami",
      decks: [
        { deckName: "Destiny HERO", skillName: "The Power of D" },
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
      ],
    },
    {
      playerId: "p3",
      playerName: "MacoPin",
      decks: [
        { deckName: "Vaalmonica", skillName: "Whispers of G&E" },
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
      ],
    },
    {
      playerId: "p4",
      playerName: "Hyodo",
      decks: [
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
        { deckName: "Vaalmonica", skillName: "Whispers of G&E" },
      ],
    },
    {
      playerId: "p5",
      playerName: "Naku_10",
      decks: [
        { deckName: "Destiny HERO", skillName: "The Power of D" },
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
      ],
    },
  ],
};

export const DUMMY_ROSTER_B: MatchRosterConfig = {
  teamId: "team-frogx",
  teamName: "Frogx of Hanoi",
  teamLogo: "/logo.webp",
  mainPlayers: [
    {
      playerId: "p6",
      playerName: "JInzo",
      decks: [
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
        { deckName: "Therion", skillName: "Therion BR" },
      ],
    },
    {
      playerId: "p7",
      playerName: "Cajolefa",
      decks: [
        { deckName: "Resonators", skillName: "Inv. Crimson Star" },
        { deckName: "Therion", skillName: "Therion BR" },
      ],
    },
    {
      playerId: "p8",
      playerName: "Ahmed",
      decks: [
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
        { deckName: "Traptrix", skillName: "Traptrix Territory" },
      ],
    },
    {
      playerId: "p9",
      playerName: "TacneFrog1",
      decks: [
        { deckName: "Therion", skillName: "Therion BR" },
        { deckName: "Traptrix", skillName: "Traptrix Territory" },
      ],
    },
    {
      playerId: "p10",
      playerName: "Ree Last",
      decks: [
        { deckName: "Beetrooper", skillName: "Beetrooper Raid" },
        { deckName: "Centur-ion", skillName: "Courage to Rise" },
      ],
    },
  ],
};

export const DUMMY_MATCH_SCHEDULES: MatchScheduleItem[] = [
  {
    id: "match-dummy-1",
    matchDate: "2026-07-25T21:00:00.000Z",
    stage: "GROUP_STAGE",
    groupName: "Group A",
    teamAId: "team-black-titans",
    teamAName: "Black Titans",
    teamALogo: "/logo.webp",
    teamBId: "team-frogx",
    teamBName: "Frogx of Hanoi",
    teamBLogo: "/logo.webp",
    referee: "Jazzmine",
    streamer: "Nousagi",
    streamPlatform: "Youtube",
    streamLink: "youtube.com/Nousagi",
    scoreA: 10,
    scoreB: 6,
    isFinished: true,
    rosterA: DUMMY_ROSTER_A,
    rosterB: DUMMY_ROSTER_B,
    gameLogs: [
      { gameNumber: 1, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p6", teamBPlayerName: "JInzo", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-black-titans" },
      { gameNumber: 2, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p6", teamBPlayerName: "JInzo", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-black-titans" },
      { gameNumber: 3, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p7", teamBPlayerName: "Cajolefa", teamBDeck: "Resonators", teamBSkill: "Inv. Crimson Star", winnerTeamId: "team-black-titans" },
      { gameNumber: 4, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p7", teamBPlayerName: "Cajolefa", teamBDeck: "Resonators", teamBSkill: "Inv. Crimson Star", winnerTeamId: "team-frogx" },
      { gameNumber: 5, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Centur-ion", teamASkill: "Courage to Rise", teamBPlayerId: "p7", teamBPlayerName: "Cajolefa", teamBDeck: "Resonators", teamBSkill: "Inv. Crimson Star", winnerTeamId: "team-black-titans" },
      { gameNumber: 6, teamAPlayerId: "p5", teamAPlayerName: "Naku_10", teamADeck: "Centur-ion", teamASkill: "Courage to Rise", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Therion", teamBSkill: "Therion BR", winnerTeamId: "team-frogx" },
      { gameNumber: 7, teamAPlayerId: "p4", teamAPlayerName: "Hyodo", teamADeck: "Centur-ion", teamASkill: "Courage to Rise", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Therion", teamBSkill: "Therion BR", winnerTeamId: "team-black-titans" },
      { gameNumber: 8, teamAPlayerId: "p4", teamAPlayerName: "Hyodo", teamADeck: "Centur-ion", teamASkill: "Courage to Rise", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Traptrix", teamBSkill: "Traptrix Territory", winnerTeamId: "team-frogx" },
      { gameNumber: 9, teamAPlayerId: "p4", teamAPlayerName: "Hyodo", teamADeck: "Vaalmonica", teamASkill: "Whispers of G&E", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Traptrix", teamBSkill: "Traptrix Territory", winnerTeamId: "team-frogx" },
      { gameNumber: 10, teamAPlayerId: "p2", teamAPlayerName: "Itami", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Traptrix", teamBSkill: "Traptrix Territory", winnerTeamId: "team-frogx" },
      { gameNumber: 11, teamAPlayerId: "p2", teamAPlayerName: "Itami", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p9", teamBPlayerName: "TacneFrog1", teamBDeck: "Traptrix", teamBSkill: "Traptrix Territory", winnerTeamId: "team-black-titans" },
      { gameNumber: 12, teamAPlayerId: "p2", teamAPlayerName: "Itami", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p8", teamBPlayerName: "Ahmed", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-black-titans" },
      { gameNumber: 13, teamAPlayerId: "p2", teamAPlayerName: "Itami", teamADeck: "Destiny HERO", teamASkill: "The Power of D", teamBPlayerId: "p8", teamBPlayerName: "Ahmed", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-frogx" },
      { gameNumber: 14, teamAPlayerId: "p3", teamAPlayerName: "MacoPin", teamADeck: "Vaalmonica", teamASkill: "Whispers of G&E", teamBPlayerId: "p8", teamBPlayerName: "Ahmed", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-black-titans" },
      { gameNumber: 15, teamAPlayerId: "p3", teamAPlayerName: "MacoPin", teamADeck: "Vaalmonica", teamASkill: "Whispers of G&E", teamBPlayerId: "p10", teamBPlayerName: "Ree Last", teamBDeck: "Centur-ion", teamBSkill: "Courage to Rise", winnerTeamId: "team-black-titans" },
      { gameNumber: 16, teamAPlayerId: "p3", teamAPlayerName: "MacoPin", teamADeck: "Vaalmonica", teamASkill: "Whispers of G&E", teamBPlayerId: "p10", teamBPlayerName: "Ree Last", teamBDeck: "Beetrooper", teamBSkill: "Beetrooper Raid", winnerTeamId: "team-black-titans" },
    ],
  },
];