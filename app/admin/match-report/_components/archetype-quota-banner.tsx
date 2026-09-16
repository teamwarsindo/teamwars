'use client';

import { useMemo } from 'react';
import { PlayerLineupItem } from '../types';

interface ArchetypeQuotaBannerProps {
  lineup: PlayerLineupItem[];
  masterArchetypes?: string[];
}

/**
 * Ekstraksi archetype dari string deck name.
 * Mengutamakan pencocokan nama archetype terpanjang terlebih dahulu.
 */
function extractArchetypes(deckName: string, masterList: string[] = []): string[] {
  if (!deckName || deckName === '-') return [];
  const normalized = deckName.toLowerCase().trim();

  // Jika masterList belum tersedia, fallback ke nama deck itu sendiri
  if (!masterList.length) return [deckName.trim()];

  // Sort dari kata terpanjang untuk mencegah parsial match (misal 'Phantom Knights' sebelum 'Knight')
  const sortedMasters = [...masterList].sort((a, b) => b.length - a.length);
  const matched: string[] = [];

  for (const arch of sortedMasters) {
    const archLower = arch.toLowerCase();
    if (normalized.includes(archLower)) {
      matched.push(arch);
    }
  }

  return matched.length > 0 ? matched : [deckName.trim()];
}

export function ArchetypeQuotaBanner({
  lineup = [],
  masterArchetypes = [],
}: ArchetypeQuotaBannerProps) {
  // Hitung total kemunculan archetype di 10 slot deck tim
  const { duplicates, totalDuplications, isExceeded } = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const player of lineup) {
      const d1 = player.deck1?.archetype?.trim();
      const d2 = player.deck2?.archetype?.trim();

      if (d1 && d1 !== '-') {
        const archs = extractArchetypes(d1, masterArchetypes);
        for (const a of archs) {
          counts[a] = (counts[a] || 0) + 1;
        }
      }

      if (d2 && d2 !== '-') {
        const archs = extractArchetypes(d2, masterArchetypes);
        for (const a of archs) {
          counts[a] = (counts[a] || 0) + 1;
        }
      }
    }

    // Hanya ambil archetype yang muncul >= 2 kali di satu tim
    const dupes = Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    // Total duplikasi kumulatif tim
    const total = dupes.reduce((acc, [_, count]) => acc + count, 0);

    return {
      duplicates: dupes,
      totalDuplications: total,
      isExceeded: total > 5, // Aturan batas toleransi: maksimal 5
    };
  }, [lineup, masterArchetypes]);

  // Jika tidak ada duplikasi sama sekali, banner tidak perlu muncul
  if (duplicates.length === 0) return null;

  return (
    <div
      className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
        isExceeded
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
      }`}
    >
      <div className="flex items-center justify-between font-black tracking-wide">
        <div className="flex items-center gap-2">
          <span>{isExceeded ? '🛑' : '⚠️'}</span>
          <span>Duplikasi Archetype Tim ({totalDuplications} / 5)</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
            isExceeded
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}
        >
          {isExceeded ? 'Melebihi Kuota 5' : 'Dalam Batas Aman'}
        </span>
      </div>

      <p className="text-[11px] opacity-80">
        {isExceeded
          ? 'Total duplikasi kumulatif archetype tim melebihi kuota 5. Mohon sesuaikan pilihan deck.'
          : 'Daftar archetype yang digunakan lebih dari satu kali dalam tim:'}
      </p>

      {/* Daftar pill archetype yang terduplikasi */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {duplicates.map(([arch, count]) => (
          <span
            key={arch}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono"
          >
            <span className="font-semibold text-white/90">{arch}</span>
            <span
              className={`px-1.5 py-0.2 rounded font-black ${
                count > 2 ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10 text-white'
              }`}
            >
              x{count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
