"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog, PlayerDeckInfo, WarningLogItem } from "@/lib/types/tournament";
import { TeamGameInput } from "../team-game-input";
import { WinnerSelector } from "../winner-selector";
import { useMatchTimer } from "../../hooks/use-match-timer";
import { getPlayerStats, extractIgn } from "../../utils/conquest-rules";
import { TOURNAMENT_CONFIG } from "../../constants/tournament";
import Swal from "sweetalert2";

interface Section3GameInputProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  lineupA: PlayerDeckInfo[];
  lineupB: PlayerDeckInfo[];
  isLineupLocked: boolean;
  lateDecksA: number;
  lateDecksB: number;
  warningLogs: WarningLogItem[];
  setWarningLogs: React.Dispatch<React.SetStateAction<WarningLogItem[]>>;
}

export function Section3GameInput({
  match,
  gameLogs,
  setGameLogs,
  lineupA,
  lineupB,
  isLineupLocked,
  lateDecksA,
  lateDecksB,
  warningLogs,
  setWarningLogs,
}: Section3GameInputProps) {
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
  const [isTLA, setIsTLA] = useState(false);
  const [isTLB, setIsTLB] = useState(false);
  const [isLockedA, setIsLockedA] = useState(false);
  const [isLockedB, setIsLockedB] = useState(false);

  // AUTO TL DARI TIMEOUT TIMER
  const executeTLGame = (losingTeam: "A" | "B") => {
    const winnerTeamId = losingTeam === "A" ? match.teamBId : match.teamAId;
    const pA = extractIgn(playerA) || lineupA[0]?.playerName || "Player A";
    const pB = extractIgn(playerB) || lineupB[0]?.playerName || "Player B";

    const pObjA = lineupA.find((x) => x.playerName === pA);
    const pObjB = lineupB.find((x) => x.playerName === pB);

    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      playerAId: pA,
      playerAName: pA,
      deckA: (selectedDeckSlotA === "deck1" ? pObjA?.deck1 : pObjA?.deck2) || "-",
      skillA: (selectedDeckSlotA === "deck1" ? pObjA?.skill1 : pObjA?.skill2) || "-",
      playerBId: pB,
      playerBName: pB,
      deckB: (selectedDeckSlotB === "deck1" ? pObjB?.deck1 : pObjB?.deck2) || "-",
      skillB: (selectedDeckSlotB === "deck1" ? pObjB?.skill1 : pObjB?.skill2) || "-",
      winnerTeamId,
      isTLA: losingTeam === "A",
      isTLB: losingTeam === "B",
    };

    setGameLogs([...gameLogs, newLog]);
  };

  const timerHookA = useMatchTimer({ teamName: match.teamAName, lateDecks: lateDecksA, onExecuteTL: () => executeTLGame("A") });
  const timerHookB = useMatchTimer({ teamName: match.teamBName, lateDecks: lateDecksB, onExecuteTL: () => executeTLGame("B") });

  const currentIgnA = extractIgn(playerA);
  const currentIgnB = extractIgn(playerB);

  const statsA = getPlayerStats(currentIgnA, true, gameLogs, match.teamAId, lineupA);
  const statsB = getPlayerStats(currentIgnB, false, gameLogs, match.teamBId, lineupB);

  const warningCountA = warningLogs.filter((w) => w.teamId === match.teamAId).length;
  const warningCountB = warningLogs.filter((w) => w.teamId === match.teamBId).length;

  const repeatCountA = new Set(gameLogs.filter((g) => g.isRepeatA).map((g) => g.playerAName)).size;
  const repeatCountB = new Set(gameLogs.filter((g) => g.isRepeatB).map((g) => g.playerBName)).size;

  const availableOptionsA = lineupA
    .filter((p) => !getPlayerStats(p.playerName, true, gameLogs, match.teamAId, lineupA).isEliminated)
    .map((p) => (p.duellinksId && p.duellinksId !== "-" ? `${p.playerName} (${p.duellinksId})` : p.playerName));

  const availableOptionsB = lineupB
    .filter((p) => !getPlayerStats(p.playerName, false, gameLogs, match.teamBId, lineupB).isEliminated)
    .map((p) => (p.duellinksId && p.duellinksId !== "-" ? `${p.playerName} (${p.duellinksId})` : p.playerName));

  // AUTO SINKRONISASI LOCK PEMAIN PEMENANG
  useEffect(() => {
    if (!gameLogs || gameLogs.length === 0) {
      setIsLockedA(false);
      setIsLockedB(false);
      return;
    }

    // Ambil game riil terakhir (mengabaikan game Auto-TL)
    const realLogs = gameLogs.filter((g) => !g.isTLA && !g.isTLB && g.playerAName !== "-");
    if (realLogs.length === 0) return;

    const lastGame = realLogs[realLogs.length - 1];

    if (lastGame.winnerTeamId === match.teamAId) {
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      if (pA) {
        setPlayerA(pA.duellinksId && pA.duellinksId !== "-" ? `${pA.playerName} (${pA.duellinksId})` : lastGame.playerAName);
        setIsLockedA(true);
      }
    } else {
      const pA = lineupA.find((x) => x.playerName === lastGame.playerAName);
      if (pA && !statsA.isEliminated) {
        setPlayerA(pA.duellinksId && pA.duellinksId !== "-" ? `${pA.playerName} (${pA.duellinksId})` : lastGame.playerAName);
        setIsLockedA(true);
      } else {
        setPlayerA("");
        setIsLockedA(false);
      }
    }

    if (lastGame.winnerTeamId === match.teamBId) {
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      if (pB) {
        setPlayerB(pB.duellinksId && pB.duellinksId !== "-" ? `${pB.playerName} (${pB.duellinksId})` : lastGame.playerBName);
        setIsLockedB(true);
      }
    } else {
      const pB = lineupB.find((x) => x.playerName === lastGame.playerBName);
      if (pB && !statsB.isEliminated) {
        setPlayerB(pB.duellinksId && pB.duellinksId !== "-" ? `${pB.playerName} (${pB.duellinksId})` : lastGame.playerBName);
        setIsLockedB(true);
      } else {
        setPlayerB("");
        setIsLockedB(false);
      }
    }
  }, [gameLogs, match.teamAId, match.teamBId, lineupA, lineupB]);

  // BINDING DECK PER PEMAIN
  useEffect(() => {
    if (!currentIgnA) { setDeckA(""); setSkillA(""); return; }
    const p = lineupA.find((x) => x.playerName === currentIgnA);
    if (!p) return;
    setDeckA(selectedDeckSlotA === "deck1" ? p.deck1 : p.deck2);
    setSkillA(selectedDeckSlotA === "deck1" ? p.skill1 : p.skill2);
  }, [playerA, currentIgnA, selectedDeckSlotA, lineupA]);

  useEffect(() => {
    if (!currentIgnB) { setDeckB(""); setSkillB(""); return; }
    const p = lineupB.find((x) => x.playerName === currentIgnB);
    if (!p) return;
    setDeckB(selectedDeckSlotB === "deck1" ? p.deck1 : p.deck2);
    setSkillB(selectedDeckSlotB === "deck1" ? p.skill2 : p.skill2);
  }, [playerB, currentIgnB, selectedDeckSlotB, lineupB]);

  const handleAddSingleGame = async () => {
    if (!currentIgnA || !currentIgnB || !gameResult || !isLineupLocked) return;

    // POP-UP SS KONFIRMASI (Hanya dipicu jika game sebelumnya adalah game riil)
    const realLogs = gameLogs.filter((g) => !g.isTLA && !g.isTLB && g.playerAName !== "-");
    if (realLogs.length > 0) {
      const prevRealGame = realLogs[realLogs.length - 1];
      const { value: formValues } = await Swal.fire({
        title: `Konfirmasi SS Game #${prevRealGame.gameNumber}`,
        html: `
          <div class="space-y-2 text-left text-xs font-bold">
            <label class="flex items-center gap-2 p-2 bg-muted/30 rounded border border-border cursor-pointer">
              <input type="checkbox" id="ss-a" checked class="h-4 w-4 rounded accent-purple-600" />
              <span>${match.teamAName} Mengumpulkan SS</span>
            </label>
            <label class="flex items-center gap-2 p-2 bg-muted/30 rounded border border-border cursor-pointer">
              <input type="checkbox" id="ss-b" checked class="h-4 w-4 rounded accent-purple-600" />
              <span>${match.teamBName} Mengumpulkan SS</span>
            </label>
          </div>`,
        showCancelButton: true,
        confirmButtonText: "Simpan Game",
        confirmButtonColor: "#9333ea",
        preConfirm: () => ({
          ssA: (document.getElementById("ss-a") as HTMLInputElement)?.checked,
          ssB: (document.getElementById("ss-b") as HTMLInputElement)?.checked,
        }),
      });

      if (!formValues) return;

      const newWarningLogs = [...warningLogs];
      if (!formValues.ssA) {
        const nextW = warningCountA + 1;
        newWarningLogs.push({
          gameNumber: prevRealGame.gameNumber,
          teamId: match.teamAId,
          teamName: match.teamAName,
          warningNumber: nextW,
          isTechnicalLossTriggered: nextW % TOURNAMENT_CONFIG.WARNINGS_FOR_TL === 0,
        });
      }
      if (!formValues.ssB) {
        const nextW = warningCountB + 1;
        newWarningLogs.push({
          gameNumber: prevRealGame.gameNumber,
          teamId: match.teamBId,
          teamName: match.teamBName,
          warningNumber: nextW,
          isTechnicalLossTriggered: nextW % TOURNAMENT_CONFIG.WARNINGS_FOR_TL === 0,
        });
      }
      setWarningLogs(newWarningLogs);
    }

    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      playerAId: currentIgnA,
      playerAName: currentIgnA,
      deckA: deckA || "-",
      skillA: skillA || "-",
      playerBId: currentIgnB,
      playerBName: currentIgnB,
      deckB: deckB || "-",
      skillB: skillB || "-",
      winnerTeamId: gameResult === "A" ? match.teamAId : match.teamBId,
      isRepeatA: isRepeatA || (isLockedA && statsA.isLastGameRepeat),
      isRepeatB: isRepeatB || (isLockedB && statsB.isLastGameRepeat),
      isTLA,
      isTLB,
    };

    setGameLogs([...gameLogs, newLog]);
    setGameResult("");
    setIsRepeatA(false);
    setIsRepeatB(false);
    setIsTLA(false);
    setIsTLB(false);
  };

  return (
    <section className={`glass glow-border rounded-2xl border p-5 shadow-sm space-y-5 transition-all ${!isLineupLocked ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
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
          isLineupLocked={isLineupLocked}
          activePlayerObj={lineupA.find((p) => p.playerName === currentIgnA)}
          selectedDeckSlot={selectedDeckSlotA}
          setSelectedDeckSlot={setSelectedDeckSlotA}
          repeatCount={repeatCountA}
          isRepeat={isRepeatA || (isLockedA && statsA.isLastGameRepeat)}
          setIsRepeat={setIsRepeatA}
          canRepeat={statsA.losses === 1 && statsA.wins === 0 && statsA.totalGames === 1 && !statsA.hasActivatedRepeat && repeatCountA < TOURNAMENT_CONFIG.MAX_REPEAT_PER_TEAM}
          deckLostStats={currentIgnA ? statsA : undefined}
          warningCount={warningCountA}
          isTechnicalLoss={isTLA}
          setIsTechnicalLoss={setIsTLA}
          timerSeconds={timerHookA.timer}
          isTimerRunning={timerHookA.isRunning}
          onToggleTimer={timerHookA.toggleTimer}
          onResetTimer={timerHookA.resetTimer}
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
          repeatCount={repeatCountB}
          isRepeat={isRepeatB || (isLockedB && statsB.isLastGameRepeat)}
          setIsRepeat={setIsRepeatB}
          canRepeat={statsB.losses === 1 && statsB.wins === 0 && statsB.totalGames === 1 && !statsB.hasActivatedRepeat && repeatCountB < TOURNAMENT_CONFIG.MAX_REPEAT_PER_TEAM}
          deckLostStats={currentIgnB ? statsB : undefined}
          warningCount={warningCountB}
          isTechnicalLoss={isTLB}
          setIsTechnicalLoss={setIsTLB}
          timerSeconds={timerHookB.timer}
          isTimerRunning={timerHookB.isRunning}
          onToggleTimer={timerHookB.toggleTimer}
          onResetTimer={timerHookB.resetTimer}
        />
      </div>

      <WinnerSelector
        match={match}
        gameNumber={gameLogs.length + 1}
        isFormReady={Boolean(isLineupLocked && currentIgnA && currentIgnB && deckA && deckB)}
        gameResult={gameResult}
        setGameResult={setGameResult}
        onSaveGame={handleAddSingleGame}
      />
    </section>
  );
}