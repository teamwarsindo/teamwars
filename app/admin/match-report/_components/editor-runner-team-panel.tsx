'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface RunnerTeamPanelProps {
  teamName: string;
  lineup: PlayerLineupItem[];
  selectedIgn: string;
  selectedDeck: 'deck1' | 'deck2';
  isRepeat: boolean;
  repeatsUsed: number;
  isStayTable: boolean;
  mustContinue: boolean;
  lastWinnerGameNum: number;
  onSelectPlayer: (ign: string, defaultDeck: 'deck1' | 'deck2') => void;
  onSelectDeck: (deck: 'deck1' | 'deck2') => void;
  onTriggerRepeat: (deadDeckSlot: 'deck1' | 'deck2') => void;
}

export function EditorRunnerTeamPanel({
  teamName,
  lineup,
  selectedIgn,
  selectedDeck,
  isRepeat,
  repeatsUsed,
  isStayTable,
  mustContinue,
  lastWinnerGameNum,
  onSelectPlayer,
  onSelectDeck,
  onTriggerRepeat,
}: RunnerTeamPanelProps) {
  const activePlayer = useMemo(() => lineup.find((p) => p.ign === selectedIgn), [lineup, selectedIgn]);
  const isLockedPlayer = isStayTable || mustContinue;

  const canRepeat = useMemo(() => {
    if (!activePlayer) return false;
    return (
      (activePlayer.totalWins ?? 0) === 0 &&
      (activePlayer.totalLosses ?? 0) === 1 &&
      repeatsUsed < 2
    );
  }, [activePlayer, repeatsUsed]);

  return (
    <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-foreground">Duelist {teamName}</span>
        {isStayTable && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            STAY TABLE (MENANG G{lastWinnerGameNum})
          </span>
        )}
        {mustContinue && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
            WAJIB LANJUT (SISA 1 NYAWA)
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground block">Pilih Pemain (Roster Aktif):</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {lineup.filter((p) => p.ign?.trim()).map((p) => {
            const isSelected = selectedIgn === p.ign;
            const isDead = (p.remainingLife ?? 2) <= 0;
            const isDisabled = isDead || (isLockedPlayer && !isSelected);

            return (
              <button
                key={p.ign}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  // Safe check agar tidak crash jika deck1 belum lengkap
                  const isDeck1Dead = Boolean(p.deck1?.isDead);
                  const defDeck = !isDeck1Dead ? 'deck1' : 'deck2';
                  onSelectPlayer(p.ign, defDeck);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : isDisabled
                    ? 'opacity-35 border-border/50 bg-muted/20 cursor-not-allowed text-muted-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted/40'
                }`}
              >
                <div className="truncate font-bold">{p.ign}</div>
                <div className="text-[11px] opacity-80">Life: {p.remainingLife ?? 2}</div>
              </button>
            );
          })}
        </div>
      </div>

      {activePlayer && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-muted-foreground block">Deck yang Digunakan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['deck1', 'deck2'] as const).map((slot) => {
              const d = activePlayer[slot];
              const isDead = Boolean(d?.isDead);
              const isCurrentSelected = selectedDeck === slot && !isRepeat;
              
              // Kunci deck jika pemain stay table ATAU wajib lanjut ke sisa 1 deck
              const isDisabled = isDead || (isStayTable && selectedDeck !== slot) || (mustContinue && isDead);

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectDeck(slot)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isCurrentSelected
                      ? 'border-primary bg-primary/15 text-primary font-bold shadow-xs'
                      : isDisabled
                      ? 'opacity-35 border-border/50 bg-muted/20 cursor-not-allowed text-muted-foreground'
                      : 'border-border bg-background hover:bg-muted/40 text-foreground font-semibold'
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-75">
                    {slot === 'deck1' ? 'Deck 1' : 'Deck 2'} {isDead && '(Mati)'}
                  </div>
                  <div className="text-xs font-bold truncate">{d?.archetype || 'Belum diatur'}</div>
                  <div className="text-[11px] truncate opacity-75">{d?.skill || '-'}</div>
                </button>
              );
            })}
          </div>

          {canRepeat && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => {
                  const deadDeckSlot = activePlayer.deck1?.isDead ? 'deck1' : 'deck2';
                  onTriggerRepeat(deadDeckSlot);
                }}
                className={`w-full p-2 rounded-xl border text-center transition cursor-pointer ${
                  isRepeat
                    ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                    : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold'
                }`}
              >
                <span className="text-xs">🔄 Gunakan Hak Repeat ({repeatsUsed}/2 Digunakan)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
                  }
