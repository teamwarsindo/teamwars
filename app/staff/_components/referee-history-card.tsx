'use client';

import React from 'react';
import Image from 'next/image';
import { MatchDetail } from './referee-tab';

interface RefereeHistoryCardProps {
  match: MatchDetail;
}

export function RefereeHistoryCard({ match }: RefereeHistoryCardProps) {
  const isLive = !match.isFinished;
  const scoreAVal = match.scoreA ?? 0;
  const scoreBVal = match.scoreB ?? 0;
  const aIsLeading = scoreAVal > scoreBVal;
  const bIsLeading = scoreBVal > scoreAVal;

  const stageLabel =
    match.groupName && !match.groupName.toLowerCase().includes(`week ${match.weekNumber}`)
      ? match.groupName
      : '';

  return (
    <div className="relative flex flex-col justify-center rounded-2xl border border-border/80 bg-card/95 p-3 shadow-xs backdrop-blur-md transition hover:border-primary/50">
      {/* Badge LIVE di sudut kanan atas jika pertandingan sedang berlangsung */}
      {isLive && (
        <div className="absolute right-3 top-2.5 flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-500">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
          LIVE
        </div>
      )}

      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Tim A */}
        <div className="flex min-w-0 flex-col items-center text-center">
          <div className="relative mb-1 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted/40 shadow-xs">
            {match.teamALogo ? (
              <Image
                src={match.teamALogo}
                alt={match.teamAName}
                fill
                sizes="44px"
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs font-black text-primary">
                {match.teamAName.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          <span
            className="w-full truncate px-1 text-[11px] font-black text-foreground"
            title={match.teamAName}
          >
            {match.teamAName}
          </span>
        </div>

        {/* Skor & Pekan */}
        <div className="flex shrink-0 flex-col items-center justify-center px-2">
          <div className="flex items-center gap-2 font-mono text-2xl font-black leading-none sm:text-3xl">
            <span className={aIsLeading ? 'text-primary' : 'text-foreground/90'}>
              {scoreAVal}
            </span>
            <span className="font-sans text-lg text-muted-foreground/30 sm:text-xl">—</span>
            <span className={bIsLeading ? 'text-primary' : 'text-foreground/90'}>
              {scoreBVal}
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-center font-sans">
            <div className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Week {match.weekNumber || 1}
            </div>
            {stageLabel && (
              <div
                className="max-w-[120px] truncate text-[9px] font-bold text-primary"
                title={stageLabel}
              >
                {stageLabel}
              </div>
            )}
          </div>
        </div>

        {/* Tim B */}
        <div className="flex min-w-0 flex-col items-center text-center">
          <div className="relative mb-1 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted/40 shadow-xs">
            {match.teamBLogo ? (
              <Image
                src={match.teamBLogo}
                alt={match.teamBName}
                fill
                sizes="44px"
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs font-black text-rose-500">
                {match.teamBName.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          <span
            className="w-full truncate px-1 text-[11px] font-black text-foreground"
            title={match.teamBName}
          >
            {match.teamBName}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RefereeHistoryCard;
