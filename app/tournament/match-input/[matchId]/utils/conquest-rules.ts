import { GameDetailLog, PlayerDeckInfo } from "@/lib/types/tournament";

export function getPlayerStats(
  playerName: string,
  isTeamA: boolean,
  gameLogs: GameDetailLog[],
  teamId: string,
  lineup: PlayerDeckInfo[]
) {
  if (!gameLogs || gameLogs.length === 0 || !playerName || playerName === "-") {
    return {
      wins: 0,
      losses: 0,
      deck1Lost: false,
      deck2Lost: false,
      hasActivatedRepeat: false,
      isEliminated: false,
      totalGames: 0,
      isLastGameRepeat: false,
    };
  }

  // Filter game log murni yang dimainkan oleh pemain ini (mengabaikan game Auto-TL Roster)
  const pLogs = gameLogs.filter(
    (g) => (isTeamA ? g.playerAName : g.playerBName) === playerName
  );

  const wins = pLogs.filter((g) => g.winnerTeamId === teamId).length;
  const losses = pLogs.filter((g) => g.winnerTeamId !== teamId).length;
  const pObj = lineup.find((x) => x.playerName === playerName);

  const lastGame = pLogs[pLogs.length - 1];
  const isLastGameRepeat = lastGame
    ? Boolean(isTeamA ? lastGame.isRepeatA : lastGame.isRepeatB)
    : false;

  const hasActivatedRepeat = pLogs.some((g) =>
    Boolean(isTeamA ? g.isRepeatA : g.isRepeatB)
  );

  const deck1Lost = pLogs.some(
    (g) =>
      (isTeamA ? g.deckA : g.deckB) === pObj?.deck1 &&
      g.winnerTeamId !== teamId &&
      !Boolean(isTeamA ? g.isRepeatA : g.isRepeatB)
  );

  const deck2Lost = pLogs.some(
    (g) => (isTeamA ? g.deckA : g.deckB) === pObj?.deck2 && g.winnerTeamId !== teamId
  );

  return {
    wins,
    losses,
    deck1Lost,
    deck2Lost,
    hasActivatedRepeat,
    isEliminated: losses >= 2 || (deck1Lost && deck2Lost),
    totalGames: pLogs.length,
    isLastGameRepeat,
  };
}

export function extractIgn(fullString: string) {
  if (!fullString) return "";
  return fullString.replace(/\s*\([^)]*\)/g, "").trim();
}