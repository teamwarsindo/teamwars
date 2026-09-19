'use client';

import React, { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface ArchetypeQuotaBannerProps {
  lineup: PlayerLineupItem[];
  masterArchetypes: string[];
}

export function extractArchetypes(deckName: string, masterArchetypes: string[]): string[] {
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
          : 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
      }`}
    >
      {/* Header Banner: Judul Ringkas & Label Kanan */}
      <div className="flex items-center justify-between font-bold">
        <div className="flex items-center gap-2">
          <span>{isExceeded ? '🔴' : '🟢'}</span>
          <span>Duplikasi Archetype Tim</span>
        </div>
        
        {/* Label Status Ringkas */}
        <span
          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white shadow-xs ${
            isExceeded ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {totalViolations}/5 {isExceeded ? 'Over' : 'Aman'}
        </span>
      </div>

      {/* Chip Archetype */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(duplicateCounts).map(([arch, cnt]) => (
          <span
            key={arch}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
              isExceeded
                ? 'bg-rose-200/70 border-rose-300 text-rose-950 dark:bg-rose-900/50 dark:border-rose-700 dark:text-rose-100'
                : 'bg-emerald-200/70 border-emerald-300 text-emerald-950 dark:bg-emerald-900/50 dark:border-emerald-700 dark:text-emerald-100'
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
