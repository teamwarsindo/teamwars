'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface ArchetypeQuotaBannerProps {
  lineup: PlayerLineupItem[];
  masterArchetypes?: string[];
}

export function extractArchetypesFromMaster(
  deckName: string,
  masterArchetypes: string[] = []
): string[] {
  if (!deckName || typeof deckName !== 'string') return [];
  let text = deckName.trim();
  if (!text || text === '-') return [];

  if (!Array.isArray(masterArchetypes) || masterArchetypes.length === 0) {
    return [text];
  }

  const sortedMasters = [...masterArchetypes].sort((a, b) => b.length - a.length);
  const found: string[] = [];

  for (const master of sortedMasters) {
    const trimmedMaster = master.trim();
    if (!trimmedMaster) continue;

    const escaped = trimmedMaster.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_-])(${escaped})([^a-zA-Z0-9_-]|$)`, 'i');

    if (regex.test(text)) {
      found.push(trimmedMaster);
      text = text.replace(new RegExp(escaped, 'gi'), ' ');
    }
  }

  const remainder = text.trim();
  return found.length > 0 ? found : remainder ? [remainder] : [];
}

export function ArchetypeQuotaBanner({
  lineup = [],
  masterArchetypes = [],
}: ArchetypeQuotaBannerProps) {
  const { duplicates, totalDuplications, isExceeded } = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const player of lineup) {
      const d1 = player.deck1?.archetype?.trim();
      const d2 = player.deck2?.archetype?.trim();

      if (d1 && d1 !== '-') {
        extractArchetypesFromMaster(d1, masterArchetypes).forEach((a) => {
          counts[a] = (counts[a] || 0) + 1;
        });
      }

      if (d2 && d2 !== '-') {
        extractArchetypesFromMaster(d2, masterArchetypes).forEach((a) => {
          counts[a] = (counts[a] || 0) + 1;
        });
      }
    }

    const dupes = Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    const total = dupes.reduce((acc, [_, count]) => acc + count, 0);

    return {
      duplicates: dupes,
      totalDuplications: total,
      isExceeded: total > 5,
    };
  }, [lineup, masterArchetypes]);

  if (duplicates.length === 0) return null;

  if (isExceeded) {
    return (
      <div className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200 text-xs space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between font-black">
          <div className="flex items-center gap-2">
            <span className="text-base">🛑</span>
            <span>KUOTA DUPLIKASI TERLAMPAUI ({totalDuplications} / 5)</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black tracking-wider animate-pulse">
            OVER LIMIT
          </span>
        </div>
        <p className="text-[11px] font-medium opacity-90">
          Total deck kembar dalam tim sudah melewati batas maksimal 5. Ganti salah satu deck duelist.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {duplicates.map(([arch, count]) => (
            <span
              key={arch}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-rose-500/30 text-[11px] font-mono shadow-2xs"
            >
              <span className="font-bold text-foreground">{arch}</span>
              <span className="px-1.5 py-0.2 rounded font-black bg-rose-500/20 text-rose-700 dark:text-rose-300">
                x{count}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/70 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">
        Duplikasi: <span className="font-mono font-bold text-primary">{totalDuplications}/5</span>
      </span>
      <span className="opacity-40">•</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {duplicates.map(([arch, count]) => (
          <span
            key={arch}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border/60 text-[10px] font-medium text-foreground"
          >
            <span>{arch}</span>
            <span className="font-mono font-bold text-muted-foreground">x{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
