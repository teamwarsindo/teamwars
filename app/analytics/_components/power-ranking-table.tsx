'use client';

import React from 'react';
import Image from 'next/image';
import { RankedPlayer, TeamRosterData } from '../_library/power-ranking';

interface PowerRankingTableProps {
  players: RankedPlayer[];
  teams: TeamRosterData[];
}

export function PowerRankingTable({ players, teams }: PowerRankingTableProps) {
  const teamMap = React.useMemo(() => {
    const map = new Map<string, TeamRosterData>();
    teams.forEach((t) => {
      map.set(t.name.toLowerCase(), t);
      if (t.slug) map.set(t.slug.toLowerCase(), t);
    });
    return map;
  }, [teams]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-card/40 shadow-xs">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-black uppercase text-muted-foreground">
            <th className="w-12 py-3 px-3 text-center">Rank</th>
            <th className="py-3 px-3">Player</th>
            <th className="py-3 px-3 text-center">Deck Utama</th>
            <th className="py-3 px-3 text-center">W - L</th>
            <th className="py-3 px-3 text-center">Winrate</th>
            <th className="py-3 px-3 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {players.map((p) => {
            const team = teamMap.get(p.teamName.toLowerCase()) || teamMap.get(p.teamSlug.toLowerCase());
            const diff = (p.previousRank || p.rank) - p.rank;

            return (
              <tr key={`${p.playerName}-${p.teamName}`} className="hover:bg-muted/20 transition-colors">
                {/* Kolom Rank Ramping: Simbol + Angka Rank */}
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    {diff > 0 && <span className="text-[10px] font-black text-emerald-500">▲</span>}
                    {diff < 0 && <span className="text-[10px] font-black text-rose-500">▼</span>}
                    {diff === 0 && <span className="text-[10px] text-muted-foreground/40">•</span>}
                    <span className="font-black text-foreground">{p.rank}</span>
                  </div>
                </td>

                {/* Kolom Player + Logo Tim */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {team?.logo && (
                      <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/40">
                        <Image src={team.logo} alt={p.teamName} fill sizes="20px" className="object-contain" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-bold text-foreground">{p.playerName}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{p.teamName}</span>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3 text-center font-medium text-muted-foreground whitespace-nowrap">
                  {p.favDeck || '-'}
                </td>

                <td className="py-3 px-3 text-center font-bold text-foreground whitespace-nowrap">
                  {p.wins} - {p.losses}
                </td>

                <td className="py-3 px-3 text-center font-bold text-emerald-500 whitespace-nowrap">
                  {p.winRate}%
                </td>

                <td className="py-3 px-3 text-right font-black text-primary whitespace-nowrap">
                  {p.powerScore}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
