"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { MatchReportHeader } from "./match-report/match-report-header";
import { MatchReportMatchup } from "./match-report/match-report-matchup";
import { MatchReportTable } from "./match-report/match-report-table";

export function MatchReportModal({
  match,
  weekNumber,
  onClose,
  onSaveMatch,
}: {
  match: MatchScheduleItem;
  weekNumber: number;
  onClose: () => void;
  onSaveMatch?: (updatedMatch: MatchScheduleItem) => Promise<void>;
}) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>(match.gameLogs || []);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("admin") === "tsaqif") {
        setIsAdminMode(true);
      }
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    setGameLogs(match.gameLogs || []);
  }, [match.gameLogs]);

  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];
  const playerNamesA = rosterA.map((p) => p.playerName);
  const playerNamesB = rosterB.map((p) => p.playerName);

  const calculatedScoreA = gameLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
  const calculatedScoreB = gameLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

  const displayScoreA = gameLogs.length > 0 ? calculatedScoreA : match.scoreA;
  const displayScoreB = gameLogs.length > 0 ? calculatedScoreB : match.scoreB;

  const isWinA = displayScoreA > displayScoreB;
  const isWinB = displayScoreB > displayScoreA;

  const handleAddLogRow = () => {
    const defaultPlayerA = playerNamesA[0] || "Player A";
    const defaultPlayerB = playerNamesB[0] || "Player B";

    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      teamAPlayerId: defaultPlayerA,
      teamAPlayerName: defaultPlayerA,
      teamADeck: "Archetype A",
      teamASkill: "Skill A",
      teamBPlayerId: defaultPlayerB,
      teamBPlayerName: defaultPlayerB,
      teamBDeck: "Archetype B",
      teamBSkill: "Skill B",
      winnerTeamId: match.teamAId,
    };

    const newLogs = [...gameLogs, newLog];
    setGameLogs(newLogs);
    setEditingRowIndex(newLogs.length - 1);
  };

  const handleUpdateLogField = (index: number, field: keyof GameDetailLog, value: any) => {
    const updated = [...gameLogs];
    updated[index] = { ...updated[index], [field]: value };
    setGameLogs(updated);
  };

  const handleToggleWinner = (index: number, winnerTeamId: string) => {
    const updated = [...gameLogs];
    updated[index].winnerTeamId = winnerTeamId;
    setGameLogs(updated);
  };

  const saveLogsToKV = async (currentLogs: GameDetailLog[]) => {
    if (!onSaveMatch) return;
    setIsSaving(true);

    const newScoreA = currentLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
    const newScoreB = currentLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

    const updatedMatch: MatchScheduleItem = {
      ...match,
      scoreA: newScoreA,
      scoreB: newScoreB,
      isFinished: newScoreA >= 10 || newScoreB >= 10,
      gameLogs: currentLogs,
    };

    await onSaveMatch(updatedMatch);
    setIsSaving(false);
  };

  const handleRemoveLogRow = async (index: number) => {
    const updatedLogs = gameLogs.filter((_, i) => i !== index);
    setGameLogs(updatedLogs);
    if (editingRowIndex === index) setEditingRowIndex(null);
    await saveLogsToKV(updatedLogs);
  };

  const handleSaveRow = async () => {
    setEditingRowIndex(null);
    await saveLogsToKV(gameLogs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl border-2 border-[#0099ff] bg-[#0051a8] p-3 sm:p-5 text-white shadow-[0_0_50px_rgba(0,153,255,0.4)] overflow-y-auto max-h-[95vh] font-sans">
        {/* Header */}
        <MatchReportHeader match={match} weekNumber={weekNumber} onClose={onClose} />

        {/* Title */}
        <h2 className="my-2 text-center text-lg sm:text-2xl font-black tracking-widest text-[#ff9900] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          MATCH REPORT {isSaving && <span className="text-xs text-emerald-400 font-bold ml-2 animate-pulse">(Saving...)</span>}
        </h2>

        {/* Matchup Header & Roster */}
        <MatchReportMatchup match={match} />

        {/* Game Logs Table */}
        <MatchReportTable
          match={match}
          gameLogs={gameLogs}
          isAdminMode={isAdminMode}
          editingRowIndex={editingRowIndex}
          isSaving={isSaving}
          setEditingRowIndex={setEditingRowIndex}
          onAddLogRow={handleAddLogRow}
          onUpdateLogField={handleUpdateLogField}
          onToggleWinner={handleToggleWinner}
          onRemoveLogRow={handleRemoveLogRow}
          onSaveRow={handleSaveRow}
        />

        {/* FOOTER HASIL SKOR AKHIR */}
        <div className="mt-3 grid grid-cols-12 items-center rounded-xl border border-sky-400/40 bg-[#00336e] p-2 sm:p-3 text-center">
          <div className="col-span-2 text-2xl sm:text-4xl font-black text-[#00ff66]">
            {isWinA ? "W" : "L"}
          </div>

          <div className="col-span-8 flex items-center justify-center gap-2 sm:gap-4 text-[#ff9900]">
            <span className="text-xs sm:text-lg font-black text-white truncate max-w-[120px] sm:max-w-none">
              {match.teamAName}
            </span>
            <span className="text-xl sm:text-3xl font-black shrink-0">
              {displayScoreA} - {displayScoreB}
            </span>
            <span className="text-xs sm:text-lg font-black text-white truncate max-w-[120px] sm:max-w-none">
              {match.teamBName}
            </span>
          </div>

          <div className="col-span-2 text-2xl sm:text-4xl font-black text-[#ff3333]">
            {isWinB ? "W" : "L"}
          </div>
        </div>

      </div>
    </div>
  );
    }
      
