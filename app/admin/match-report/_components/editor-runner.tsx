'use client';

import { useState, useEffect } from 'react';
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
  const [isSsHandChecked, setIsSsHandChecked] = useState(true);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastGame = games[games.length - 1];
  const isStayA = lastGame?.winner === 'teamA';
  const isStayB = lastGame?.winner === 'teamB';

  // Cek apakah pemain yang kalah ronde lalu masih punya 1 nyawa tersisa
  const loserPlayerA = !isStayA && lastGame ? teamALineup.find(p => p.ign === lastGame.playerA.ign) : null;
  const loserPlayerB = !isStayB && lastGame ? teamBLineup.find(p => p.ign === lastGame.playerB.ign) : null;
  const mustContinueA = Boolean(loserPlayerA && loserPlayerA.remainingLife === 1);
  const mustContinueB = Boolean(loserPlayerB && loserPlayerB.remainingLife === 1);

  useEffect(() => {
    if (!lastGame) return;

    // Sinkronisasi Kubu Tim A
    if (isStayA) {
      setPlayerAIgn(lastGame.playerA.ign);
      const p = teamALineup.find((x) => x.ign === lastGame.playerA.ign);
      if (p) setDeckAType(p.deck1.archetype === lastGame.playerA.archetype && !p.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatA(false);
    } else if (mustContinueA && loserPlayerA) {
      setPlayerAIgn(loserPlayerA.ign);
      setDeckAType(!loserPlayerA.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatA(false);
    }

    // Sinkronisasi Kubu Tim B
    if (isStayB) {
      setPlayerBIgn(lastGame.playerB.ign);
      const p = teamBLineup.find((x) => x.ign === lastGame.playerB.ign);
      if (p) setDeckBType(p.deck1.archetype === lastGame.playerB.archetype && !p.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatB(false);
    } else if (mustContinueB && loserPlayerB) {
      setPlayerBIgn(loserPlayerB.ign);
      setDeckBType(!loserPlayerB.deck1.isDead ? 'deck1' : 'deck2');
      setIsRepeatB(false);
    }
  }, [lastGame, isStayA, isStayB, mustContinueA, mustContinueB, teamALineup, teamBLineup]);

  const handleSubmit = () => {
    setErrorMsg(null);
    if (!playerAIgn || !playerBIgn) {
      setErrorMsg('Pilih duelist untuk kedua tim sebelum menambahkan game!');
      return;
    }

    const noteParts: string[] = [];
    if (!isSsHandChecked) noteParts.push('Lupa SS Hand');
    if (gameStatus === 'deckloss') {
      const loserTeam = winner === 'teamA' ? teamBName : teamAName;
      noteParts.push(`Deckloss (${loserTeam})`);
    }
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
      if (!mustContinueB) setPlayerBIgn('');
      setActiveTab('B');
    } else {
      if (!mustContinueA) setPlayerAIgn('');
      setActiveTab('A');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Input Game G{games.length + 1}
            </span>
          </div>
          {games.length > 0 && (
            <button
              type="button"
              onClick={onRollbackGame}
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition cursor-pointer"
            >
              ↩ Rollback Game G{games.length}
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-xs font-bold px-2 cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
          {(['A', 'B'] as const).map((tab) => {
            const isTabA = tab === 'A';
            const name = isTabA ? teamAName : teamBName;
            const logo = isTabA ? teamALogo : teamBLogo;
            const ign = isTabA ? playerAIgn : playerBIgn;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === tab ? 'bg-background text-foreground shadow-xs border border-border' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {logo && <img src={logo} alt={name} className="w-4 h-4 object-contain rounded-full" />}
                <span className="truncate">{name}</span>
                {ign && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {activeTab === 'A' ? (
          <EditorRunnerTeamPanel
            teamName={teamAName}
            lineup={teamALineup}
            selectedIgn={playerAIgn}
            selectedDeck={deckAType}
            isRepeat={isRepeatA}
            repeatsUsed={repeatsA}
            isStayTable={isStayA}
            mustContinue={mustContinueA}
            lastWinnerGameNum={games.length}
            onSelectPlayer={(ign, defDeck) => { setPlayerAIgn(ign); setDeckAType(defDeck); setIsRepeatA(false); }}
            onSelectDeck={(deck) => { setDeckAType(deck); setIsRepeatA(false); }}
            onTriggerRepeat={(deadDeck) => { setDeckAType(deadDeck); setIsRepeatA(true); }}
          />
        ) : (
          <EditorRunnerTeamPanel
            teamName={teamBName}
            lineup={teamBLineup}
            selectedIgn={playerBIgn}
            selectedDeck={deckBType}
            isRepeat={isRepeatB}
            repeatsUsed={repeatsB}
            isStayTable={isStayB}
            mustContinue={mustContinueB}
            lastWinnerGameNum={games.length}
            onSelectPlayer={(ign, defDeck) => { setPlayerBIgn(ign); setDeckBType(defDeck); setIsRepeatB(false); }}
            onSelectDeck={(deck) => { setDeckBType(deck); setIsRepeatB(false); }}
            onTriggerRepeat={(deadDeck) => { setDeckBType(deadDeck); setIsRepeatB(true); }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Status Pertandingan:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGameStatus('normal')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                  gameStatus === 'normal' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                Normal Game
              </button>
              <button
                type="button"
                onClick={() => setGameStatus('deckloss')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                  gameStatus === 'deckloss' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                Deckloss
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">Validasi & Catatan:</label>
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSsHandChecked}
                onChange={(e) => setIsSsHandChecked(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary cursor-pointer"
              />
              <span>SS Hand Aman {!isSsHandChecked && <b className="text-amber-600 dark:text-amber-400">(Lupa SS Hand)</b>}</span>
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-2 text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <label className="text-xs font-semibold text-muted-foreground block">Pemenang Ronde Ini:</label>
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
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
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
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          + Tambahkan Hasil Game {games.length + 1}
        </button>
      </div>

      <ReportLogs games={games} isFinished={scoreA >= 10 || scoreB >= 10} isMatchStarted={true} />
    </div>
  );
      }
