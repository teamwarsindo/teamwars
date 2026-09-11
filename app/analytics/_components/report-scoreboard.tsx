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
    matchNumber?: number | string;
    division?: string;
    week?: number | string;
    rawDate?: string;
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

  // Format Waktu WIB (Asia/Jakarta)
  const formatSchedule = (raw?: string) => {
    if (!raw) return { day: "-", fullDate: "-", time: "-" };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        timeZone: "Asia/Jakarta",
      }).format(d);

      const fullDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(d);

      const time = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(d);

      return { day, fullDate, time: `${time} WIB` };
    } catch {
      return { day: "-", fullDate: raw, time: "-" };
    }
  };

  const schedule = formatSchedule(metadata.rawDate);
  const hasStreamer = Boolean(metadata.streamer && metadata.streamer.trim() !== "" && metadata.streamer !== "-");
  const hasLiveUrl = Boolean(metadata.streamUrl && metadata.streamUrl.trim() !== "" && metadata.streamUrl !== "-");

  return (
    <div className="sticky top-0 z-30 -mx-1 px-1 pt-0 pb-1.5">
      <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 p-3 shadow-md space-y-2.5">
        
        {/* Header Metadata: 3 Kolom Sejajar */}
        <div className="grid grid-cols-3 gap-1 pb-2 border-b border-border/60 text-center items-center">
          
          {/* Kolom 1: Match • Hari • Referee */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground truncate w-full">
              Match {metadata.matchNumber || 1}
            </span>
            <span className="text-[10px] text-foreground/90 font-medium truncate w-full">
              {schedule.day}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 truncate max-w-full">
                ⚖️ {metadata.referee && metadata.referee.trim() ? metadata.referee : "-"}
              </span>
            </div>
          </div>

          {/* Kolom 2: Divisi • Tanggal Lengkap • Live Streaming / Share Screen */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-foreground truncate w-full">
              {metadata.division || "Divisi Official"}
            </span>
            <span className="text-[10px] text-foreground/90 font-medium truncate w-full">
              {schedule.fullDate}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              {hasStreamer && hasLiveUrl ? (
                <a
                  href={metadata.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition truncate max-w-full"
                >
                  🔴 Live Streaming ↗
                </a>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 truncate max-w-full">
                  Share Screen
                </span>
              )}
            </div>
          </div>

          {/* Kolom 3: Week • Waktu • Streamer / Private */}
          <div className="flex flex-col items-center justify-center space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground truncate w-full">
              Week {metadata.week || 1}
            </span>
            <span className="text-[10px] font-mono text-foreground/90 font-medium truncate w-full">
              {schedule.time}
            </span>
            <div className="pt-0.5 w-full flex justify-center">
              {hasStreamer ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-muted/60 text-muted-foreground border border-border/40 truncate max-w-full">
                  🎙️ {metadata.streamer}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-muted/40 text-muted-foreground/70 border border-border/30 truncate max-w-full">
                  Private
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Scoreboard Inti */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-0.5">
          {/* Kubu Kiri */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
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
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/40 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 mb-1">
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
            
