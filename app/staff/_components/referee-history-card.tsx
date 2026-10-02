'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Shield, ExternalLink } from 'lucide-react';
import { MatchDetail } from './referee-tab';

interface RefereeHistoryCardProps {
  match: MatchDetail;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function RefereeHistoryCard({ match }: RefereeHistoryCardProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const aIsLeading = scoreA > scoreB;
  const bIsLeading = scoreB > scoreA;

  // Ekstraksi nama hari dari matchDate
  const matchDayName = useMemo(() => {
    if (!match.matchDate) return null;
    const d = new Date(match.matchDate);
    if (isNaN(d.getTime())) return null;
    return INDONESIAN_DAYS[d.getDay()];
  }, [match.matchDate]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs transition hover:border-border flex flex-col justify-between">
      {/* 1. Baris Utama: Tim A, Skor & Hari, Tim B */}
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

        {/* Tengah: Skor & Nama Hari Pertandingan */}
        <div className="flex flex-col items-center justify-center px-2 shrink-0">
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

          {matchDayName && (
            <span className="mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
              {matchDayName}
            </span>
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
            className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1"
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
