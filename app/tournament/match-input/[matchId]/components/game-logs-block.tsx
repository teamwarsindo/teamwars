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

  // 🟢 CEK STATUS LENGKAP PEMAIN & DECK DARI KANTONG LOG GAME
  const getPlayerStats = (playerName: string, isTeamA: boolean) => {
    const pLogs = gameLogs.filter((g) => (isTeamA ? g.playerAName : g.playerBName) === playerName);
    const wins = pLogs.filter((g) => g.winnerTeamId === (isTeamA ? match.teamAId : match.teamBId)).length;
    const losses = pLogs.filter((g) => g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)).length;

    const pObj = (isTeamA ? lineupA : lineupB).find((x) => x.playerName === playerName);

    // Cek apakah pernah pakai Repeat
    const hasActivatedRepeat = pLogs.some((g) => (isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB));

    // Cek log terakhir pemain
    const lastGameOfPlayer = pLogs[pLogs.length - 1];
    const lastDeckUsed = lastGameOfPlayer ? (isTeamA ? lastGameOfPlayer.deckA : lastGameOfPlayer.deckB) : null;
    const isLastGameRepeat = lastGameOfPlayer ? (isTeamA ? (lastGameOfPlayer as any).isRepeatA : (lastGameOfPlayer as any).isRepeatB) : false;

    // Deck 1 & Deck 2 Kalah Status
    const deck1Lost = pLogs.some(
      (g) =>
        (isTeamA ? g.deckA : g.deckB) === pObj?.deck1 &&
        g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId) &&
        !(isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB)
    );

    const deck2Lost = pLogs.some(
      (g) =>
        (isTeamA ? g.deckA : g.deckB) === pObj?.deck2 &&
        g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)
    );

    const isEliminated = losses >= 2 || (deck1Lost && deck2Lost);

    return {
      wins,
      losses,
      deck1Lost,
      deck2Lost,
      hasActivatedRepeat,
      isDeck1Repeated: hasActivatedRepeat,
      lastDeckUsed,
      isLastGameRepeat,
      isEliminated,
      totalGames: pLogs.length,
    };
  };

  const availableOptionsA = lineupA.filter((p) => !getPlayerStats(p.playerName, true).isEliminated).map((p) => p.playerName);
  const availableOptionsB = lineupB.filter((p) => !getPlayerStats(p.playerName, false).isEliminated).map((p) => p.playerName);

  const canRepeatA = (() => {
    if (!playerA || repeatCountA >= 2) return false;
    const stats = getPlayerStats(playerA, true);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1 && !stats.hasActivatedRepeat;
  })();

  const canRepeatB = (() => {
    if (!playerB || repeatCountB >= 2) return false;
    const stats = getPlayerStats(playerB, false);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1 && !stats.hasActivatedRepeat;
  })();

  // 🟢 AUTO LOCK WINNER & RECORD LAST PLAYED DECK
  useEffect(() => {
    if (gameLogs.length === 0) {
      setIsLockedA(false);
      setIsLockedB(false);
      return;
    }
    const lastGame = gameLogs[gameLogs.length - 1];

    if (lastGame.winnerTeamId === match.teamAId) {
      setPlayerA(lastGame.playerAName);
      setIsLockedA(true);
      
      // Auto Lock Slot Deck yang sedang aktif di game pemenang
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      if (pA && lastGame.deckA === pA.deck2) {
        setSelectedDeckSlotA("deck2");
      } else {
        setSelectedDeckSlotA("deck1");
      }

      setPlayerB("");
      setIsLockedB(false);
    } else if (lastGame.winnerTeamId === match.teamBId) {
      setPlayerB(lastGame.playerBName);
      setIsLockedB(true);

      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      if (pB && lastGame.deckB === pB.deck2) {
        setSelectedDeckSlotB("deck2");
      } else {
        setSelectedDeckSlotB("deck1");
      }

      setPlayerA("");
      setIsLockedA(false);
    }
  }, [gameLogs, match.teamAId, match.teamBId, lineupA, lineupB]);

  // 🟢 SINKRONISASI DECK TIM A
  useEffect(() => {
    if (!playerA) {
      setDeckA("");
      setSkillA("");
      return;
    }
    const p = lineupA.find((x) => x.playerName === playerA);
    if (!p) return;

    const stats = getPlayerStats(playerA, true);

    if (selectedDeckSlotA === "deck1") {
      setDeckA(p.deck1);
      setSkillA(p.skill1);
    } else {
      setDeckA(p.deck2);
      setSkillA(p.skill2);
    }
  }, [playerA, selectedDeckSlotA, lineupA, gameLogs]);

  // 🟢 SINKRONISASI DECK TIM B
  useEffect(() => {
    if (!playerB) {
      setDeckB("");
      setSkillB("");
      return;
    }
    const p = lineupB.find((x) => x.playerName === playerB);
    if (!p) return;

    const stats = getPlayerStats(playerB, false);

    if (selectedDeckSlotB === "deck1") {
      setDeckB(p.deck1);
      setSkillB(p.skill1);
    } else {
      setDeckB(p.deck2);
      setSkillB(p.skill2);
    }
  }, [playerB, selectedDeckSlotB, lineupB, gameLogs]);

  const handleAddSingleGame = () => {
    if (!playerA || !playerB || !gameResult) return;

    const winnerTeamId = gameResult === "A" ? match.teamAId : match.teamBId;

    // Cek apakah game ini merupakan bawaan Repeat dari game sebelumnya yang terus menang
    const statsA = getPlayerStats(playerA, true);
    const statsB = getPlayerStats(playerB, false);

    const activeIsRepeatA = isRepeatA || (isLockedA && statsA.isLastGameRepeat);
    const activeIsRepeatB = isRepeatB || (isLockedB && statsB.isLastGameRepeat);

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
      isRepeatA: activeIsRepeatA,
      isRepeatB: activeIsRepeatB,
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
        <TeamGameInput
          isTeamA={true}
          teamName={match.teamAName}
          teamLogo={match.teamALogo}
          player={playerA}
          setPlayer={setPlayerA}
          availableOptions={availableOptionsA}
          isLocked={isLockedA}
          activePlayerObj={lineupA.find((p) => p.playerName === playerA)}
          selectedDeckSlot={selectedDeckSlotA}
          setSelectedDeckSlot={setSelectedDeckSlotA}
          skill={skillA}
          repeatCount={repeatCountA}
          isRepeat={isRepeatA || (isLockedA && getPlayerStats(playerA, true).isLastGameRepeat)}
          setIsRepeat={setIsRepeatA}
          canRepeat={canRepeatA}
          deckLostStats={playerA ? getPlayerStats(playerA, true) : undefined}
        />

        <TeamGameInput
          isTeamA={false}
          teamName={match.teamBName}
          teamLogo={match.teamBLogo}
          player={playerB}
          setPlayer={setPlayerB}
          availableOptions={availableOptionsB}
          isLocked={isLockedB}
          activePlayerObj={lineupB.find((p) => p.playerName === playerB)}
          selectedDeckSlot={selectedDeckSlotB}
          setSelectedDeckSlot={setSelectedDeckSlotB}
          skill={skillB}
          repeatCount={repeatCountB}
          isRepeat={isRepeatB || (isLockedB && getPlayerStats(playerB, false).isLastGameRepeat)}
          setIsRepeat={setIsRepeatB}
          canRepeat={canRepeatB}
          deckLostStats={playerB ? getPlayerStats(playerB, false) : undefined}
        />
      </div>

      <WinnerSelector
        match={match}
        gameNumber={gameLogs.length + 1}
        isFormReady={isFormReady}
        gameResult={gameResult}
        setGameResult={setGameResult}
        onSaveGame={handleAddSingleGame}
      />

      <GameLogsTable match={match} gameLogs={gameLogs} setGameLogs={setGameLogs} />
    </section>
  );
    }
                              
