'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ReportScoreboardProps {
  teamA: any;
  teamB: any;
  scoreA: number;
  scoreB: number;
  teamALogo?: string;
  teamBLogo?: string;
}

export function ReportScoreboard({
  teamA,
  teamB,
  scoreA,
  scoreB,
  teamALogo,
  teamBLogo,
}: ReportScoreboardProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const logoA = teamALogo || teamA.logo;
  const logoB = teamBLogo || teamB.logo;

  const aIsLeading = scoreA > scoreB;
  const bIsLeading = scoreB > scoreA;

  return (
    <div className="sticky top-[60px] sm:top-[68px] z-20 -mx-1 px-1 py-1">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 p-3 shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Kubu Kiri */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-13 sm:w-13 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
              {logoA && !logoErrA ? (
                <Image
                  src={logoA}
                  alt={teamA.name || 'Team A'}
                  fill
                  sizes="52px"
                  className="object-contain p-1"
                  onError={() => setLogoErrA(true)}
                  unoptimized
                />
              ) : (
                <span className="font-black text-xs text-primary">
                  {teamA.name?.slice(0, 3).toUpperCase() || 'TMA'}
                </span>
              )}
            </div>
            {/* Nama Tim 1 Baris Penuh */}
            <div className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1" title={teamA.name}>
              {teamA.name || 'Tim A'}
            </div>
          </div>

          {/* Area Tengah: Skor & Metrik */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            <div className="flex items-center gap-2 font-mono text-2xl sm:text-4xl font-black leading-none">
              <span className={aIsLeading ? 'text-primary' : 'text-foreground/90'}>{scoreA}</span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-2xl">—</span>
              <span className={bIsLeading ? 'text-primary' : 'text-foreground/90'}>{scoreB}</span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-[9px] text-muted-foreground w-full max-w-[120px]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-center font-mono">
                <span className="font-bold text-foreground/80">{teamA.repeatsUsed ?? 0}/2</span>
                <span className="text-muted-foreground/50 uppercase text-[8px] font-sans">Repeat</span>
                <span className="font-bold text-foreground/80">{teamB.repeatsUsed ?? 0}/2</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-center font-mono">
                <span className="font-bold text-foreground/80">{teamA.warningsUsed ?? 0}/2</span>
                <span className="text-muted-foreground/50 uppercase text-[8px] font-sans">Warn</span>
                <span className="font-bold text-foreground/80">{teamB.warningsUsed ?? 0}/2</span>
              </div>
            </div>
          </div>

          {/* Kubu Kanan */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-13 sm:w-13 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
              {logoB && !logoErrB ? (
                <Image
                  src={logoB}
                  alt={teamB.name || 'Team B'}
                  fill
                  sizes="52px"
                  className="object-contain p-1"
                  onError={() => setLogoErrB(true)}
                  unoptimized
                />
              ) : (
                <span className="font-black text-xs text-rose-500">
                  {teamB.name?.slice(0, 3).toUpperCase() || 'TMB'}
                </span>
              )}
            </div>
            {/* Nama Tim 1 Baris Penuh */}
            <div className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1" title={teamB.name}>
              {teamB.name || 'Tim B'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
