'use client';

import { useState } from 'react';
import { PlayerLineupItem, GameEntry } from '../types';
import { ReportLogs } from '@/app/analytics/_components/report-logs';

interface EditorRunnerProps {
  teamAName?: string;
  teamBName?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  games: GameEntry[];
  scoreA: number;
  scoreB: number;
  onAddGame: (gameData: any) => void;
  onRollbackGame: () => void;
}

export function EditorRunner({
  teamAName = 'Team A',
  teamBName = 'Team B',
  teamALineup,
  teamBLineup,
  games,
  scoreA,
  scoreB,
  onAddGame,
  onRollbackGame,
}: EditorRunnerProps) {
  const [playerAIgn, setPlayerAIgn] = useState('');
  const [deckAType, setDeckAType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatA, setIsRepeatA] = useState(false);

  const [playerBIgn, setPlayerBIgn] = useState('');
  const [deckBType, setDeckBType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatB, setIsRepeatB] = useState(false);

  const [winner, setWinner] = useState<'teamA' | 'teamB'>('teamA');
  const [notes, setNotes] = useState('');

  const submitGame = () => {
    if (!playerAIgn || !playerBIgn) {
      alert('Pilih duelist dari kedua kubu!');
      return;
    }
    onAddGame({ playerAIgn, deckAType, isRepeatA, playerBIgn, deckBType, isRepeatB, winner, notes });
    setIsRepeatA(false);
    setIsRepeatB(false);
    setNotes('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Input Duel Ronde G{games.length + 1}
          </span>
          {games.length > 0 && (
            <button
              type="button"
              onClick={onRollbackGame}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
            >
              ↩ Rollback Game G{games.length}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Sisi Tim A */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
            <label className="text-[10px] font-bold text-primary block">Duelist {teamAName}</label>
            <select
              value={playerAIgn}
              onChange={(e) => setPlayerAIgn(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="">-- Pilih Pemain --</option>
              {teamALineup.filter((p) => p.ign.trim()).map((p) => (
                <option key={p.ign} value={p.ign}>{p.ign} (Life: {p.remainingLife})</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {(['deck1', 'deck2'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeckAType(d)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition ${
                    deckAType === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {d === 'deck1' ? 'Deck 1' : 'Deck 2'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer pt-1">
              <input type="checkbox" checked={isRepeatA} onChange={(e) => setIsRepeatA(e.target.checked)} className="rounded border-border" />
              Pakai Hak Repeat (R)
            </label>
          </div>

          {/* Sisi Tim B */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
            <label className="text-[10px] font-bold text-rose-500 block">Duelist {teamBName}</label>
            <select
              value={playerBIgn}
              onChange={(e) => setPlayerBIgn(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="">-- Pilih Pemain --</option>
              {teamBLineup.filter((p) => p.ign.trim()).map((p) => (
                <option key={p.ign} value={p.ign}>{p.ign} (Life: {p.remainingLife})</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {(['deck1', 'deck2'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeckBType(d)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition ${
                    deckBType === d ? 'bg-rose-500 text-white border-rose-500' : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {d === 'deck1' ? 'Deck 1' : 'Deck 2'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer pt-1">
              <input type="checkbox" checked={isRepeatB} onChange={(e) => setIsRepeatB(e.target.checked)} className="rounded border-border" />
              Pakai Hak Repeat (R)
            </label>
          </div>
        </div>

        {/* Pemenang & Catatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground block">Pemenang Ronde</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWinner('teamA')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition ${
                  winner === 'teamA' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {teamAName} Win
              </button>
              <button
                type="button"
                onClick={() => setWinner('teamB')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition ${
                  winner === 'teamB' ? 'bg-rose-500 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {teamBName} Win
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground block">Catatan Tambahan</span>
            <input
              type="text"
              placeholder="Misal: TL, disconnect..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={submitGame}
          className="w-full mt-2 py-2 bg-primary hover:opacity-95 text-primary-foreground font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          + Tambahkan Game {games.length + 1}
        </button>
      </div>

      <ReportLogs games={games} isFinished={scoreA >= 10 || scoreB >= 10} isMatchStarted={true} />
    </div>
  );
}
