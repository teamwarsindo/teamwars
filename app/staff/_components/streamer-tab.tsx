'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';

export interface StreamerMatchDetail {
  id: string;
  matchDate?: string;
  weekNumber?: number;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  scoreA?: number;
  scoreB?: number;
  isFinished?: boolean;
  streamLink?: string | null;
}

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
}

export default function StreamerTab({
  streamers,
  selectedStaffId = 'ALL',
  selectedWeek,
}: StreamerTabProps) {
  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? Infinity : num;
  }, [selectedWeek]);

  // Kalkulasi kumulatif siaran (<= selectedWeek)
  const computedStreamers = useMemo(() => {
    return streamers.map((strm) => {
      const filteredHistory = strm.historyMatches.filter((m) => {
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        return wNum <= selectedWeekNum;
      });

      const filteredActive = strm.activeMatches.filter((m) => {
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        return wNum <= selectedWeekNum;
      });

      return {
        ...strm,
        cumulativeHistory: filteredHistory,
        cumulativeActive: filteredActive,
        totalBroadcastMatches: filteredHistory.length,
      };
    });
  }, [streamers, selectedWeekNum]);

  const displayedStreamers = useMemo(() => {
    if (selectedStaffId === 'ALL') return computedStreamers;
    return computedStreamers.filter((s) => s.discordId === selectedStaffId);
  }, [computedStreamers, selectedStaffId]);

  const totalBroadcastAll = useMemo(() => {
    return computedStreamers.reduce((sum, s) => sum + s.totalBroadcastMatches, 0);
  }, [computedStreamers]);

  return (
    <div className="w-full space-y-6">
      {/* 1. VISUALISASI DISTRIBUSI SIARAN STREAMER */}
      {selectedStaffId === 'ALL' && computedStreamers.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              🎥 Distribusi Jam Terbang Streamer
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              Total {totalBroadcastAll} Siaran Selesai
            </span>
          </div>

          <div className="space-y-3">
            {computedStreamers.map((strm) => {
              const count = strm.totalBroadcastMatches;
              const percentage =
                totalBroadcastAll > 0 ? Math.round((count / totalBroadcastAll) * 100) : 0;

              return (
                <div key={strm.discordId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{strm.discordName}</span>
                    <span className="font-mono text-muted-foreground">
                      {count} Siaran ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ROSTER GRID STREAMER */}
      {displayedStreamers.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
          Tidak ada data streamer yang cocok dengan kriteria pemilihan.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedStreamers.map((strm) => {
            const isLive = strm.cumulativeActive.length > 0;
            const avatarUrl =
              strm.avatar ||
              `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
                strm.discordName || strm.discordId
              )}`;

            return (
              <div
                key={strm.discordId}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md transition hover:border-blue-500/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted/40">
                        <Image
                          src={avatarUrl}
                          alt={strm.discordName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="text-sm font-bold text-foreground">{strm.discordName}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isLive
                          ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600'
                          : 'border border-border/80 bg-muted text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLive ? 'animate-ping bg-rose-500' : 'bg-muted-foreground'
                        }`}
                      />
                      {isLive ? 'Live On Air' : 'Standby'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Siaran Selesai</div>
                      <div className="text-sm font-bold text-foreground">{strm.totalBroadcastMatches}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Siaran Berjalan</div>
                      <div className="text-sm font-bold text-blue-600">{strm.cumulativeActive.length}</div>
                    </div>
                  </div>

                  {isLive && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">
                        Sedang Menyiarkan:
                      </div>
                      {strm.cumulativeActive.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-foreground"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>
                              {m.teamAName} vs {m.teamBName}
                            </span>
                          </div>
                          {m.streamLink && (
                            <div className="mt-1.5">
                              <a
                                href={m.streamLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                              >
                                🔴 Buka Siaran Langsung ↗
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isLive && strm.cumulativeHistory.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">
                        Siaran Terakhir:
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">
                            {strm.cumulativeHistory[0].teamAName} vs {strm.cumulativeHistory[0].teamBName}
                          </span>
                          <span className="text-[10px]">
                            {strm.cumulativeHistory[0].weekName || 'Babak Match'}
                          </span>
                        </div>
                        {strm.cumulativeHistory[0].streamLink && (
                          <div className="mt-1">
                            <a
                              href={strm.cumulativeHistory[0].streamLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-blue-600 hover:underline"
                            >
                              Tonton Rekaman Siaran ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-border/60 pt-3 text-right">
                  <span className="text-[10px] text-muted-foreground">
                    Partisipasi: {strm.cumulativeHistory.length + strm.cumulativeActive.length} Match
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
