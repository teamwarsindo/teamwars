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
  metadata: {
    division?: string;
    week?: number | string;
    day?: string;
    date?: string;
    time?: string;
    referee?: string;
    streamer?: string;
    streamUrl?: string;
  };
}

export function ReportScoreboard({
  teamA,
  teamB,
  scoreA,
  scoreB,
  teamALogo,
  teamBLogo,
  metadata,
}: ReportScoreboardProps) {
  const [logoErrA, setLogoErrA] = useState(false);
  const [logoErrB, setLogoErrB] = useState(false);

  const logoA = teamALogo || teamA.logo;
  const logoB = teamBLogo || teamB.logo;

  const aIsLeading = scoreA > scoreB;
  const bIsLeading = scoreB > scoreA;

  return (
    <div className="sticky top-[104px] sm:top-[112px] z-20 -mx-1 px-1 py-1">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 p-3 shadow-lg space-y-2.5">
        
        {/* BAGIAN ATAS: Info Match 3 Kolom Rata Tengah */}
        <div className="grid grid-cols-3 gap-1.5 pb-2.5 border-b border-border/60 text-center items-center">
          {/* Kolom 1: Divisi, Tanggal, Referee */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground truncate w-full">
              {metadata.division || "Divisi Official"}
            </span>
            <span className="text-[10px] text-foreground/80 font-medium truncate w-full">
              {metadata.date || "-"}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 truncate max-w-full">
                {metadata.referee && metadata.referee.trim() ? metadata.referee : "-"}
              </span>
            </div>
          </div>

          {/* Kolom 2: Match Report, Hari, Streamer */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary truncate w-full">
              Match Report
            </span>
            <span className="text-[10px] text-foreground/80 font-medium truncate w-full">
              {metadata.day || "-"}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 truncate max-w-full">
                {metadata.streamer && metadata.streamer.trim() ? metadata.streamer : "-"}
              </span>
            </div>
          </div>

          {/* Kolom 3: Week, Waktu, Live */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground truncate w-full">
              Week {metadata.week || 1}
            </span>
            <span className="text-[10px] text-foreground/80 font-medium truncate w-full">
              {metadata.time ? `${metadata.time} WIB` : "-"}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              {metadata.streamUrl && metadata.streamUrl !== "-" ? (
                <a
                  href={metadata.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition truncate max-w-full"
                >
                  Tonton ↗
                </a>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/40 text-muted-foreground/40 border border-border/30">
                  -
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BAGIAN BAWAH: Scoreboard Utama */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Kubu Kiri */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
              {logoA && !logoErrA ? (
                <Image
                  src={logoA}
                  alt={teamA.name || 'Team A'}
                  fill
                  sizes="48px"
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
            <div className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1" title={teamA.name}>
              {teamA.name || 'Tim A'}
            </div>
          </div>

          {/* Skor Tengah */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            <div className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-black leading-none">
              <span className={aIsLeading ? 'text-primary' : 'text-foreground/90'}>{scoreA}</span>
              <span className="text-muted-foreground/30 font-sans text-lg sm:text-xl">—</span>
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
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
              {logoB && !logoErrB ? (
                <Image
                  src={logoB}
                  alt={teamB.name || 'Team B'}
                  fill
                  sizes="48px"
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
            <div className="font-black text-[11px] sm:text-xs text-foreground whitespace-nowrap truncate w-full px-1" title={teamB.name}>
              {teamB.name || 'Tim B'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
