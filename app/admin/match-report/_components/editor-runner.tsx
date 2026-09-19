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

  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const isStayA = lastGame?.winner === 'teamA';
  const isStayB = lastGame?.winner === 'teamB';

  const lastDecklossIdxA = games
    .map((g, idx) => (g.lossCondition === 'PENALTY_2' || (g.isDeckloss && g.winner === 'teamB') ? idx : -1))
    .filter((i) => i !== -1)
    .pop() ?? -1;
  const lastDecklossIdxB = games
    .map((g, idx) => (g.lossCondition === 'PENALTY_2' || (g.isDeckloss && g.winner === 'teamA') ? idx : -1))
    .filter((i) => i !== -1)
    .pop() ?? -1;

  const warnGamesA = games.slice(lastDecklossIdxA + 1).filter((g) => g.ssHandA === false);
  const warnGamesB = games.slice(lastDecklossIdxB + 1).filter((g) => g.ssHandB === false);

  let pendingPenaltyTeam: 'teamA' | 'teamB' | null = null;
  let warnDetails: string[] = [];

  if (warnGamesA.length >= 2) {
    pendingPenaltyTeam = 'teamA';
    warnDetails = warnGamesA.map((g) => `G${g.gameNumber} (${g.playerA?.ign || 'Unknown'})`);
  } else if (warnGamesB.length >= 2) {
    pendingPenaltyTeam = 'teamB';
    warnDetails = warnGamesB.map((g) => `G${g.gameNumber} (${g.playerB?.ign || 'Unknown'})`);
  }

  const lastPlayerA = lastGame
    ? activeLineupA.find((p) => p.ign.toLowerCase() === (lastGame.playerA?.ign || '').toLowerCase())
    : null;
  const lastPlayerB = lastGame
    ? activeLineupB.find((p) => p.ign.toLowerCase() === (lastGame.playerB?.ign || '').toLowerCase())
    : null;

  const mustContinueA = !isStayA && Boolean(lastPlayerA && (lastPlayerA.remainingLife ?? 2) === 1);
  const mustContinueB = !isStayB && Boolean(lastPlayerB && (lastPlayerB.remainingLife ?? 2) === 1);

  // Kunci otomatis alur Stay Table & Next Deck
  useEffect(() => {
    // Tim A
    if (isStayA && lastPlayerA && lastGame) {
      setSelectedAIgn(lastPlayerA.ign);
      const isD1 = lastPlayerA.deck1?.archetype?.toLowerCase() === lastGame.playerA?.archetype?.toLowerCase();
      setDeckAType(isD1 ? 'deck1' : 'deck2');
      setIsRepeatA(false); // Game kemenangan berikutnya bukan aktivasi repeat baru
    } else if (mustContinueA && lastPlayerA) {
      setSelectedAIgn(lastPlayerA.ign);
      setDeckAType(!lastPlayerA.deck1?.isDead ? 'deck1' : 'deck2');
      setIsRepeatA(false);
    } else {
      setSelectedAIgn('');
      setIsRepeatA(false);
    }

    // Tim B
    if (isStayB && lastPlayerB && lastGame) {
      setSelectedBIgn(lastPlayerB.ign);
      const isD1 = lastPlayerB.deck1?.archetype?.toLowerCase() === lastGame.playerB?.archetype?.toLowerCase();
      setDeckBType(isD1 ? 'deck1' : 'deck2');
      setIsRepeatB(false); // Game kemenangan berikutnya bukan aktivasi repeat baru
    } else if (mustContinueB && lastPlayerB) {
      setSelectedBIgn(lastPlayerB.ign);
      setDeckBType(!lastPlayerB.deck1?.isDead ? 'deck1' : 'deck2');
      setIsRepeatB(false);
    } else {
      setSelectedBIgn('');
      setIsRepeatB(false);
    }

    // Arahkan fokus tab otomatis ke tim yang kalah
    if (lastGame?.winner) {
      setActiveTab(lastGame.winner === 'teamA' ? 'B' : 'A');
    }
  }, [games.length, isStayA, isStayB, mustContinueA, mustContinueB]);

  const penalizedLastPlayer = pendingPenaltyTeam === 'teamA' ? lastPlayerA : lastPlayerB;
  const isTargetLocked = Boolean(
    pendingPenaltyTeam && penalizedLastPlayer && (penalizedLastPlayer.remainingLife ?? 2) === 1
  );

  useEffect(() => {
    if (pendingPenaltyTeam) {
      setGameStatus('deckloss');
      setWinner(pendingPenaltyTeam === 'teamA' ? 'teamB' : 'teamA');

      const teamLabel = pendingPenaltyTeam === 'teamA' ? teamAName : teamBName;
      setNotes(`Penalti Deckloss (${teamLabel}): Akumulasi 2x Lupa SS Hand [${warnDetails.join(', ')}]`);

      if (pendingPenaltyTeam === 'teamA' && isTargetLocked && penalizedLastPlayer) {
        setSelectedAIgn(penalizedLastPlayer.ign);
        setDeckAType(!penalizedLastPlayer.deck1?.isDead ? 'deck1' : 'deck2');
      } else if (pendingPenaltyTeam === 'teamB' && isTargetLocked && penalizedLastPlayer) {
        setSelectedBIgn(penalizedLastPlayer.ign);
        setDeckBType(!penalizedLastPlayer.deck1?.isDead ? 'deck1' : 'deck2');
      }
    }
  }, [pendingPenaltyTeam, isTargetLocked]);

  const isLineupReady = activeLineupA.length === 5 && activeLineupB.length === 5;

  const handleSubmit = () => {
    if (!winner || !selectedAIgn || !selectedBIgn) return;

    onAddGame({
      playerAIgn: selectedAIgn,
      deckAType,
      isRepeatA,
      playerBIgn: selectedBIgn,
      deckBType,
      isRepeatB,
      winner,
      isDeckloss: gameStatus === 'deckloss',
      ssHandA,
      ssHandB,
      notes: notes.trim(),
    });

    // Otomatis pindahkan fokus tab ke tim yang kalah
    setActiveTab(winner === 'teamA' ? 'B' : 'A');

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
          <span>⚠️ Daftarkan 5 duelist untuk kedua tim sebelum mencatat game!</span>
        </div>
      )}

      <RunnerPenaltyBanner
        pendingPenaltyTeam={pendingPenaltyTeam}
        penalizedTeamName={pendingPenaltyTeam === 'teamA' ? teamAName : teamBName}
        isTargetLocked={isTargetLocked}
        lockedPlayerIgn={penalizedLastPlayer?.ign}
      />

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
          {teamAName} {selectedAIgn && '✓'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('B')}
          className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === 'B'
              ? 'bg-blue-600 text-white shadow-xs border border-blue-600'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {teamBName} {selectedBIgn && '✓'}
        </button>
      </div>

      <EditorRunnerTeamPanel
        teamName={activeTab === 'A' ? teamAName : teamBName}
        lineup={activeTab === 'A' ? activeLineupA : activeLineupB}
        selectedIgn={activeTab === 'A' ? selectedAIgn : selectedBIgn}
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
        isLineupReady={isLineupReady && Boolean(selectedAIgn && selectedBIgn)}
        nextGameNumber={resolvedNextGameNumber}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
