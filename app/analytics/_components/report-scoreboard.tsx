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
    <div className="sticky top-[52px] sm:top-[58px] z-20 -mx-1 px-1 py-1">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 p-3 sm:p-4 shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Kubu Kiri: Logo & Nama Tim */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1.5 shadow-2xs">
              {logoA && !logoErrA ? (
                <Image
                  src={logoA}
                  alt={teamA.name || 'Team A'}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  onError={() => setLogoErrA(true)}
                  unoptimized
                />
              ) : (
                <span className="font-black text-xs sm:text-sm text-primary">
                  {teamA.name?.slice(0, 3).toUpperCase() || 'TMA'}
                </span>
              )}
            </div>
            <div className="font-black text-xs sm:text-sm text-foreground leading-tight line-clamp-2 w-full break-words">
              {teamA.name || 'Tim A'}
            </div>
          </div>

          {/* Area Tengah: Skor & Komparasi Metrik */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            {/* Skor Utama */}
            <div className="flex items-center gap-2 font-mono text-2xl sm:text-4xl font-black leading-none">
              <span className={aIsLeading ? 'text-primary' : 'text-foreground/90'}>{scoreA}</span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-2xl">—</span>
              <span className={bIsLeading ? 'text-primary' : 'text-foreground/90'}>{scoreB}</span>
            </div>

            {/* Komparasi Repeat & Warning Head-to-Head */}
            <div className="mt-2 space-y-0.5 text-[9px] sm:text-[10px] text-muted-foreground w-full max-w-[130px]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center font-mono font-medium">
                <span className="font-bold text-foreground/80">{teamA.repeatsUsed ?? 0}/2</span>
                <span className="text-muted-foreground/50 uppercase tracking-widest text-[8px] font-sans">Repeat</span>
                <span className="font-bold text-foreground/80">{teamB.repeatsUsed ?? 0}/2</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center font-mono font-medium">
                <span className="font-bold text-foreground/80">{teamA.warningsUsed ?? 0}/2</span>
                <span className="text-muted-foreground/50 uppercase tracking-widest text-[8px] font-sans">Warn</span>
                <span className="font-bold text-foreground/80">{teamB.warningsUsed ?? 0}/2</span>
              </div>
            </div>
          </div>

          {/* Kubu Kanan: Logo & Nama Tim */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1.5 shadow-2xs">
              {logoB && !logoErrB ? (
                <Image
                  src={logoB}
                  alt={teamB.name || 'Team B'}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  onError={() => setLogoErrB(true)}
                  unoptimized
                />
              ) : (
                <span className="font-black text-xs sm:text-sm text-rose-500">
                  {teamB.name?.slice(0, 3).toUpperCase() || 'TMB'}
                </span>
              )}
            </div>
            <div className="font-black text-xs sm:text-sm text-foreground leading-tight line-clamp-2 w-full break-words">
              {teamB.name || 'Tim B'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
