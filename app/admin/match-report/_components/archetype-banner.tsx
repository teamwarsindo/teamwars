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

// 2. Banner UI Kuota 5 Deck Duplikasi
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
      className={`p-3 rounded-2xl border text-xs space-y-2 shadow-2xs transition-colors ${
        isExceeded
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}
    >
      <div className="flex items-center justify-between font-black">
        <span className="flex items-center gap-1.5">
          <span>{isExceeded ? '🚫' : '⚠️'}</span>
          <span>Duplikasi Archetype Tim ({totalViolations} / 5 batas kuota)</span>
        </span>
        {isExceeded && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
            Melebihi Kuota
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(duplicateCounts).map(([arch, cnt]) => (
          <span
            key={arch}
            className="px-2.5 py-1 rounded-lg bg-black/40 text-[11px] font-mono border border-white/10 flex items-center gap-1.5"
          >
            <span>{arch}</span>
            <b className={cnt >= 3 ? 'text-rose-400' : 'text-amber-400'}>×{cnt}</b>
          </span>
        ))}
      </div>
    </div>
  );
        }
