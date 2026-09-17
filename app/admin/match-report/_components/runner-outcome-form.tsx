'use client';

interface RunnerOutcomeFormProps {
  teamAName: string;
  teamBName: string;
  gameStatus: 'normal' | 'deckloss';
  onGameStatusChange: (status: 'normal' | 'deckloss') => void;
  isPenaltyLocked: boolean;
  ssHandA: boolean;
  onSsHandAChange: (val: boolean) => void;
  ssHandB: boolean;
  onSsHandBChange: (val: boolean) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  winner: 'teamA' | 'teamB' | null;
  onWinnerChange: (w: 'teamA' | 'teamB') => void;
  pendingPenaltyTeam: 'teamA' | 'teamB' | null;
  isLineupReady: boolean;
  nextGameNumber: number;
  onSubmit: () => void;
}

export function RunnerOutcomeForm({
  teamAName,
  teamBName,
  gameStatus,
  onGameStatusChange,
  isPenaltyLocked,
  ssHandA,
  onSsHandAChange,
  ssHandB,
  onSsHandBChange,
  notes,
  onNotesChange,
  winner,
  onWinnerChange,
  pendingPenaltyTeam,
  isLineupReady,
  nextGameNumber,
  onSubmit,
}: RunnerOutcomeFormProps) {
  return (
    <div className="space-y-4">
      {/* Status Pertandingan & Validasi SS Hand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground block">Status Pertandingan:</label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPenaltyLocked}
              onClick={() => onGameStatusChange('normal')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${
                gameStatus === 'normal'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'border-border bg-background text-muted-foreground'
              } ${isPenaltyLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Normal Game
            </button>
            <button
              type="button"
              onClick={() => onGameStatusChange('deckloss')}
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
                onChange={(e) => onSsHandAChange(e.target.checked)}
                className="w-4 h-4 rounded border-border text-blue-600 cursor-pointer"
              />
              <span>SS {teamAName} {!ssHandA && <b className="text-rose-500">(Lupa)</b>}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ssHandB}
                onChange={(e) => onSsHandBChange(e.target.checked)}
                className="w-4 h-4 rounded border-border text-blue-600 cursor-pointer"
              />
              <span>SS {teamBName} {!ssHandB && <b className="text-rose-500">(Lupa)</b>}</span>
            </label>
          </div>
          <input
            type="text"
            placeholder="Catatan tambahan..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="w-full bg-background border border-border rounded-xl p-2 text-xs text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Pemenang Ronde: Keduanya Menggunakan Biru */}
      <div className="pt-2 space-y-2 border-t border-border/70">
        <label className="text-xs font-semibold text-muted-foreground block">Pemenang Ronde Ini:</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!isLineupReady || pendingPenaltyTeam === 'teamA'}
            onClick={() => onWinnerChange('teamA')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer text-center whitespace-normal leading-snug ${
              winner === 'teamA'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-card border-border hover:bg-muted text-foreground disabled:opacity-50'
            }`}
          >
            {teamAName}
          </button>
          <button
            type="button"
            disabled={!isLineupReady || pendingPenaltyTeam === 'teamB'}
            onClick={() => onWinnerChange('teamB')}
            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition cursor-pointer text-center whitespace-normal leading-snug ${
              winner === 'teamB'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-card border-border hover:bg-muted text-foreground disabled:opacity-50'
            }`}
          >
            {teamBName}
          </button>
        </div>

        {winner && (
          <button
            type="button"
            onClick={onSubmit}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer shadow-xs mt-2"
          >
            + Tambahkan Hasil Game {nextGameNumber}
          </button>
        )}
      </div>
    </div>
  );
}
