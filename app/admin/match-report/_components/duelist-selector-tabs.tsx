'use client';

import { PlayerLineupItem } from '../types';

interface DuelistSelectorTabsProps {
  players: PlayerLineupItem[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
}

export function DuelistSelectorTabs({
  players,
  selectedIndex,
  onSelectIndex,
}: DuelistSelectorTabsProps) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Pilih Duelist (5 Pemain)
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          Aktif: #{selectedIndex + 1}
        </span>
      </div>

      {/* Grid 6 Kolom: Baris 1 (col-span-2 x 3 = 6), Baris 2 (col-span-3 x 2 = 6) */}
      <div className="grid grid-cols-6 gap-1.5 w-full">
        {players.map((p, idx) => {
          const isActive = idx === selectedIndex;
          const hasD1 = Boolean(p.deck1?.archetype?.trim());
          const hasD2 = Boolean(p.deck2?.archetype?.trim());
          const hasS1 = Boolean(p.deck1?.skill?.trim());
          const hasS2 = Boolean(p.deck2?.skill?.trim());

          const isSkillMissing = (hasD1 && !hasS1) || (hasD2 && !hasS2);
          const isFullyReady = hasD1 && hasD2 && hasS1 && hasS2;

          // 3 pemain pertama membagi rata baris atas, 2 pemain terakhir membagi rata baris bawah
          const colSpan = idx < 3 ? 'col-span-2' : 'col-span-3';

          return (
            <button
              key={`${p.ign}-${idx}`}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`${colSpan} flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer min-w-0 shadow-2xs ${
                isActive
                  ? 'bg-foreground text-background border-foreground font-black'
                  : 'bg-card border-border hover:border-primary/50 text-foreground hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate pr-1">
                <span className="opacity-60 text-[10px] shrink-0 font-mono">#{idx + 1}</span>
                <span className="truncate text-[11px] leading-tight">{p.ign || `Player ${idx + 1}`}</span>
              </div>

              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSkillMissing
                    ? 'bg-rose-500 animate-pulse'
                    : isFullyReady
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
