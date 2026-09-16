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
    <div className="p-4 bg-muted/20 border border-border rounded-2xl space-y-3.5 transition-all">
      {/* Header Modal Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/50 pb-2.5">
        <div>
          <h4 className="text-xs font-black uppercase text-foreground">
            Kelola 5 Duelist: <span className="text-primary">{teamName}</span>
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Centang duelist dari roster resmi yang bertanding di match ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border ${
              isFull
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            {selectedCount} / 5 Duelist Terpilih
          </span>
        </div>
      </div>

      {/* Grid Roster Pemain */}
      {roster.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
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
                    ? 'bg-primary/15 border-primary text-primary shadow-xs'
                    : disabled
                    ? 'opacity-40 border-border/40 bg-muted/10 cursor-not-allowed text-muted-foreground'
                    : 'bg-background border-border hover:border-primary/50 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      player.isReleased ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    title={player.isReleased ? 'Pemain Out / Released' : 'Pemain Aktif'}
                  />
                  <span className="truncate">{player.ign}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {player.idDuelLinks || '-'}
                  </span>
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-muted-foreground/30 text-transparent'
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

      {/* Tombol Konfirmasi */}
      <div className="pt-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 font-black text-xs rounded-xl transition shadow-sm ${
            isFull
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
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
