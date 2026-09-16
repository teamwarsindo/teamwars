'use client';

import React, { useMemo } from 'react';
import { PlayerLineupItem, RosterOption } from '../types';

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  roster: RosterOption[];
  lineup: PlayerLineupItem[];
  modalWarn: string | null;
  onClearWarn: () => void;
  onTogglePlayer: (player: RosterOption) => void;
}

export function RosterModal({
  isOpen,
  onClose,
  teamName,
  roster,
  lineup,
  modalWarn,
  onClearWarn,
  onTogglePlayer,
}: RosterModalProps) {
  const sortedRoster = useMemo(() => {
    const active = roster.filter((p) => !p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    const out = roster.filter((p) => p.isReleased).sort((a, b) => a.ign.localeCompare(b.ign));
    return [...active, ...out];
  }, [roster]);

  if (!isOpen) return null;

  const selectedCount = lineup.filter((p) => Boolean(p.ign?.trim())).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <h3 className="text-xs font-black uppercase text-foreground">Roster {teamName}</h3>
            <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Roster Aktif
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Keluar / Transfer
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-lg hover:bg-muted"
          >
            ✕ Tutup
          </button>
        </div>

        {modalWarn && (
          <div className="p-2.5 rounded-xl border-2 border-rose-500/50 bg-rose-500/15 text-rose-950 dark:text-rose-200 text-xs font-bold flex items-center justify-between">
            <span>⚠️ {modalWarn}</span>
            <button type="button" onClick={onClearWarn} className="text-[11px] font-black opacity-80 hover:opacity-100 cursor-pointer">✕</button>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto space-y-1 p-1">
          {sortedRoster.map((p, idx) => {
            const isSelected = lineup.some((s) => s.ign?.toLowerCase() === p.ign.toLowerCase());
            return (
              <button
                key={`${p.ign}-${idx}`}
                type="button"
                onClick={() => onTogglePlayer(p)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.isReleased ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <span className="truncate">{p.ign}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.idDuelLinks || '-'}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Terpilih: <b className="text-foreground">{selectedCount} / 5</b></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
