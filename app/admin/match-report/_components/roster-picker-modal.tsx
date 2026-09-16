'use client';

import React, { useState } from 'react';
import { PlayerLineupItem } from '../types';

export interface RosterOption {
  ign: string;
  idDuelLinks?: string;
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
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeSelected = lineup.filter(
    (p) => p && typeof p.ign === 'string' && p.ign.trim() !== '' && p.ign.trim() !== '-'
  );
  const selectedCount = activeSelected.length;

  const handleItemClick = (player: RosterOption) => {
    setWarningMsg(null);
    const cleanIgn = (player.ign || '').trim().toLowerCase();

    const existing = lineup.find(
      (p) => (p?.ign || '').trim().toLowerCase() === cleanIgn && cleanIgn !== ''
    );

    // KASUS UNCHECK
    if (existing) {
      const hasPlayed = (Number(existing.totalWins) || 0) > 0 || (Number(existing.totalLosses) || 0) > 0;
      if (hasPlayed) {
        setWarningMsg(
          `⚠️ ${player.ign} sudah bermain (${existing.totalWins}W-${existing.totalLosses}L). Hapus log game terkait dulu jika ingin menggantinya.`
        );
        return;
      }
      onTogglePlayer(player);
      return;
    }

    // KASUS CHECK BARU
    if (selectedCount >= 5) {
      setWarningMsg('⚠️ Lineup sudah 5 pemain. Uncheck pemain yang belum main terlebih dahulu.');
      return;
    }

    onTogglePlayer(player);
  };

  return (
    <div className="p-4 bg-card border border-border rounded-2xl space-y-3 shadow-sm animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black uppercase text-foreground tracking-wide truncate">
            {teamName}
          </h4>
          <p className="text-[11px] text-muted-foreground truncate">
            Pilih 5 duelist yang bertanding.
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            selectedCount === 5
              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
          }`}
        >
          {selectedCount}/5
        </span>
      </div>

      {warningMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-medium leading-tight flex items-start gap-1.5">
          <span className="shrink-0">⚠️</span>
          <span>{warningMsg}</span>
        </div>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {roster.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Tidak ada data roster.
          </p>
        ) : (
          roster.map((player) => {
            const isSelected = activeSelected.some(
              (p) => (p.ign || '').trim().toLowerCase() === (player.ign || '').trim().toLowerCase()
            );

            return (
              <div
                key={player.ign}
                onClick={() => handleItemClick(player)}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  isSelected
                    ? 'bg-primary/5 border-primary/40 text-foreground'
                    : 'bg-muted/20 border-border hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-bold text-foreground truncate">{player.ign}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono opacity-60">
                    {player.idDuelLinks || '-'}
                  </span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded border-border text-primary pointer-events-none"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition cursor-pointer"
      >
        Selesai Memilih
      </button>
    </div>
  );
}
