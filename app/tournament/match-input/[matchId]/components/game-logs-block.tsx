"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { PlayerDeckInfo } from "./roster-lineup-block";
import { TeamGameInput } from "./team-game-input";
import { WinnerSelector } from "./winner-selector";
import { GameLogsTable } from "./game-logs-table";

interface GameLogsBlockProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  lineupA: PlayerDeckInfo[];
  lineupB: PlayerDeckInfo[];
}

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  lineupA,
  lineupB,
}: GameLogsBlockProps) {
  const [playerA, setPlayerA] = useState("");
  const [selectedDeckSlotA, setSelectedDeckSlotA] = useState<"deck1" | "deck2">("deck1");
  const [deckA, setDeckA] = useState("");
  const [skillA, setSkillA] = useState("");

  const [playerB, setPlayerB] = useState("");
  const [selectedDeckSlotB, setSelectedDeckSlotB] = useState<"deck1" | "deck2">("deck1");
  const [deckB, setDeckB] = useState("");
  const [skillB, setSkillB] = useState("");

  const [gameResult, setGameResult] = useState<"A" | "B" | "">("");

  const [isRepeatA, setIsRepeatA] = useState(false);
  const [isRepeatB, setIsRepeatB] = useState(false);

  const [isLockedA, setIsLockedA] = useState(false);
  const [isLockedB, setIsLockedB] = useState(false);

  const repeatCountA = gameLogs.filter((g) => (g as any).isRepeatA).length;
  const repeatCountB = gameLogs.filter((g) => (g as any).isRepeatB).length;

  const getPlayerStats = (playerName: string, isTeamA: boolean) => {
    const pLogs = gameLogs.filter((g) => (isTeamA ? g.playerAName : g.playerBName) === playerName);
    const wins = pLogs.filter((g) => g.winnerTeamId === (isTeamA ? match.teamAId : match.teamBId)).length;
    const losses = pLogs.filter((g) => g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)).length;

    const pObj = (isTeamA ? lineupA : lineupB).find((x) => x.playerName === playerName);
    const deck1Lost = pLogs.some(
      (g) => (isTeamA ? g.deckA : g.deckB) === pObj?.deck1 && g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)
    );
    const deck2Lost = pLogs.some(
      (g) => (isTeamA ? g.deckA : g.deckB) === pObj?.deck2 && g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)
    );

    const isEliminated = losses >= 2 || (deck1Lost && deck2Lost);
    return { wins, losses, deck1Lost, deck2Lost, isEliminated, totalGames: pLogs.length };
  };

  const availableOptionsA = lineupA.filter((p) => !getPlayerStats(p.playerName, true).isEliminated).map((p) => p.playerName);
  const availableOptionsB = lineupB.filter((p) => !getPlayerStats(p.playerName, false).isEliminated).map((p) => p.playerName);

  const canRepeatA = (() => {
    if (!playerA || repeatCountA >= 2) return false;
    const stats = getPlayerStats(playerA, true);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1;
  })();

  const canRepeatB = (() => {
    if (!playerB || repeatCountB >= 2) return false;
    const stats = getPlayerStats(playerB, false);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1;
  })();

  useEffect(() => {
    if (gameLogs.length === 0) return;
    const lastGame = gameLogs[gameLogs.length - 1];

    if (lastGame.winnerTeamId === match.teamAId) {
      setPlayerA(lastGame.playerAName);
      setIsLockedA(true);
      setPlayerB("");
      setIsLockedB(false);
    } else if (lastGame.winnerTeamId === match.teamBId) {
      setPlayerB(lastGame.playerBName);
      setIsLockedB(true);
      setPlayerA("");
      setIsLockedA(false);
    }
  }, [gameLogs, match.teamAId, match.teamBId]);

  useEffect(() => {
    if (!playerA) {
      setDeckA("");
      setSkillA("");
      return;
    }
    const p = lineupA.find((x) => x.playerName === playerA);
    if (!p) return;

    const stats = getPlayerStats(playerA, true);
    if (isRepeatA) {
      setSelectedDeckSlotA("deck1");
      setDeckA(p.deck1);
      setSkillA(p.skill1);
    } else if (stats.deck1Lost) {
      setSelectedDeckSlotA("deck2");
      setDeckA(p.deck2);
      setSkillA(p.skill2);
    } else {
      setSelectedDeckSlotA("deck1");
      setDeckA(p.deck1);
      setSkillA(p.skill1);
    }
  }, [playerA, isRepeatA, lineupA, gameLogs]);

  useEffect(() => {
    if (!playerB) {
      setDeckB("");
      setSkillB("");
      return;
    }
    const p = lineupB.find((x) => x.playerName === playerB);
    if (!p) return;

    const stats = getPlayerStats(playerB, false);
    if (isRepeatB) {
      setSelectedDeckSlotB("deck1");
      setDeckB(p.deck1);
      setSkillB(p.skill1);
    } else if (stats.deck1Lost) {
      setSelectedDeckSlotB("deck2");
      setDeckB(p.deck2);
      setSkillB(p.skill2);
    } else {
      setSelectedDeckSlotB("deck1");
      setDeckB(p.deck1);
      setSkillB(p.skill1);
    }
  }, [playerB, isRepeatB, lineupB, gameLogs]);

  const handleAddSingleGame = () => {
    if (!playerA || !playerB || !gameResult) return;

    const winnerTeamId = gameResult === "A" ? match.teamAId : match.teamBId;

    const newLog: GameDetailLog & { isRepeatA?: boolean; isRepeatB?: boolean } = {
      gameNumber: gameLogs.length + 1,
      playerAId: playerA,
      playerAName: playerA,
      deckA: deckA || "-",
      skillA: skillA || "-",
      playerBId: playerB,
      playerBName: playerB,
      deckB: deckB || "-",
      skillB: skillB || "-",
      winnerTeamId,
      isRepeatA,
      isRepeatB,
    };

    setGameLogs([...gameLogs, newLog]);
    setGameResult("");
    setIsRepeatA(false);
    setIsRepeatB(false);
  };

  const isFormReady = Boolean(playerA && playerB && deckA && deckB);

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          3. Form Input Log Game #{gameLogs.length + 1}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* TEAM A INPUT */}
        <TeamGameInput
          isTeamA={true}
          teamName={match.teamAName}
          teamLogo={match.teamALogo}
          player={playerA}
          setPlayer={setPlayerA}
          availableOptions={availableOptionsA}
          isLocked={isLockedA}
          setIsLocked={setIsLockedA}
          activePlayerObj={lineupA.find((p) => p.playerName === playerA)}
          selectedDeckSlot={selectedDeckSlotA}
          setSelectedDeckSlot={setSelectedDeckSlotA}
          skill={skillA}
          repeatCount={repeatCountA}
          isRepeat={isRepeatA}
          setIsRepeat={setIsRepeatA}
          canRepeat={canRepeatA}
          deckLostStats={playerA ? getPlayerStats(playerA, true) : undefined}
        />

        {/* TEAM B INPUT */}
        <TeamGameInput
          isTeamA={false}
          teamName={match.teamBName}
          teamLogo={match.teamBLogo}
          player={playerB}
          setPlayer={setPlayerB}
          availableOptions={availableOptionsB}
          isLocked={isLockedB}
          setIsLocked={setIsLockedB}
          activePlayerObj={lineupB.find((p) => p.playerName === playerB)}
          selectedDeckSlot={selectedDeckSlotB}
          setSelectedDeckSlot={setSelectedDeckSlotB}
          skill={skillB}
          repeatCount={repeatCountB}
          isRepeat={isRepeatB}
          setIsRepeat={setIsRepeatB}
          canRepeat={canRepeatB}
          deckLostStats={playerB ? getPlayerStats(playerB, false) : undefined}
        />
      </div>

      {/* WINNER SELECTOR */}
      <WinnerSelector
        match={match}
        gameNumber={gameLogs.length + 1}
        isFormReady={isFormReady}
        gameResult={gameResult}
        setGameResult={setGameResult}
        onSaveGame={handleAddSingleGame}
      />

      {/* GAME LOGS PREVIEW TABLE */}
      <GameLogsTable match={match} gameLogs={gameLogs} setGameLogs={setGameLogs} />
    </section>
  );
      }
          
