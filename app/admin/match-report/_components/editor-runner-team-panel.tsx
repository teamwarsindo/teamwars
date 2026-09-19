'use client';

import React, { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface EditorRunnerTeamPanelProps {
  teamName: string;
  lineup: PlayerLineupItem[];
  selectedIgn: string;
  selectedDeck: 'deck1' | 'deck2';
  isRepeat: boolean;
  repeatsUsed: number;
  isStayTable?: boolean;
  mustContinue?: boolean;
  lastWinnerGameNum?: number;
  onSelectPlayer: (ign: string, defaultDeck: 'deck1' | 'deck2') => void;
  onSelectDeck: (slot: 'deck1' | 'deck2') => void;
  onToggleRepeat: () => void;
}

export function EditorRunnerTeamPanel({
  teamName,
  lineup = [],
  selectedIgn,
  selectedDeck,
  isRepeat,
  repeatsUsed = 0,
  isStayTable = false,
  mustContinue = false,
  onSelectPlayer,
  onSelectDeck,
  onToggleRepeat,
}: EditorRunnerTeamPanelProps) {
  const activePlayer = useMemo(
    () => lineup.find((p) => p.ign.toLowerCase() === selectedIgn.toLowerCase()),
    [lineup, selectedIgn]
  );

  // Cari apakah pemain ini memiliki slot deck yang sudah pernah dipakai repeat
  const repeatedSlot = useMemo<'deck1' | 'deck2' | null>(() => {
    if (!activePlayer) return null;
    if (activePlayer.deck1?.isRepeatUsed) return 'deck1';
    if (activePlayer.deck2?.isRepeatUsed) return 'deck2';
    return null;
  }, [activePlayer]);

  // Cari deck yang mati di ronde pertama (hanya untuk pemain dengan sisa Life 1)
  const deadDeckSlot = useMemo<'deck1' | 'deck2' | null>(() => {
    if (!activePlayer) return null;
    if (activePlayer.deck1?.isDead && !activePlayer.deck2?.isDead) return 'deck1';
    if (activePlayer.deck2?.isDead && !activePlayer.deck1?.isDead) return 'deck2';
    return null;
  }, [activePlayer]);

  // Tampilkan tombol repeat jika belum pernah repeat, life 1, dan belum pernah menang fisik
  const canShowRepeatToggle = useMemo(() => {
    if (!activePlayer || isStayTable || repeatedSlot !== null) return false;
    if (isRepeat) return true;
    const hasPhysicalWin = (activePlayer.totalWins ?? 0) > 0;
    return (
      !hasPhysicalWin &&
      (activePlayer.totalLosses ?? 0) === 1 &&
      repeatsUsed < 2 &&
      deadDeckSlot !== null
    );
  }, [activePlayer, isStayTable, repeatedSlot, isRepeat, repeatsUsed, deadDeckSlot]);

  return (
    <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-foreground">
          DUELIST {teamName}
        </span>
        {isStayTable && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
            Stay table
          </span>
        )}
      </div>

      {/* LIST DUELIST */}
      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground font-medium">Pilih Pemain (Roster Aktif):</span>
        <div className="grid grid-cols-2 gap-2">
          {lineup.map((p) => {
            const isSelected = p.ign.toLowerCase() === selectedIgn.toLowerCase();
            const isDead = (p.remainingLife ?? 2) <= 0;
            const isLockedOther = (isStayTable || mustContinue) && !isSelected;

            return (
              <button
                key={p.ign}
                type="button"
                disabled={isDead || isLockedOther}
                onClick={() => {
                  const defaultSlot = !p.deck1?.isDead ? 'deck1' : 'deck2';
                  onSelectPlayer(p.ign, defaultSlot);
                }}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600/10 ring-1 ring-blue-600'
                    : 'border-border bg-card hover:bg-muted/40'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="text-xs font-black text-foreground truncate">{p.ign}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Life: {p.remainingLife ?? 2}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PILIHAN DECK */}
      {activePlayer && (
        <div className="pt-2 border-t border-border/60 space-y-2">
          <span className="text-[11px] text-muted-foreground font-medium">Deck yang Digunakan:</span>
          <div className="space-y-2">
            {[1, 2].map((num) => {
              const slot = num === 1 ? 'deck1' : 'deck2';
              const deckObj = activePlayer[slot];
              const isSelected = selectedDeck === slot;

              // Tentukan apakah slot ini adalah deck yang aktif di-repeat
              const isThisDeckRepeated =
                (repeatedSlot === slot) ||
                (isRepeat && slot === deadDeckSlot) ||
                (isSelected && Boolean(deckObj?.isRepeatUsed));

              // Tentukan apakah pemain sedang dalam mode bermain repeat
              const isPlayerInRepeatMode = isRepeat || repeatedSlot !== null;

              // Logika status mati:
              // Jika mode repeat aktif:
              // - Deck repeat = HIDUP
              // - Deck pasangan = MATI
              // Jika duel reguler biasa: ikuti deckObj.isDead
              let isDeadDisplay = false;
              if (isPlayerInRepeatMode) {
                isDeadDisplay = !isThisDeckRepeated;
              } else {
                isDeadDisplay = Boolean(deckObj?.isDead);
              }

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isDeadDisplay || isStayTable}
                  onClick={() => onSelectDeck(slot)}
                  className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600/10 ring-1 ring-blue-600'
                      : 'border-border bg-card hover:bg-muted/40'
                  } ${isDeadDisplay ? 'opacity-35 cursor-not-allowed bg-muted/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${isDeadDisplay ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      DECK {num} {isDeadDisplay && '(MATI)'}
                    </span>
                    {isThisDeckRepeated && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-md tracking-wider shadow-xs">
                        REPEAT
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-bold truncate mt-0.5 ${isDeadDisplay ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {deckObj?.archetype || 'Belum diatur'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{deckObj?.skill || '-'}</div>
                </button>
              );
            })}
          </div>

          {/* TOGGLE SWITCH REPEAT */}
          {canShowRepeatToggle && (
            <button
              type="button"
              onClick={onToggleRepeat}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs border ${
                isRepeat
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/40'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              🔄 {isRepeat ? 'Batal Repeat (Kembali ke Deck Asli)' : `Gunakan Hak Repeat (${repeatsUsed}/2 Digunakan)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
              }
