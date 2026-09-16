"use client";

import { useMemo } from "react";
import { PlayerLineupItem } from "../types";
import { extractArchetypesFromMaster } from "./archetype-extractor";

interface ArchetypeQuotaBannerProps {
  teamName: string;
  lineup: PlayerLineupItem[];
  masterArchetypes?: string[];
  maxAllowedPerArchetype?: number;
}

export function ArchetypeQuotaBanner({
  teamName,
  lineup = [],
  masterArchetypes = [],
  maxAllowedPerArchetype = 2,
}: ArchetypeQuotaBannerProps) {
  const overQuotaItems = useMemo(() => {
    const counts: Record<string, number> = {};

    lineup.forEach((player) => {
      const d1Name = player?.deck1?.archetype || "";
      const d2Name = player?.deck2?.archetype || "";

      const archetypesD1 = extractArchetypesFromMaster(d1Name, masterArchetypes);
      const archetypesD2 = extractArchetypesFromMaster(d2Name, masterArchetypes);

      // Gabungkan archetype dari kedua deck milik pemain
      const playerAllArchetypes = [...archetypesD1, ...archetypesD2];

      playerAllArchetypes.forEach((arch) => {
        const key = arch.trim();
        if (!key || key === "-") return;
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > maxAllowedPerArchetype)
      .map(([name, count]) => ({ name, count }));
  }, [lineup, masterArchetypes, maxAllowedPerArchetype]);

  if (overQuotaItems.length === 0) return null;

  return (
    <div className="p-3.5 rounded-xl bg-red-100 border border-red-400 dark:bg-red-950/70 dark:border-red-600/70 space-y-2 text-xs shadow-xs">
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px] tracking-wide">
          PERINGATAN KUOTA
        </span>
        <span className="font-bold text-red-950 dark:text-red-100">
          Tim {teamName} melebihi batas kuota archetype (Maks. {maxAllowedPerArchetype}x per tim):
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {overQuotaItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-200 border border-red-500 dark:bg-red-900/60 dark:border-red-500/50 text-red-950 dark:text-red-100 font-bold"
          >
            <span>{item.name}</span>
            <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white text-[10px] font-black">
              {item.count}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
