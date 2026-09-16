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
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground shrink-0 pr-1">
        Pilih Duelist:
      </span>
      {players.map((p, idx) => {
        const isActive = idx === selectedIndex;
        const hasD1 = Boolean(p.deck1?.archetype?.trim());
        const hasD2 = Boolean(p.deck2?.archetype?.trim());
        const hasS1 = Boolean(p.deck1?.skill?.trim());
        const hasS2 = Boolean(p.deck2?.skill?.trim());

        const isSkillMissing = (hasD1 && !hasS1) || (hasD2 && !hasS2);
        const isFullyReady = hasD1 && hasD2 && hasS1 && hasS2;

        return (
          <button
            key={`${p.ign}-${idx}`}
            type="button"
            onClick={() => onSelectIndex(idx)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition border cursor-pointer ${
              isActive
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-card border-border hover:border-primary/50 text-foreground'
            }`}
          >
            <span className="opacity-70 text-[10px]">#{idx + 1}</span>
            <span>{p.ign}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
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
  );
}
