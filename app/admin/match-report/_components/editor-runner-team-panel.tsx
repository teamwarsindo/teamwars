'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface RunnerTeamPanelProps {
  teamName: string;
  isTeamA: boolean;
  lineup: PlayerLineupItem[];
  selectedIgn: string;
  selectedDeck: 'deck1' | 'deck2';
  isRepeat: boolean;
  repeatsUsed: number;
  isStayTable: boolean;
  lastWinnerGameNum: number;
  onSelectPlayer: (ign: string, defaultDeck: 'deck1' | 'deck2') => void;
  onSelectDeck: (deck: 'deck1' | 'deck2') => void;
  onTriggerRepeat: (deadDeckSlot: 'deck1' | 'deck2') => void;
}

export function EditorRunnerTeamPanel({
  teamName,
  isTeamA,
  lineup,
  selectedIgn,
  selectedDeck,
  isRepeat,
  repeatsUsed,
  isStayTable,
  lastWinnerGameNum,
  onSelectPlayer,
  onSelectDeck,
  onTriggerRepeat,
}: RunnerTeamPanelProps) {
  const activePlayer = useMemo(() => lineup.find((p) => p.ign === selectedIgn), [lineup, selectedIgn]);
  const availablePlayers = useMemo(() => lineup.filter((p) => p.ign?.trim() && p.remainingLife > 0), [lineup]);

  const canRepeat = useMemo(() => {
    if (!activePlayer) return false;
    return activePlayer.totalWins === 0 && activePlayer.totalLosses === 1 && repeatsUsed < 2;
  }, [activePlayer, repeatsUsed]);

  const primaryColor = isTeamA ? 'text-primary border-primary' : 'text-rose-500 border-rose-500';
  const activeDeckBg = isTeamA ? 'bg-primary text-primary-foreground border-primary' : 'bg-rose-600 text-white border-rose-600';

  return (
    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-black uppercase ${primaryColor}`}>Duelist {teamName}</span>
        {isStayTable && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            STAY TABLE (MENANG G{lastWinnerGameNum})
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground block">Pilih Pemain (Roster Aktif):</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availablePlayers.map((p) => {
            const isSelected = selectedIgn === p.ign;
            return (
              <button
                key={p.ign}
                type="button"
                disabled={isStayTable && !isSelected}
                onClick={() => {
                  const defDeck = !p.deck1.isDead ? 'deck1' : 'deck2';
                  onSelectPlayer(p.ign, defDeck);
                }}
                className={`p-2 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? isTeamA ? 'border-primary bg-primary/10 text-primary' : 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : isStayTable
                    ? 'opacity-40 border-border bg-muted/10 cursor-not-allowed'
                    : 'border-border bg-background text-foreground hover:border-border/80'
                }`}
              >
                <div className="truncate font-black">{p.ign}</div>
                <div className="text-[10px] font-mono opacity-70">Life: {p.remainingLife}</div>
              </button>
            );
          })}
        </div>
      </div>

      {activePlayer && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-muted-foreground block">Deck yang Digunakan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['deck1', 'deck2'] as const).map((slot) => {
              const d = activePlayer[slot];
              const isDead = d.isDead;
              const isCurrentSelected = selectedDeck === slot && !isRepeat;
              const isLockedByStay = isStayTable && selectedDeck !== slot;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isDead || isLockedByStay}
                  onClick={() => onSelectDeck(slot)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isCurrentSelected
                      ? `${activeDeckBg} font-black shadow-xs`
                      : isDead
                      ? 'opacity-40 border-border bg-muted/20 cursor-not-allowed text-muted-foreground'
                      : 'border-border bg-background hover:border-border/80 text-foreground font-bold'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono opacity-80">
                    {slot === 'deck1' ? 'Deck 1' : 'Deck 2'} {isDead && '(Mati)'}
                  </div>
                  <div className="text-xs font-black truncate">{d.archetype || '-'}</div>
                  <div className="text-[10px] truncate opacity-75">{d.skill || '-'}</div>
                </button>
              );
            })}
          </div>

          {canRepeat && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onTriggerRepeat(activePlayer.deck1.isDead ? 'deck1' : 'deck2')}
                className={`w-full p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  isRepeat
                    ? 'bg-amber-500 text-white border-amber-600 font-black shadow-xs'
                    : 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold'
                }`}
              >
                <span className="text-xs">🔄 Gunakan Hak Repeat ({repeatsUsed}/2 Digunakan)</span>
                <span className="block text-[10px] opacity-90">
                  Hidupkan kembali {activePlayer.deck1.isDead ? activePlayer.deck1.archetype : activePlayer.deck2.archetype}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
                                               }
