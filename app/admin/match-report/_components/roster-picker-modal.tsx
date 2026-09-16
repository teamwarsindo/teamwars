'use client';

import { PlayerLineupItem } from '../types';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
  isReleased?: boolean;
}

interface RosterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  roster: RosterOption[];
  lineup: PlayerLineupItem[];
  onTogglePlayer: (player: RosterOption) => void;
}

export function RosterPickerModal({
  isOpen,
  onClose,
  teamName,
  roster = [],
  lineup = [],
  onTogglePlayer,
}: RosterPickerModalProps) {
  if (!isOpen) return null;

  const selectedCount = lineup.length;
  const isFull = selectedCount === 5;

  return (
    <div className="p-4 bg-card border border-border rounded-2xl space-y-3.5 shadow-sm transition-all">
      {/* Header Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/60 pb-2.5">
        <div>
          <h4 className="text-xs font-black uppercase text-foreground">
            Kelola 5 Duelist: <span className="text-sky-600 dark:text-sky-400">{teamName}</span>
          </h4>
          <p className="text-[11px] text-muted-foreground font-medium">
            Centang duelist dari roster resmi yang bertanding di match ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
              isFull
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400'
            }`}
          >
            {selectedCount} / 5 Duelist Terpilih
          </span>
        </div>
      </div>

      {/* Grid Roster Pemain */}
      {roster.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground font-medium">
          Roster untuk tim ini belum tersedia atau belum disinkronkan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {roster.map((player, idx) => {
            const isSelected = lineup.some(
              (p) => p.ign?.toLowerCase() === player.ign.toLowerCase()
            );
            const disabled = !isSelected && isFull;

            return (
              <button
                key={`${player.ign}-${idx}`}
                type="button"
                disabled={disabled}
                onClick={() => onTogglePlayer(player)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                  isSelected
                    ? 'bg-sky-50 border-sky-400 text-sky-950 dark:bg-sky-950/40 dark:border-sky-500 dark:text-sky-100 shadow-xs'
                    : disabled
                    ? 'opacity-40 border-border/50 bg-muted/20 cursor-not-allowed text-muted-foreground'
                    : 'bg-background border-border hover:border-slate-400 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* Sisi Kiri: Status Dot + IGN */}
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      player.isReleased ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    title={player.isReleased ? 'Pemain Out / Released' : 'Pemain Aktif'}
                  />
                  <span className="truncate font-black tracking-tight">{player.ign}</span>
                </div>

                {/* Sisi Kanan: ID DL + Checkbox Visual */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {player.idDuelLinks || '-'}
                  </span>
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border transition ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500'
                        : 'border-slate-300 dark:border-slate-600 bg-background text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tombol Simpan / Tutup */}
      <div className="pt-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 font-black text-xs rounded-xl transition shadow-xs ${
            isFull
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-muted dark:text-foreground dark:border-border'
          }`}
        >
          {isFull
            ? '✅ Simpan 5 Duelist & Lanjut Atur Deck / Skill'
            : 'Tutup & Simpan Pilihan'}
        </button>
      </div>
    </div>
  );
                }
