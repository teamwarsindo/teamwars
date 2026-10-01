'use client';

import React from 'react';

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
  activeMatches: StreamerMatchDetail[];
  historyMatches: StreamerMatchDetail[];
  totalBroadcastMatches: number;
}

interface StreamerTabProps {
  streamers: StreamerData[];
  searchQuery: string;
  selectedWeek: string;
}

export default function StreamerTab({
  streamers,
  searchQuery,
  selectedWeek,
}: StreamerTabProps) {
  const filteredStreamers = streamers.filter((strm) => {
    if (searchQuery && !strm.discordName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedWeek === 'ALL') return true;

    const inActive = strm.activeMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    const inHistory = strm.historyMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    return inActive || inHistory;
  });

  return (
    <div className="space-y-6">
      {filteredStreamers.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
          Tidak ada data streamer yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStreamers.map((strm) => {
            const isLive = strm.activeMatches.length > 0;
            const weekHistory = strm.historyMatches.filter(
              (m) => selectedWeek === 'ALL' || (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
            );

            return (
              <div
                key={strm.discordId}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-blue-500/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 border border-blue-500/20">
                        {strm.discordName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-sm font-bold text-foreground">{strm.discordName}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isLive
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-muted text-muted-foreground border border-border/80'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLive ? 'bg-rose-500 animate-ping' : 'bg-muted-foreground'
                        }`}
                      />
                      {isLive ? 'Live On Air' : 'Standby'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Siaran Selesai</div>
                      <div className="text-sm font-bold text-foreground">{weekHistory.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Siaran Berjalan</div>
                      <div className="text-sm font-bold text-blue-600">{strm.activeMatches.length}</div>
                    </div>
                  </div>

                  {isLive && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">
                        Sedang Menyiarkan:
                      </div>
                      {strm.activeMatches.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-foreground"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{m.teamAName} vs {m.teamBName}</span>
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

                  {!isLive && weekHistory.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">
                        Siaran Terakhir:
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">
                            {weekHistory[0].teamAName} vs {weekHistory[0].teamBName}
                          </span>
                          <span className="text-[10px]">
                            {weekHistory[0].weekName || 'Babak Match'}
                          </span>
                        </div>
                        {weekHistory[0].streamLink && (
                          <div className="mt-1">
                            <a
                              href={weekHistory[0].streamLink}
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
                    Partisipasi: {weekHistory.length + strm.activeMatches.length} Match
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
