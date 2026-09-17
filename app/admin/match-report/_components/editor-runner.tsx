'use client';

import React, { useState } from 'react';
import { PlayerLineupItem } from '../types';

interface EditorRunnerProps {
  teamAName: string;
  teamBName: string;
  lineupA: PlayerLineupItem[];
  lineupB: PlayerLineupItem[];
  nextGameNumber: number;
  onAddGame: (gameData: any) => void;
}

export function EditorRunner({
  teamAName,
  teamBName,
  lineupA = [],
  lineupB = [],
  nextGameNumber,
  onAddGame,
}: EditorRunnerProps) {
  const [selectedAIgn, setSelectedAIgn] = useState<string>('');
  const [deckAType, setDeckAType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatA, setIsRepeatA] = useState(false);

  const [selectedBIgn, setSelectedBIgn] = useState<string>('');
  const [deckBType, setDeckBType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatB, setIsRepeatB] = useState(false);

  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [gameStatus, setGameStatus] = useState<'normal' | 'deckloss'>('normal');
  const [ssHandA, setSsHandA] = useState(true);
  const [ssHandB, setSsHandB] = useState(true);
  const [notes, setNotes] = useState('');
  const [winner, setWinner] = useState<'teamA' | 'teamB' | null>(null);

  const activeLineupA = lineupA.filter((p) => p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-');
  const activeLineupB = lineupB.filter((p) => p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-');

  const playerA = activeLineupA.find((p) => p.ign === selectedAIgn) || activeLineupA[0];
  const playerB = activeLineupB.find((p) => p.ign === selectedBIgn) || activeLineupB[0];

  const currentAIgn = playerA?.ign || '';
  const currentBIgn = playerB?.ign || '';

  const isLineupReady = activeLineupA.length === 5 && activeLineupB.length === 5;

  const handleSubmit = (chosenWinner: 'teamA' | 'teamB') => {
    if (!currentAIgn || !currentBIgn) return;

    onAddGame({
      playerAIgn: currentAIgn,
      deckAType,
      isRepeatA,
      playerBIgn: currentBIgn,
      deckBType,
      isRepeatB,
      winner: chosenWinner,
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
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            INPUT GAME G{nextGameNumber}
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-muted-foreground">
          TW INDONESIA
        </span>
      </div>

      {!isLineupReady && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>⚠️ Pilih 5 duelist untuk kedua tim sebelum mencatat game!</span>
        </div>
      )}

      {/* TAB PILIH DUELIST TIM A / TIM B */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('A')}
          className={`py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === 'A'
              ? 'bg-background text-foreground shadow-xs border border-border'
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
              ? 'bg-background text-foreground shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {teamBName}
        </button>
      </div>

      {/* ROSTER AKTIF */}
      <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-foreground">
            DUELIST {activeTab === 'A' ? teamAName : teamBName}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">Pilih Pemain (Roster Aktif):</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(activeTab === 'A' ? activeLineupA : activeLineupB).map((p) => {
            const isSelected = (activeTab === 'A' ? currentAIgn : currentBIgn) === p.ign;
            return (
              <button
                key={p.ign}
                type="button"
                onClick={() => {
                  if (activeTab === 'A') setSelectedAIgn(p.ign);
                  else setSelectedBIgn(p.ign);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="text-xs font-black text-foreground truncate">{p.ign}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Life: {p.remainingLife ?? 2}
                </div>
              </button>
            );
          })}
        </div>

        {/* PILIHAN DECK DUELIST TERPILIH */}
        {((activeTab === 'A' && playerA) || (activeTab === 'B' && playerB)) && (
          <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
            {[1, 2].map((num) => {
              const targetPlayer = activeTab === 'A' ? playerA : playerB;
              const dSlot = num === 1 ? 'deck1' : 'deck2';
              const deckObj = targetPlayer[dSlot];
              const isSelectedDeck = (activeTab === 'A' ? deckAType : deckBType) === dSlot;

              return (
                <button
                  key={dSlot}
                  type="button"
                  onClick={() => {
                    if (activeTab === 'A') setDeckAType(dSlot);
                    else setDeckBType(dSlot);
                  }}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    isSelectedDeck
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase text-primary">Deck {num}</div>
                  <div className="text-xs font-bold text-foreground truncate">
                    {deckObj?.archetype || 'Belum diatur'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{deckObj?.skill || '-'}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STATUS PERTANDINGAN & SS HAND */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground block">Status Pertandingan:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGameStatus('normal')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                gameStatus === 'normal'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              Normal Game
            </button>
            <button
              type="button"
              onClick={() => setGameStatus('deckloss')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                gameStatus === 'deckloss'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              Deckloss
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground block">Validasi SS Hand:</label>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ssHandA}
                onChange={(e) => setSsHandA(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary cursor-pointer"
              />
              <span>SS {teamAName} {!ssHandA && <b className="text-rose-500">(Lupa)</b>}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ssHandB}
                onChange={(e) => setSsHandB(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary cursor-pointer"
              />
              <span>SS {teamBName} {!ssHandB && <b className="text-rose-500">(Lupa)</b>}</span>
            </label>
          </div>
          <input
            type="text"
            placeholder="Catatan tambahan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-background border border-border rounded-xl p-2 text-xs text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* PEMENANG & SUBMIT */}
      <div className="pt-2 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground block">Pemenang Ronde Ini:</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!isLineupReady}
            onClick={() => setWinner('teamA')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
              winner === 'teamA'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-card border-border hover:bg-muted text-foreground disabled:opacity-50'
            }`}
          >
            {teamAName} Win
          </button>
          <button
            type="button"
            disabled={!isLineupReady}
            onClick={() => setWinner('teamB')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer ${
              winner === 'teamB'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-card border-border hover:bg-muted text-foreground disabled:opacity-50'
            }`}
          >
            {teamBName} Win
          </button>
        </div>

        {winner && (
          <button
            type="button"
            onClick={() => handleSubmit(winner)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-xs mt-2"
          >
            + Tambahkan Hasil Game {nextGameNumber}
          </button>
        )}
      </div>
    </div>
  );
      }
