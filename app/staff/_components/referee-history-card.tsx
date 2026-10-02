'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import { MatchDetail } from './referee-tab';

interface RefereeHistoryCardProps {
  match: MatchDetail;
}

export default function RefereeHistoryCard({ match }: RefereeHistoryCardProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const aIsLeading = scoreA > scoreB;
  const bIsLeading = scoreB > scoreA;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Sisi Kiri: Tim A */}
        <div className="flex flex-col items-center text-center min-w-0">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-xs">
            {match.teamALogo && !logoErrA ? (
              <Image
                src={match.teamALogo}
                alt={match.teamAName || 'Team A'}
                fill
                sizes="48px"
                className="object-cover rounded-full"
                onError={() => setLogoErrA(true)}
                unoptimized
              />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>
          <span
            className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1"
            title={match.teamAName}
          >
            {match.teamAName || 'Tim A'}
          </span>
        </div>

        {/* Tengah: Skor Sejajar Ketinggian Logo */}
        <div className="flex items-center justify-center px-2 shrink-0">
          <div className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-black leading-none">
            <span className={aIsLeading ? 'text-primary' : 'text-foreground/90'}>
              {scoreA}
            </span>
            <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl">
              —
            </span>
            <span className={bIsLeading ? 'text-primary' : 'text-foreground/90'}>
              {scoreB}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Tim B */}
        <div className="flex flex-col items-center text-center min-w-0">
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1 shadow-xs">
            {match.teamBLogo && !logoErrB ? (
              <Image
                src={match.teamBLogo}
                alt={match.teamBName || 'Team B'}
                fill
                sizes="48px"
                className="object-cover rounded-full"
                onError={() => setLogoErrB(true)}
                unoptimized
              />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>
          <span
            className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1"
            title={match.teamBName}
          >
            {match.teamBName || 'Tim B'}
          </span>
        </div>
      </div>
    </div>
  );
}
