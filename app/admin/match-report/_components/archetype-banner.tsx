'use client';

import React, { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface ArchetypeQuotaBannerProps {
  lineup: PlayerLineupItem[];
  masterArchetypes: string[];
}

// 1. Logika Regex Boundary Extractor (Single Source of Truth)
function extractArchetypes(deckName: string, masterArchetypes: string[]): string[] {
  if (!deckName || typeof deckName !== 'string') return [];
  const normalized = deckName.trim();
  if (!normalized || normalized === '-') return [];

  const sortedMaster = [...masterArchetypes].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  let remainingText = normalized;

  for (const arch of sortedMaster) {
    if (!arch || arch.length < 2) continue;
    const escaped = arch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[\\s_\\-\\/\\[\\](),.+&:])${escaped}([\\s_\\-\\/\\[\\](),.+&:]|$)`, 'i');

    if (regex.test(remainingText)) {
      found.push(arch);
      remainingText = remainingText.replace(new RegExp(escaped, 'gi'), ' ');
    }
  }

  return found.length > 0 ? found : [normalized];
}

// 2. Banner UI Kuota 5 Deck Duplikasi (Warna Kontras & Terbaca Jelas)
export function ArchetypeQuotaBanner({ lineup, masterArchetypes }: ArchetypeQuotaBannerProps) {
  const { duplicateCounts, totalViolations, isExceeded } = useMemo(() => {
    const counts: Record<string, number> = {};

    lineup.forEach((player) => {
      const d1 = player.deck1?.archetype?.trim();
      const d2 = player.deck2?.archetype?.trim();

      if (d1 && d1 !== '-') {
        extractArchetypes(d1, masterArchetypes).forEach((a) => {
          counts[a] = (counts[a] || 0) + 1;
        });
      }
      if (d2 && d2 !== '-') {
        extractArchetypes(d2, masterArchetypes).forEach((a) => {
          counts[a] = (counts[a] || 0) + 1;
        });
      }
    });

    const dupes: Record<string, number> = {};
    let total = 0;

    Object.entries(counts).forEach(([arch, count]) => {
      if (count > 1) {
        dupes[arch] = count;
        total += count;
      }
    });

    return {
      duplicateCounts: dupes,
      totalViolations: total,
      isExceeded: total > 5,
    };
  }, [lineup, masterArchetypes]);

  if (Object.keys(duplicateCounts).length === 0) return null;

  return (
    <div
      className={`p-3 rounded-2xl border text-xs space-y-2.5 shadow-xs transition-colors ${
        isExceeded
          ? 'bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          : 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200'
      }`}
    >
      <div className="flex items-center justify-between font-bold">
        <span className="flex items-center gap-2">
          <span>{isExceeded ? '🛑' : '⚠️'}</span>
          <span>Duplikasi Archetype Tim ({totalViolations} / 5 batas kuota)</span>
        </span>
        {isExceeded && (
          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
            Melebihi Kuota
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(duplicateCounts).map(([arch, cnt]) => (
          <span
            key={arch}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
              isExceeded
                ? 'bg-rose-200/70 border-rose-300 text-rose-950 dark:bg-rose-900/50 dark:border-rose-700 dark:text-rose-100'
                : 'bg-amber-200/70 border-amber-300 text-amber-950 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-100'
            }`}
          >
            <span>{arch}</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                cnt >= 3
                  ? 'bg-rose-600 text-white'
                  : 'bg-black/10 dark:bg-white/15'
              }`}
            >
              ×{cnt}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
