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
  isLineupLocked: boolean;
}

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  lineupA,
  lineupB,
  isLineupLocked,
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

  // Kuota Repeat
  const repeatCountA = new Set(
    gameLogs.filter((g) => (g as any).isRepeatA).map((g) => g.playerAName)
  ).size;

  const repeatCountB = new Set(
    gameLogs.filter((g) => (g as any).isRepeatB).map((g) => g.playerBName)
  ).size;

  // 🟢 LOGIKA EVALUASI PEMAIN PERSIS PER IGN
  const getPlayerStats = (playerName: string, isTeamA: boolean) => {
    if (!gameLogs || gameLogs.length === 0 || !playerName) {
      return {
        wins: 0,
        losses: 0,
        deck1Lost: false,
        deck2Lost: false,
        hasActivatedRepeat: false,
        isDeck1Repeated: false,
        isEliminated: false,
        totalGames: 0,
        lastDeckUsed: null as string | null,
      };
    }

    const pLogs = gameLogs.filter((g) => (isTeamA ? g.playerAName : g.playerBName) === playerName);
    const wins = pLogs.filter((g) => g.winnerTeamId === (isTeamA ? match.teamAId : match.teamBId)).length;
    const losses = pLogs.filter((g) => g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)).length;

    const pObj = (isTeamA ? lineupA : lineupB).find((x) => x.playerName === playerName);
    const hasActivatedRepeat = pLogs.some((g) => (isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB));

    const lastGameOfPlayer = pLogs[pLogs.length - 1];
    const lastDeckUsed = lastGameOfPlayer ? (isTeamA ? lastGameOfPlayer.deckA : lastGameOfPlayer.deckB) : null;

    const isLastGameRepeat = lastGameOfPlayer
      ? isTeamA
        ? (lastGameOfPlayer as any).isRepeatA
        : (lastGameOfPlayer as any).isRepeatB
      : false;

    // Deck 1 dianggap kalah jika pemain pernah kalah memakai Deck 1 (tanpa Repeat)
    const deck1Lost = pLogs.some(
      (g) =>
        (isTeamA ? g.deckA : g.deckB) === pObj?.deck1 &&
        g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId) &&
        !(isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB)
    );

    // Deck 2 dianggap kalah jika pemain pernah kalah memakai Deck 2
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
      isLastGameRepeat,
      isEliminated,
      totalGames: pLogs.length,
      lastDeckUsed,
    };
  };

  const availableOptionsA = lineupA
    .filter((p) => !getPlayerStats(p.playerName, true).isEliminated)
    .map((p) => {
      const dlText = p.duellinksId && p.duellinksId !== "-" ? ` (${p.duellinksId})` : "";
      return `${p.playerName}${dlText}`;
    });

  const availableOptionsB = lineupB
    .filter((p) => !getPlayerStats(p.playerName, false).isEliminated)
    .map((p) => {
      const dlText = p.duellinksId && p.duellinksId !== "-" ? ` (${p.duellinksId})` : "";
      return `${p.playerName}${dlText}`;
    });

  const extractIgn = (fullString: string) => fullString.replace(/\s*\([^)]*\)/g, "").trim();

  const currentIgnA = extractIgn(playerA);
  const currentIgnB = extractIgn(playerB);

  const canRepeatA = (() => {
    if (!currentIgnA || repeatCountA >= 2) return false;
    const stats = getPlayerStats(currentIgnA, true);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1 && !stats.hasActivatedRepeat;
  })();

  const canRepeatB = (() => {
    if (!currentIgnB || repeatCountB >= 2) return false;
    const stats = getPlayerStats(currentIgnB, false);
    return stats.losses === 1 && stats.wins === 0 && stats.totalGames === 1 && !stats.hasActivatedRepeat;
  })();

  // 🟢 PERBAIKAN LOGIKA TRANSIKSI PEMAIN & DECK TERAKHIR
  useEffect(() => {
    if (!gameLogs || gameLogs.length === 0) {
      setIsLockedA(false);
      setIsLockedB(false);
      return;
    }
    const lastGame = gameLogs[gameLogs.length - 1];

    // --- TIM A ---
    if (lastGame.winnerTeamId === match.teamAId) {
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      const dlText = pA?.duellinksId && pA.duellinksId !== "-" ? ` (${pA.duellinksId})` : "";
      setPlayerA(`${lastGame.playerAName}${dlText}`);
      setIsLockedA(true);

      const statsA = getPlayerStats(lastGame.playerAName, true);
      if (statsA.isLastGameRepeat || (lastGame as any).isRepeatA) {
        setSelectedDeckSlotA("deck1");
      } else if (pA && lastGame.deckA === pA.deck2) {
        setSelectedDeckSlotA("deck2");
      } else {
        setSelectedDeckSlotA("deck1");
      }
    } else {
      const statsA = getPlayerStats(lastGame.playerAName, true);
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);

      if (pA && !statsA.isEliminated) {
        const dlText = pA.duellinksId && pA.duellinksId !== "-" ? ` (${pA.duellinksId})` : "";
        setPlayerA(`${lastGame.playerAName}${dlText}`);
        setIsLockedA(true);

        // Jika dia kalah di Deck 1 -> Pindah ke Deck 2
        if (statsA.deck1Lost) {
          setSelectedDeckSlotA("deck2");
        }
      } else {
        setPlayerA("");
        setIsLockedA(false);
        setSelectedDeckSlotA("deck1");
      }
    }

    // --- TIM B ---
    if (lastGame.winnerTeamId === match.teamBId) {
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      const dlText = pB?.duellinksId && pB.duellinksId !== "-" ? ` (${pB.duellinksId})` : "";
      setPlayerB(`${lastGame.playerBName}${dlText}`);
      setIsLockedB(true);

      const statsB = getPlayerStats(lastGame.playerBName, false);
      if (statsB.isLastGameRepeat || (lastGame as any).isRepeatB) {
        setSelectedDeckSlotB("deck1");
      } else if (pB && lastGame.deckB === pB.deck2) {
        setSelectedDeckSlotB("deck2");
      } else {
        setSelectedDeckSlotB("deck1");
      }
    } else {
      const statsB = getPlayerStats(lastGame.playerBName, false);
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);

      if (pB && !statsB.isEliminated) {
        const dlText = pB.duellinksId && pB.duellinksId !== "-" ? ` (${pB.duellinksId})` : "";
        setPlayerB(`${lastGame.playerBName}${dlText}`);
        setIsLockedB(true);

        // Jika dia kalah di Deck 1 -> Pindah ke Deck 2
        if (statsB.deck1Lost) {
          setSelectedDeckSlotB("deck2");
        }
      } else {
        setPlayerB("");
        setIsLockedB(false);
        setSelectedDeckSlotB("deck1");
      }
    }
  }, [gameLogs, match.teamAId, match.teamBId, lineupA, lineupB]);

  // SINKRONISASI BINDING DECK A
  useEffect(() => {
    if (!currentIgnA) {
      setDeckA("");
      setSkillA("");
      return;
    }
    const p = lineupA.find((x) => x.playerName === currentIgnA);
    if (!p) return;

    const stats = getPlayerStats(currentIgnA, true);

    if (stats.totalGames === 0) {
      setSelectedDeckSlotA("deck1");
    } else if (isRepeatA || stats.isLastGameRepeat) {
      setSelectedDeckSlotA("deck1");
    } else if (stats.deck1Lost) {
      setSelectedDeckSlotA("deck2");
    }

    if (selectedDeckSlotA === "deck1") {
      setDeckA(p.deck1);
      setSkillA(p.skill1);
    } else {
      setDeckA(p.deck2);
      setSkillA(p.skill2);
    }
  }, [playerA, currentIgnA, selectedDeckSlotA, lineupA, gameLogs, isRepeatA]);

  // SINKRONISASI BINDING DECK B
  useEffect(() => {
    if (!currentIgnB) {
      setDeckB("");
      setSkillB("");
      return;
    }
    const p = lineupB.find((x) => x.playerName === currentIgnB);
    if (!p) return;

    const stats = getPlayerStats(currentIgnB, false);

    if (stats.totalGames === 0) {
      setSelectedDeckSlotB("deck1");
    } else if (isRepeatB || stats.isLastGameRepeat) {
      setSelectedDeckSlotB("deck1");
    } else if (stats.deck1Lost) {
      setSelectedDeckSlotB("deck2");
    }

    if (selectedDeckSlotB === "deck1") {
      setDeckB(p.deck1);
      setSkillB(p.skill1);
    } else {
      setDeckB(p.deck2);
      setSkillB(p.skill2);
    }
  }, [playerB, currentIgnB, selectedDeckSlotB, lineupB, gameLogs, isRepeatB]);

  const handleAddSingleGame = () => {
    if (!currentIgnA || !currentIgnB || !gameResult || !isLineupLocked) return;

    const winnerTeamId = gameResult === "A" ? match.teamAId : match.teamBId;

    const statsA = getPlayerStats(currentIgnA, true);
    const statsB = getPlayerStats(currentIgnB, false);

    const activeIsRepeatA = isRepeatA || (isLockedA && statsA.isLastGameRepeat);
    const activeIsRepeatB = isRepeatB || (isLockedB && statsB.isLastGameRepeat);

    const newLog: GameDetailLog & { isRepeatA?: boolean; isRepeatB?: boolean } = {
      gameNumber: gameLogs.length + 1,
      playerAId: currentIgnA,
      playerAName: currentIgnA,
      deckA: deckA || "-",
      skillA: skillA || "-",
      playerBId: currentIgnB,
      playerBName: currentIgnB,
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

  const isFormReady = Boolean(isLineupLocked && currentIgnA && currentIgnB && deckA && deckB);

  return (
    <section
      className={`glass glow-border rounded-2xl border p-5 shadow-sm space-y-5 transition-all ${
        !isLineupLocked ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            3. Form Input Log Game #{gameLogs.length + 1}
          </h3>
        </div>
        {!isLineupLocked && (
          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            🔒 Kunci Lineup Dulu di Section 2
          </span>
        )}
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
          isLineupLocked={isLineupLocked}
          activePlayerObj={lineupA.find((p) => p.playerName === currentIgnA)}
          selectedDeckSlot={selectedDeckSlotA}
          setSelectedDeckSlot={setSelectedDeckSlotA}
          skill={skillA}
          repeatCount={repeatCountA}
          isRepeat={isRepeatA || (isLockedA && getPlayerStats(currentIgnA, true).isLastGameRepeat)}
          setIsRepeat={setIsRepeatA}
          canRepeat={canRepeatA}
          deckLostStats={currentIgnA ? getPlayerStats(currentIgnA, true) : undefined}
        />

        <TeamGameInput
          isTeamA={false}
          teamName={match.teamBName}
          teamLogo={match.teamBLogo}
          player={playerB}
          setPlayer={setPlayerB}
          availableOptions={availableOptionsB}
          isLocked={isLockedB}
          isLineupLocked={isLineupLocked}
          activePlayerObj={lineupB.find((p) => p.playerName === currentIgnB)}
          selectedDeckSlot={selectedDeckSlotB}
          setSelectedDeckSlot={setSelectedDeckSlotB}
          skill={skillB}
          repeatCount={repeatCountB}
          isRepeat={isRepeatB || (isLockedB && getPlayerStats(currentIgnB, false).isLastGameRepeat)}
          setIsRepeat={setIsRepeatB}
          canRepeat={canRepeatB}
          deckLostStats={currentIgnB ? getPlayerStats(currentIgnB, false) : undefined}
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