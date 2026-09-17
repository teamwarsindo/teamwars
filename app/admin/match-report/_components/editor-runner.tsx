'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlayerLineupItem } from '../types';
import { EditorRunnerTeamPanel } from './editor-runner-team-panel';
import { RunnerPenaltyBanner } from './runner-penalty-banner';
import { RunnerOutcomeForm } from './runner-outcome-form';

export interface EditorRunnerProps {
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  repeatsA?: number;
  repeatsB?: number;
  games?: any[];
  scoreA?: number;
  scoreB?: number;
  nextGameNumber?: number;
  onAddGame: (gameData: any) => void;
  onRollbackGame?: () => void;
}

export function EditorRunner({
  teamAName,
  teamBName,
  teamALineup = [],
  teamBLineup = [],
  repeatsA = 0,
  repeatsB = 0,
  games = [],
  scoreA = 0,
  scoreB = 0,
  nextGameNumber,
  onAddGame,
  onRollbackGame,
}: EditorRunnerProps) {
  const resolvedNextGameNumber = nextGameNumber ?? games.length + 1;
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

  const [selectedAIgn, setSelectedAIgn] = useState<string>('');
  const [deckAType, setDeckAType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatA, setIsRepeatA] = useState(false);

  const [selectedBIgn, setSelectedBIgn] = useState<string>('');
  const [deckBType, setDeckBType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatB, setIsRepeatB] = useState(false);

  const [gameStatus, setGameStatus] = useState<'normal' | 'deckloss'>('normal');
  const [ssHandA, setSsHandA] = useState(true);
  const [ssHandB, setSsHandB] = useState(true);
  const [notes, setNotes] = useState('');
  const [winner, setWinner] = useState<'teamA' | 'teamB' | null>(null);

  const activeLineupA = useMemo(
    () => teamALineup.filter((p) => p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-'),
    [teamALineup]
  );
  const activeLineupB = useMemo(
    () => teamBLineup.filter((p) => p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-'),
    [teamBLineup]
  );

  // Status Game Terakhir & Riwayat Peringatan SS Hand
  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const isStayA = lastGame?.winner === 'teamA';
  const isStayB = lastGame?.winner === 'teamB';

  const warnCountA = games.filter((g) => g.ssHandA === false).length;
  const warnCountB = games.filter((g) => g.ssHandB === false).length;

  let pendingPenaltyTeam: 'teamA' | 'teamB' | null = null;
  if (warnCountA >= 2 && lastGame?.ssHandA === false) pendingPenaltyTeam = 'teamA';
  else if (warnCountB >= 2 && lastGame?.ssHandB === false) pendingPenaltyTeam = 'teamB';

  const penalizedLineup = pendingPenaltyTeam === 'teamA' ? activeLineupA : activeLineupB;
  const lastPlayerIgn = pendingPenaltyTeam === 'teamA' ? lastGame?.playerA?.ign : lastGame?.playerB?.ign;
  const lastDuelist = penalizedLineup.find((p) => p.ign.toLowerCase() === (lastPlayerIgn || '').toLowerCase());
  const isTargetLocked = Boolean(pendingPenaltyTeam && lastDuelist && (lastDuelist.remainingLife ?? 2) === 1);

  // Otomasi Eksekusi Penalti Deckloss
  useEffect(() => {
    if (pendingPenaltyTeam) {
      setGameStatus('deckloss');
      setWinner(pendingPenaltyTeam === 'teamA' ? 'teamB' : 'teamA');

      if (pendingPenaltyTeam === 'teamA' && isTargetLocked && lastDuelist) {
        setSelectedAIgn(lastDuelist.ign);
        const nextSlot = !lastDuelist.deck1?.isDead ? 'deck1' : 'deck2';
        setDeckAType(nextSlot);
      } else if (pendingPenaltyTeam === 'teamB' && isTargetLocked && lastDuelist) {
        setSelectedBIgn(lastDuelist.ign);
        const nextSlot = !lastDuelist.deck1?.isDead ? 'deck1' : 'deck2';
        setDeckBType(nextSlot);
      }
    }
  }, [pendingPenaltyTeam, isTargetLocked, lastDuelist]);

  // Status Wajib Lanjut (Sisa 1 Nyawa)
  const activeDuelistA = activeLineupA.find((p) => p.ign === selectedAIgn);
  const activeDuelistB = activeLineupB.find((p) => p.ign === selectedBIgn);
  const mustContinueA = !isStayA && Boolean(activeDuelistA && (activeDuelistA.remainingLife ?? 2) === 1);
  const mustContinueB = !isStayB && Boolean(activeDuelistB && (activeDuelistB.remainingLife ?? 2) === 1);

  const currentAIgn = (activeLineupA.find((p) => p.ign === selectedAIgn) || activeLineupA[0])?.ign || '';
  const currentBIgn = (activeLineupB.find((p) => p.ign === selectedBIgn) || activeLineupB[0])?.ign || '';
  const isLineupReady = activeLineupA.length === 5 && activeLineupB.length === 5;

  const handleSubmit = () => {
    if (!winner || !currentAIgn || !currentBIgn) return;

    onAddGame({
      playerAIgn: currentAIgn,
      deckAType,
      isRepeatA,
      playerBIgn: currentBIgn,
      deckBType,
      isRepeatB,
      winner,
      isDeckloss: gameStatus === 'deckloss',
      ssHandA,
      ssHandB,
      notes: notes.trim(),
    });

    setGameStatus('normal');
    setSsHandA(true);
    setSsHandB(true);
    setNotes('');
    setWinner(null);
    setIsRepeatA(false);
    setIsRepeatB(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            INPUT GAME G{resolvedNextGameNumber}
          </h3>
          <span className="text-[11px] font-mono font-bold text-muted-foreground ml-2">
            ({scoreA} - {scoreB})
          </span>
        </div>

        {onRollbackGame && games.length > 0 && (
          <button
            type="button"
            onClick={onRollbackGame}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition cursor-pointer"
          >
            ↩️ Rollback G{games.length}
          </button>
        )}
      </div>

      {!isLineupReady && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>⚠️ Pilih 5 duelist untuk kedua tim sebelum mencatat game!</span>
        </div>
      )}

      <RunnerPenaltyBanner
        pendingPenaltyTeam={pendingPenaltyTeam}
        penalizedTeamName={pendingPenaltyTeam === 'teamA' ? teamAName : teamBName}
        isTargetLocked={isTargetLocked}
        lockedPlayerIgn={lastDuelist?.ign}
      />

      {/* Tab Navigasi Tim (Biru / Merah) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('A')}
          className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === 'A'
              ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {teamAName}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('B')}
          className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === 'B'
              ? 'bg-red-600 text-white shadow-xs border border-red-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {teamBName}
        </button>
      </div>

      {/* Panel Duelist Tim */}
      <EditorRunnerTeamPanel
        teamName={activeTab === 'A' ? teamAName : teamBName}
        lineup={activeTab === 'A' ? activeLineupA : activeLineupB}
        selectedIgn={activeTab === 'A' ? currentAIgn : currentBIgn}
        selectedDeck={activeTab === 'A' ? deckAType : deckBType}
        isRepeat={activeTab === 'A' ? isRepeatA : isRepeatB}
        repeatsUsed={activeTab === 'A' ? repeatsA : repeatsB}
        isStayTable={activeTab === 'A' ? isStayA : isStayB}
        mustContinue={activeTab === 'A' ? mustContinueA : mustContinueB}
        lastWinnerGameNum={games.length}
        onSelectPlayer={(ign, defDeck) => {
          if (activeTab === 'A') {
            setSelectedAIgn(ign);
            setDeckAType(defDeck);
            setIsRepeatA(false);
          } else {
            setSelectedBIgn(ign);
            setDeckBType(defDeck);
            setIsRepeatB(false);
          }
        }}
        onSelectDeck={(slot) => {
          if (activeTab === 'A') {
            setDeckAType(slot);
            setIsRepeatA(false);
          } else {
            setDeckBType(slot);
            setIsRepeatB(false);
          }
        }}
        onTriggerRepeat={(deadDeckSlot) => {
          if (activeTab === 'A') {
            setDeckAType(deadDeckSlot);
            setIsRepeatA(true);
          } else {
            setDeckBType(deadDeckSlot);
            setIsRepeatB(true);
          }
        }}
      />

      <RunnerOutcomeForm
        teamAName={teamAName}
        teamBName={teamBName}
        gameStatus={gameStatus}
        onGameStatusChange={setGameStatus}
        isPenaltyLocked={Boolean(pendingPenaltyTeam)}
        ssHandA={ssHandA}
        onSsHandAChange={setSsHandA}
        ssHandB={ssHandB}
        onSsHandBChange={setSsHandB}
        notes={notes}
        onNotesChange={setNotes}
        winner={winner}
        onWinnerChange={setWinner}
        pendingPenaltyTeam={pendingPenaltyTeam}
        isLineupReady={isLineupReady}
        nextGameNumber={resolvedNextGameNumber}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
