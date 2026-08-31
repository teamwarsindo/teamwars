import React, { useState } from 'react';

interface GameTabProps {
  teamAName: string;
  teamBName: string;
  report: any;
  loading: boolean;
  onAddGame: (params: {
    winnerOpt: 'A' | 'B';
    playerAIgn: string;
    deckAName: string;
    playerBIgn: string;
    deckBName: string;
    statusKalah: string;
    notes: string;
    shouldPublish: boolean;
  }) => void;
  onRollback: () => void;
}

export default function GameTab({
  teamAName,
  teamBName,
  report,
  loading,
  onAddGame,
  onRollback,
}: GameTabProps) {
  const [gameWinner, setGameWinner] = useState<'A' | 'B'>('A');
  const [playerAIndex, setPlayerAIndex] = useState<number>(0);
  const [deckAIndex, setDeckAIndex] = useState<number>(1);
  const [playerBIndex, setPlayerBIndex] = useState<number>(0);
  const [deckBIndex, setDeckBIndex] = useState<number>(1);
  const [lossCondition, setLossCondition] = useState<string>('REGULAR');
  const [gameNotes, setGameNotes] = useState<string>('');

  const pA = report?.teamA?.lineup?.[playerAIndex];
  const pB = report?.teamB?.lineup?.[playerBIndex];
  const dA = deckAIndex === 1 ? pA?.deck1 : pA?.deck2;
  const dB = deckBIndex === 1 ? pB?.deck1 : pB?.deck2;

  const handleSubmit = (shouldPublish: boolean) => {
    if (!pA?.ign || !pB?.ign || !dA?.archetype || !dB?.archetype) return;
    onAddGame({
      winnerOpt: gameWinner,
      playerAIgn: pA.ign,
      deckAName: dA.archetype,
      playerBIgn: pB.ign,
      deckBName: dB.archetype,
      statusKalah: lossCondition,
      notes: gameNotes,
      shouldPublish,
    });
    setGameNotes('');
  };

  const isMatchFinished = (report?.teamA?.score ?? 0) >= 10 || (report?.teamB?.score ?? 0) >= 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Input Controller */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">🎮 Input Ronde Duel</h3>
          <button
            onClick={onRollback}
            disabled={loading || !report?.games?.length}
            className="px-2.5 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-xs font-semibold hover:bg-red-600/30 disabled:opacity-40"
          >
            🔄 Rollback (/game del)
          </button>
        </div>

        {/* Tim A */}
        <div className="space-y-1">
          <label className="text-xs text-blue-400 font-medium">Pemain {teamAName}</label>
          <select
            value={playerAIndex}
            onChange={(e) => setPlayerAIndex(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-xs outline-none"
          >
            {(report?.teamA?.lineup || []).map((p: any, idx: number) => (
              <option key={idx} value={idx}>
                {p.ign || `Pemain ${idx + 1}`} (Life: {p.remainingLife ?? 2})
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            {[1, 2].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeckAIndex(d)}
                className={`flex-1 py-1 text-xs rounded border ${
                  deckAIndex === d ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Deck {d}: {report?.teamA?.lineup[playerAIndex]?.[`deck${d}`]?.archetype || '-'}
              </button>
            ))}
          </div>
        </div>

        {/* Tim B */}
        <div className="space-y-1">
          <label className="text-xs text-red-400 font-medium">Pemain {teamBName}</label>
          <select
            value={playerBIndex}
            onChange={(e) => setPlayerBIndex(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-xs outline-none"
          >
            {(report?.teamB?.lineup || []).map((p: any, idx: number) => (
              <option key={idx} value={idx}>
                {p.ign || `Pemain ${idx + 1}`} (Life: {p.remainingLife ?? 2})
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            {[1, 2].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeckBIndex(d)}
                className={`flex-1 py-1 text-xs rounded border ${
                  deckBIndex === d ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Deck {d}: {report?.teamB?.lineup[playerBIndex]?.[`deck${d}`]?.archetype || '-'}
              </button>
            ))}
          </div>
        </div>

        {/* Pemenang */}
        <div>
          <label className="text-xs text-slate-400 font-medium">Pemenang Ronde</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setGameWinner('A')}
              className={`py-2 text-xs font-bold rounded border ${
                gameWinner === 'A' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              🏆 {teamAName} Win
            </button>
            <button
              type="button"
              onClick={() => setGameWinner('B')}
              className={`py-2 text-xs font-bold rounded border ${
                gameWinner === 'B' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              🏆 {teamBName} Win
            </button>
          </div>
        </div>

        {/* Kondisi Kekalahan */}
        <div>
          <label className="text-xs text-slate-400 font-medium">Status Kekalahan Lawan</label>
          <select
            value={lossCondition}
            onChange={(e) => setLossCondition(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-xs mt-1 outline-none"
          >
            <option value="REGULAR">Regular (Deck Gugur / -1 Life)</option>
            <option value="REPEAT">Repeat Deck (Pakai Kuota Repeat)</option>
            <option value="PENALTY_2">Penalti Berat (-2 Life Langsung)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-medium">Catatan Ronde (Opsional)</label>
          <input
            type="text"
            placeholder="Misal: Sanksi koneksi, dsb."
            value={gameNotes}
            onChange={(e) => setGameNotes(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-xs mt-1 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading || isMatchFinished}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-xs transition disabled:opacity-40"
          >
            💾 Simpan (Draft)
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading || isMatchFinished}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-40 shadow-lg shadow-emerald-900/30"
          >
            🚀 Publish Game
          </button>
        </div>
      </div>

      {/* Live Preview & Game Log List */}
      <div className="lg:col-span-2 space-y-6">
        {/* Discord Preview Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="font-bold text-white text-xs tracking-wide uppercase">
              Discord Live Preview — Embed Log Ronde
            </h4>
          </div>
          <div
            className={`bg-[#2b2d31] p-4 rounded-lg border-l-4 font-mono text-xs text-slate-200 space-y-1.5 ${
              gameWinner === 'A' ? 'border-[#3b82f6]' : 'border-[#ef4444]'
            }`}
          >
            <p className="font-bold text-white text-sm">
              ⚔️ HASIL GAME {(report?.games?.length || 0) + 1} — {gameWinner === 'A' ? teamAName.toUpperCase() : teamBName.toUpperCase()} WIN!
            </p>
            <p className="text-slate-300">
              **{teamAName}** [ `{(report?.teamA?.score || 0) + (gameWinner === 'A' ? 1 : 0)}` — `{(report?.teamB?.score || 0) + (gameWinner === 'B' ? 1 : 0)}` ] **{teamBName}**
            </p>
            <div className="pt-2 space-y-0.5 text-slate-400">
              <p>🔵 {pA?.ign || 'Pemain A'} (`{dA?.archetype || 'Deck A'}`)</p>
              <p>🔴 {pB?.ign || 'Pemain B'} (`{dB?.archetype || 'Deck B'}`)</p>
              <p className="text-amber-400 pt-1">• Status Lawan: `{lossCondition}`</p>
              {gameNotes && <p className="text-slate-500">• Catatan: *{gameNotes}*</p>}
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="font-bold text-white text-sm mb-3">📜 Riwayat Ronde ({report?.games?.length || 0})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(report?.games || []).map((g: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  g.winner === 'teamA' ? 'bg-blue-950/30 border-blue-900/50' : 'bg-red-950/30 border-red-900/50'
                }`}
              >
                <div>
                  <span className="font-bold text-white mr-2">Game {g.gameNumber}:</span>
                  <span className={g.winner === 'teamA' ? 'text-blue-400 font-semibold' : 'text-slate-300'}>
                    {g.playerA.ign} ({g.playerA.archetype})
                  </span>
                  <span className="text-slate-500 mx-1.5">vs</span>
                  <span className={g.winner === 'teamB' ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                    {g.playerB.ign} ({g.playerB.archetype})
                  </span>
                  {g.lossCondition !== 'REGULAR' && (
                    <span className="ml-2 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                      {g.lossCondition}
                    </span>
                  )}
                </div>
                <span className="font-bold text-slate-300">
                  {g.winner === 'teamA' ? teamAName : teamBName} WIN
                </span>
              </div>
            ))}
            {(!report?.games || report.games.length === 0) && (
              <div className="text-center py-6 text-slate-500 text-xs">Belum ada game yang dicatat.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
    }
            
