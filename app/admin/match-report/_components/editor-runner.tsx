'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlayerLineupItem, GameEntry } from '../types';
import { ReportLogs } from '@/app/analytics/_components/report-logs';
import { EditorRunnerTeamPanel } from './editor-runner-team-panel';

interface EditorRunnerProps {
  teamAName?: string;
  teamBName?: string;
  teamALogo?: string;
  teamBLogo?: string;
  teamALineup: PlayerLineupItem[];
  teamBLineup: PlayerLineupItem[];
  repeatsA?: number;
  repeatsB?: number;
  games: GameEntry[];
  scoreA: number;
  scoreB: number;
  onAddGame: (gameData: any) => void;
  onRollbackGame: () => void;
}

export function EditorRunner({
  teamAName = 'Team A',
  teamBName = 'Team B',
  teamALogo,
  teamBLogo,
  teamALineup,
  teamBLineup,
  repeatsA = 0,
  repeatsB = 0,
  games,
  scoreA,
  scoreB,
  onAddGame,
  onRollbackGame,
}: EditorRunnerProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [playerAIgn, setPlayerAIgn] = useState('');
  const [deckAType, setDeckAType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatA, setIsRepeatA] = useState(false);

  const [playerBIgn, setPlayerBIgn] = useState('');
  const [deckBType, setDeckBType] = useState<'deck1' | 'deck2'>('deck1');
  const [isRepeatB, setIsRepeatB] = useState(false);

  const [winner, setWinner] = useState<'teamA' | 'teamB'>('teamA');
  const [gameStatus, setGameStatus] = useState<'normal' | 'deckloss'>('normal');
  const [decklossTeam, setDecklossTeam] = useState<'teamA' | 'teamB'>('teamB');
  const [isSsHandChecked, setIsSsHandChecked] = useState(true);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastGame = games[games.length - 1];
  const stayWinner = lastGame?.winner;

  useEffect(() => {
    if (!lastGame) return;
    if (stayWinner === 'teamA') {
      const p = teamALineup.find((x) => x.ign === lastGame.playerA.ign);
      setPlayerAIgn(lastGame.playerA.ign);
      if (p) setDeckAType(!p.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatA(false);
    } else {
      const p = teamBLineup.find((x) => x.ign === lastGame.playerB.ign);
      setPlayerBIgn(lastGame.playerB.ign);
      if (p) setDeckBType(!p.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatB(false);
    }
  }, [lastGame, stayWinner, teamALineup, teamBLineup]);

  const handleSubmit = () => {
    setErrorMsg(null);
    if (!playerAIgn || !playerBIgn) {
      setErrorMsg('Pilih duelist untuk kedua kubu sebelum menambahkan game!');
      return;
    }

    const noteParts: string[] = [];
    if (!isSsHandChecked) noteParts.push('Lupa SS Hand');
    if (gameStatus === 'deckloss') noteParts.push(`Deckloss (${decklossTeam === 'teamA' ? teamAName : teamBName})`);
    if (notes.trim()) noteParts.push(notes.trim());

    onAddGame({
      playerAIgn,
      deckAType,
      isRepeatA,
      playerBIgn,
      deckBType,
      isRepeatB,
      winner,
      notes: noteParts.join(' • '),
    });

    setIsRepeatA(false);
    setIsRepeatB(false);
    setGameStatus('normal');
    setIsSsHandChecked(true);
    setNotes('');

    if (winner === 'teamA') {
      setPlayerBIgn('');
      setActiveTab('B');
    } else {
      setPlayerAIgn('');
      setActiveTab('A');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Input Game G{games.length + 1}
            </span>
          </div>
          {games.length > 0 && (
            <button
              type="button"
              onClick={onRollbackGame}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
            >
              ↩ Rollback Game G{games.length}
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border-2 border-rose-500/60 bg-rose-500/15 text-rose-950 dark:text-rose-100 text-xs font-bold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-xs font-black px-2 cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('A')}
            className={`py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'A' ? 'bg-background text-foreground shadow-xs border border-border' : 'text-muted-foreground'
            }`}
          >
            {teamALogo && <img src={teamALogo} alt={teamAName} className="w-4 h-4 object-contain rounded-full" />}
            <span className="truncate">{teamAName}</span>
            {playerAIgn && <span className="text-emerald-500 font-bold">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('B')}
            className={`py-2 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'B' ? 'bg-background text-foreground shadow-xs border border-border' : 'text-muted-foreground'
            }`}
          >
            {teamBLogo && <img src={teamBLogo} alt={teamBName} className="w-4 h-4 object-contain rounded-full" />}
            <span className="truncate">{teamBName}</span>
            {playerBIgn && <span className="text-emerald-500 font-bold">✓</span>}
          </button>
        </div>

        {activeTab === 'A' ? (
          <EditorRunnerTeamPanel
            teamName={teamAName}
            isTeamA={true}
            lineup={teamALineup}
            selectedIgn={playerAIgn}
            selectedDeck={deckAType}
            isRepeat={isRepeatA}
            repeatsUsed={repeatsA}
            isStayTable={stayWinner === 'teamA'}
            lastWinnerGameNum={games.length}
            onSelectPlayer={(ign, defDeck) => { setPlayerAIgn(ign); setDeckAType(defDeck); setIsRepeatA(false); }}
            onSelectDeck={(deck) => { setDeckAType(deck); setIsRepeatA(false); }}
            onTriggerRepeat={(deadDeck) => { setDeckAType(deadDeck); setIsRepeatA(true); }}
          />
        ) : (
          <EditorRunnerTeamPanel
            teamName={teamBName}
            isTeamA={false}
            lineup={teamBLineup}
            selectedIgn={playerBIgn}
            selectedDeck={deckBType}
            isRepeat={isRepeatB}
            repeatsUsed={repeatsB}
            isStayTable={stayWinner === 'teamB'}
            lastWinnerGameNum={games.length}
            onSelectPlayer={(ign, defDeck) => { setPlayerBIgn(ign); setDeckBType(defDeck); setIsRepeatB(false); }}
            onSelectDeck={(deck) => { setDeckBType(deck); setIsRepeatB(false); }}
            onTriggerRepeat={(deadDeck) => { setDeckBType(deadDeck); setIsRepeatB(true); }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground block">Status Pertandingan:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGameStatus('normal')}
                className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                  gameStatus === 'normal' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border text-muted-foreground'
                }`}
              >
                Normal Game
              </button>
              <button
                type="button"
                onClick={() => setGameStatus('deckloss')}
                className={`flex-1 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                  gameStatus === 'deckloss' ? 'bg-rose-600 text-white border-rose-600' : 'border-border text-muted-foreground'
                }`}
              >
                Deckloss
              </button>
            </div>
            {gameStatus === 'deckloss' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground">Kena DL:</span>
                {(['teamA', 'teamB'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setDecklossTeam(side)}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                      decklossTeam === side ? 'bg-rose-600 text-white border-rose-600' : 'border-border text-foreground'
                    }`}
                  >
                    {side === 'teamA' ? teamAName : teamBName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground block">Validasi & Catatan:</label>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSsHandChecked}
                onChange={(e) => setIsSsHandChecked(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary cursor-pointer"
              />
              <span>SS Hand Aman {!isSsHandChecked && <b className="text-rose-600">(Lupa SS Hand)</b>}</span>
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-2 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <label className="text-[11px] font-bold text-muted-foreground block">Pemenang Ronde Ini:</label>
          <div className="grid grid-cols-2 gap-2">
            {(['teamA', 'teamB'] as const).map((side) => {
              const isA = side === 'teamA';
              const name = isA ? teamAName : teamBName;
              const logo = isA ? teamALogo : teamBLogo;
              const isSelected = winner === side;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => setWinner(side)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border ${
                    isSelected
                      ? isA ? 'bg-primary text-primary-foreground border-primary' : 'bg-rose-600 text-white border-rose-600'
                      : 'bg-background border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  {logo && <img src={logo} alt={name} className="w-5 h-5 object-contain rounded-full" />}
                  <span className="truncate">{name} Win</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
        >
          + Tambahkan Hasil Game {games.length + 1}
        </button>
      </div>

      <ReportLogs games={games} isFinished={scoreA >= 10 || scoreB >= 10} isMatchStarted={true} />
    </div>
  );
}
