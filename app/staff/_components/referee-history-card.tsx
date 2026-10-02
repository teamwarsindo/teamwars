'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, ExternalLink } from 'lucide-react';
import { MatchDetail } from './referee-tab';
import { formatMatchDateTimeCompact } from '../_library/staff-metrics';

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

  const timeCompact = formatMatchDateTimeCompact(match.matchDate);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition hover:border-border flex flex-col justify-between">
      {/* 1. Baris Utama: Tim A, Skor & Waktu Compact, Tim B */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
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
            className="font-black text-[10.5px] sm:text-xs text-foreground line-clamp-2 leading-tight break-words w-full px-0.5"
            title={match.teamAName}
          >
            {match.teamAName || 'Tim A'}
          </span>
        </div>

        {/* Tengah: Skor & Waktu Pertandingan Ringkas (Jumat, 25 Sep 26 / 20.00 WIB) */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-2xl sm:text-3xl font-black leading-none">
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

          {timeCompact && (
            <div className="mt-1 flex flex-col items-center text-center leading-tight">
              <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                {timeCompact.dateLine}
              </span>
              <span className="text-[8.5px] font-bold text-muted-foreground/80 whitespace-nowrap">
                {timeCompact.timeLine}
              </span>
            </div>
          )}
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
            className="font-black text-[10.5px] sm:text-xs text-foreground line-clamp-2 leading-tight break-words w-full px-0.5"
            title={match.teamBName}
          >
            {match.teamBName || 'Tim B'}
          </span>
        </div>
      </div>

      {/* 2. Baris Bawah: Status Siaran / Sharescreen */}
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-center text-[10.5px]">
        {match.streamLink ? (
          <a
            href={match.streamLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-rose-500 hover:text-rose-600 transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Rekaman Pertandingan</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <div className="inline-flex items-center gap-1.5 font-medium text-muted-foreground/60">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span>Sharescreen</span>
          </div>
        )}
      </div>
    </div>
  );
}
