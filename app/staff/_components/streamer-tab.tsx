'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Video, Crown } from 'lucide-react';
import {
  calculateStreamerCumulativeMetrics,
  FinishedScheduleSummary,
} from '../_library/staff-metrics';
import RefereeHistoryCard from './referee-history-card';
import { MatchDetail } from './referee-tab';

export interface StreamerMatchDetail extends MatchDetail {}

export interface StreamerData {
  discordId: string;
  discordName: string;
  avatar?: string;
  activeMatches: StreamerMatchDetail[];
  historyMatches: StreamerMatchDetail[];
  totalBroadcastMatches: number;
}

interface StreamerTabProps {
  streamers: StreamerData[];
  selectedStaffId?: string;
  selectedWeek: string;
  finishedSchedules?: FinishedScheduleSummary[];
}

export default function StreamerTab({
  streamers,
  selectedStaffId = 'ALL',
  selectedWeek,
  finishedSchedules = [],
}: StreamerTabProps) {
  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 1 : num;
  }, [selectedWeek]);

  // Kalkulasi performa kumulatif via helper terpusat
  const { statsList, baselineRatio, baselineCoverage } = useMemo(() => {
    return calculateStreamerCumulativeMetrics(
      streamers,
      selectedWeekNum,
      finishedSchedules
    );
  }, [streamers, selectedWeekNum, finishedSchedules]);

  const topStreamer = useMemo(() => {
    if (selectedStaffId !== 'ALL') {
      return statsList.find((s) => s.discordId === selectedStaffId) || statsList[0] || null;
    }
    return statsList[0] || null;
  }, [statsList, selectedStaffId]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. KARTU PODIUM ATAS (BEST STREAMER / OVERVIEW) */}
      {topStreamer && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/60 bg-gradient-to-br from-blue-500/15 via-card to-card p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-blue-500 overflow-hidden bg-background flex items-center justify-center shadow-inner">
                  {topStreamer.avatar ? (
                    <Image
                      src={topStreamer.avatar}
                      alt={topStreamer.discordName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover rounded-full"
                      unoptimized
                    />
                  ) : (
                    <Video className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-xs">
                  <Crown className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>

              {/* Identitas: Nama Streamer di atas, Sub-label di bawahnya */}
              <div className="min-w-0 flex flex-col justify-center">
                <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-none">
                  {topStreamer.discordName}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1 leading-none">
                  {selectedStaffId === 'ALL' ? 'BEST STREAMER' : 'Overview'}
                </span>
              </div>
            </div>

            {/* Favorite Team Badge */}
            <div className="shrink-0 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mb-1 text-blue-600 dark:text-blue-400">
                FAVORITE TEAM
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap leading-none text-blue-700 dark:text-blue-300">
                {topStreamer.favTeam}
              </span>
            </div>
          </div>

          {/* Baris 3 Kolom Metrik: MATCH | RATIO | COVERAGE */}
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/40 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">MATCH</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{topStreamer.matchCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">RATIO</span>
              <span
                className={`text-xs font-bold mt-0.5 ${
                  topStreamer.ratioNum >= baselineRatio ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {topStreamer.ratioNum}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">COVERAGE</span>
              <span
                className={`text-xs font-bold mt-0.5 ${
                  topStreamer.coverageNum >= baselineCoverage ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {topStreamer.coverageNum}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. KONTEN BAWAH: TABEL KLASEMEN (MULAI DARI RANK 2) ATAU HISTORY MATCH */}
      {selectedStaffId === 'ALL' ? (
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
          <table className="w-full border-collapse text-left table-fixed">
            <thead className="bg-muted/65 border-b border-border text-[10px] uppercase tracking-wider text-foreground/75 font-bold">
              <tr>
                <th className="py-2.5 pl-4 pr-1 text-center w-12 sm:w-14">RANK</th>
                <th className="py-2.5 pl-2 sm:pl-3 pr-2 text-left">STREAMER</th>
                <th className="py-2.5 px-0.5 text-center w-16 sm:w-20">MATCH</th>
                <th className="py-2.5 px-0.5 text-center w-16 sm:w-20">RATIO</th>
                <th className="py-2.5 pr-4 pl-0.5 text-center w-20 sm:w-24">COVERAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {statsList.slice(1).map((strm, idx) => (
                <tr key={strm.discordId} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pl-4 pr-1 text-center font-bold font-mono text-xs">{idx + 2}</td>
                  <td className="py-2.5 pl-2 sm:pl-3 pr-2 font-bold truncate flex items-center gap-2">
                    <div className="relative h-5 w-5 rounded-full overflow-hidden border border-border/80 shrink-0">
                      {strm.avatar ? (
                        <Image src={strm.avatar} alt={strm.discordName} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-blue-500/20 text-[9px] flex items-center justify-center font-bold">
                          {strm.discordName.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="truncate">{strm.discordName}</span>
                  </td>
                  <td className="py-2.5 px-0.5 text-center font-semibold">{strm.matchCount}</td>
                  <td
                    className={`py-2.5 px-0.5 text-center font-bold ${
                      strm.ratioNum >= baselineRatio ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {strm.ratioNum}
                  </td>
                  <td
                    className={`py-2.5 pr-4 pl-0.5 text-center font-bold ${
                      strm.coverageNum >= baselineCoverage ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {strm.coverageNum}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* DAFTAR HISTORY MATCH SCOREBOARD */
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            HISTORY MATCH ({topStreamer?.cumulativeHistory.length || 0})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(topStreamer?.cumulativeHistory || []).map((m: any) => (
              <RefereeHistoryCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  ); 
}
