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

  return (
    <div className="sticky top-14 z-20 -mx-1 px-1 py-1">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border p-3 sm:p-4 shadow-md">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Kubu A */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-muted/50 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
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
            <div className="font-bold text-xs sm:text-sm text-foreground leading-tight line-clamp-2 w-full break-words">
              {teamA.name || 'Tim A'}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 space-y-0.5 leading-none">
              <div>Repeat: {teamA.repeatsUsed ?? 0}/2</div>
              <div>Warning: {teamA.warningsUsed ?? 0}/2</div>
            </div>
          </div>

          {/* Skor di Tengah */}
          <div className="flex items-center justify-center px-2 shrink-0">
            <div className="flex items-center gap-1.5 font-mono text-2xl sm:text-4xl font-black">
              <span className={scoreA > scoreB ? 'text-primary' : 'text-foreground'}>{scoreA}</span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-2xl">—</span>
              <span className={scoreB > scoreA ? 'text-primary' : 'text-foreground'}>{scoreB}</span>
            </div>
          </div>

          {/* Kubu B */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-muted/50 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
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
            <div className="font-bold text-xs sm:text-sm text-foreground leading-tight line-clamp-2 w-full break-words">
              {teamB.name || 'Tim B'}
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1 space-y-0.5 leading-none">
              <div>Repeat: {teamB.repeatsUsed ?? 0}/2</div>
              <div>Warning: {teamB.warningsUsed ?? 0}/2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
                }
