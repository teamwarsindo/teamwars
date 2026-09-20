'use client';

import React from 'react';
import Image from 'next/image';
import { RankedPlayer, TeamRosterData } from '../_library/power-ranking';

interface PowerRankingPodiumProps {
  topPlayers: RankedPlayer[];
  teams: TeamRosterData[];
}

export function PowerRankingPodium({ topPlayers, teams }: PowerRankingPodiumProps) {
  const mvp = topPlayers[0];
  if (!mvp) return null;

  const playerTeam = teams.find(
    (t) => t.name.toLowerCase() === mvp.teamName.toLowerCase() || t.slug === mvp.teamSlug
  );

  const teamColor = playerTeam?.color || '#f59e0b';

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-6 shadow-sm backdrop-blur-md">
      <div
        className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: teamColor }}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Kiri: Gelar & Identitas Pemain */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div
            className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl border-2 p-1 bg-background/50 shadow-inner"
            style={{ borderColor: teamColor }}
          >
            {playerTeam?.logo ? (
              <Image
                src={playerTeam.logo}
                alt={mvp.teamName}
                width={64}
                height={64}
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <span className="text-2xl font-black">{mvp.playerName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="absolute -bottom-2.5 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-xs">
              MVP #1
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current MVP Leader
            </span>
            <h3 className="truncate text-lg sm:text-xl font-black text-foreground">
              {mvp.playerName}
            </h3>
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {mvp.teamName}
            </span>
          </div>
        </div>

        {/* Kanan: Ringkasan Performa Tanpa Font Monospace */}
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:min-w-[280px]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/40 p-2 text-center border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Score</span>
            <span className="text-sm sm:text-base font-black text-foreground">{mvp.powerScore}</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/40 p-2 text-center border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Winrate</span>
            <span className="text-sm sm:text-base font-black text-emerald-500">{mvp.winRate}%</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/40 p-2 text-center border border-border/40">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Record</span>
            <span className="text-sm sm:text-base font-black text-foreground">{mvp.wins}W - {mvp.losses}L</span>
          </div>
        </div>
      </div>
    </div>
  );
}
