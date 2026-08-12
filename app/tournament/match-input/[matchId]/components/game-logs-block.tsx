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

  // 🟢 FIX A: KUOTA REPEAT DIHITUNG BERDASARKAN JUMLAH PEMAIN UNIK YANG REPEAT (MAKSIMAL 2 PEMAIN UNIK)
  const repeatCountA = new Set(
    gameLogs.filter((g) => (g as any).isRepeatA).map((g) => g.playerAName)
  ).size;

  const repeatCountB = new Set(
    gameLogs.filter((g) => (g as any).isRepeatB).map((g) => g.playerBName)
  ).size;

  const getPlayerStats = (playerName: string, isTeamA: boolean) => {
    if (!gameLogs || gameLogs.length === 0) {
      return {
        wins: 0,
        losses: 0,
        deck1Lost: false,
        deck2Lost: false,
        hasActivatedRepeat: false,
        isDeck1Repeated: false,
        isEliminated: false,
        totalGames: 0,
      };
    }

    const pLogs = gameLogs.filter((g) => (isTeamA ? g.playerAName : g.playerBName) === playerName);
    const wins = pLogs.filter((g) => g.winnerTeamId === (isTeamA ? match.teamAId : match.teamBId)).length;
    const losses = pLogs.filter((g) => g.winnerTeamId !== (isTeamA ? match.teamAId : match.teamBId)).length;

    const pObj = (isTeamA ? lineupA : lineupB).find((x) => x.playerName === playerName);
    const hasActivatedRepeat = pLogs.some((g) => (isTeamA ? (g as any).isRepeatA : (g as any).isRepeatB));

    const lastGameOfPlayer = pLogs[pLogs.length - 1];
    const isLastGameRepeat = lastGameOfPlayer
      ? isTeamA
        ? (lastGameOfPlayer as any).isRepeatA
        : (lastGameOfPlayer as any).isRepeatB
      : false;

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
      isLastGameRepeat,
      isEliminated,
      totalGames: pLogs.length,
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

  // 🟢 AUTO LOCK WINNER DAN KUNCI SLOT DECK AKTIF
  useEffect(() => {
    if (!gameLogs || gameLogs.length === 0) {
      setIsLockedA(false);
      setIsLockedB(false);
      return;
    }
    const lastGame = gameLogs[gameLogs.length - 1];

    // PEMAIN TIM A
    if (lastGame.winnerTeamId === match.teamAId) {
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      const dlText = pA?.duellinksId && pA.duellinksId !== "-" ? ` (${pA.duellinksId})` : "";
      setPlayerA(`${lastGame.playerAName}${dlText}`);
      setIsLockedA(true);

      const statsA = getPlayerStats(lastGame.playerAName, true);
      // 🟢 FIX B: Jika dia sedang bertanding mode Repeat -> Wajib TAHAN DI DECK 1
      if (statsA.isLastGameRepeat || (lastGame as any).isRepeatA) {
        setSelectedDeckSlotA("deck1");
      } else if (pA && lastGame.deckA === pA.deck2) {
        setSelectedDeckSlotA("deck2");
      } else {
        setSelectedDeckSlotA("deck1");
      }
    } else {
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      const statsA = getPlayerStats(lastGame.playerAName, true);

      if (pA && !statsA.isEliminated) {
        const dlText = pA.duellinksId && pA.duellinksId !== "-" ? ` (${pA.duellinksId})` : "";
        setPlayerA(`${lastGame.playerAName}${dlText}`);
        setIsLockedA(true);
        setSelectedDeckSlotA("deck2");
      } else {
        setPlayerA("");
        setIsLockedA(false);
      }
    }

    // PEMAIN TIM B
    if (lastGame.winnerTeamId === match.teamBId) {
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      const dlText = pB?.duellinksId && pB.duellinksId !== "-" ? ` (${pB.duellinksId})` : "";
      setPlayerB(`${lastGame.playerBName}${dlText}`);
      setIsLockedB(true);

      const statsB = getPlayerStats(lastGame.playerBName, false);
      // 🟢 FIX B: Jika dia sedang bertanding mode Repeat -> Wajib TAHAN DI DECK 1
      if (statsB.isLastGameRepeat || (lastGame as any).isRepeatB) {
        setSelectedDeckSlotB("deck1");
      } else if (pB && lastGame.deckB === pB.deck2) {
        setSelectedDeckSlotB("deck2");
      } else {
        setSelectedDeckSlotB("deck1");
      }
    } else {
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      const statsB = getPlayerStats(lastGame.playerBName, false);

      if (pB && !statsB.isEliminated) {
        const dlText = pB.duellinksId && pB.duellinksId !== "-" ? ` (${pB.duellinksId})` : "";
        setPlayerB(`${lastGame.playerBName}${dlText}`);
        setIsLockedB(true);
        setSelectedDeckSlotB("deck2");
      } else {
        setPlayerB("");
        setIsLockedB(false);
      }
    }
  }, [gameLogs, match.teamAId, match.teamBId, lineupA, lineupB]);

  // SINKRONISASI SELEKSI DECK A
  useEffect(() => {
    if (!currentIgnA) {
      setDeckA("");
      setSkillA("");
      return;
    }
    const p = lineupA.find((x) => x.playerName === currentIgnA);
    if (!p) return;

    const stats = getPlayerStats(currentIgnA, true);

    // 🟢 FIX C: Jika Repeat aktif atau pernah repeat & terus menang -> Paksa Deck 1 terus!
    if (isRepeatA || stats.isLastGameRepeat) {
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

  // SINKRONISASI SELEKSI DECK B
  useEffect(() => {
    if (!currentIgnB) {
      setDeckB("");
      setSkillB("");
      return;
    }
    const p = lineupB.find((x) => x.playerName === currentIgnB);
    if (!p) return;

    const stats = getPlayerStats(currentIgnB, false);

    // 🟢 FIX C: Jika Repeat aktif atau pernah repeat & terus menang -> Paksa Deck 1 terus!
    if (isRepeatB || stats.isLastGameRepeat) {
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