import { GameDetailLog } from "@/lib/types/tournament";
import { PlayerDeckInfo } from "../components/roster-lineup-block";

export function getPlayerStats(
  playerName: string,
  isTeamA: boolean,
  gameLogs: GameDetailLog[],
  teamId: string,
  lineup: PlayerDeckInfo[]
) {
  if (!gameLogs || gameLogs.length === 0 || !playerName) {
    return { wins: 0, losses: 0, deck1Lost: false, deck2Lost: false, isEliminated: false, totalGames: 0, isLastGameRepeat: false };
  }

  const pLogs = gameLogs.filter((g) => (isTeamA ? g.playerAName : g.playerBName) === playerName);
  const wins = pLogs.filter((g) => g.winnerTeamId === teamId).length;
  const losses = pLogs.filter((g) => g.winnerTeamId !== teamId).length;
  const pObj = lineup.find((x) => x.playerName === playerName);

  const lastGame = pLogs[pLogs.length - 1];
  const isLastGameRepeat = lastGame ? Boolean(isTeamA ? (lastGame as any).isRepeatA : (lastGame as any).isRepeatB) : false;

  const deck1Lost = pLogs.some(
    (g) =>
      (isTeamA ? g.deckA : g.deckB) === pObj?.deck1 &&
      g.winnerTeamId !== teamId &&
      !(isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB)
  );

  const deck2Lost = pLogs.some(
    (g) => (isTeamA ? g.deckA : g.deckB) === pObj?.deck2 && g.winnerTeamId !== teamId
  );

  return {
    wins,
    losses,
    deck1Lost,
    deck2Lost,
    isEliminated: losses >= 2 || (deck1Lost && deck2Lost),
    totalGames: pLogs.length,
    isLastGameRepeat,
  };
}

export function extractIgn(fullString: string) {
  return fullString.replace(/\s*\([^)]*\)/g, "").trim();
}