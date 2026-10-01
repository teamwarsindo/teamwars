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
  // Filter streamer berdasarkan query nama dan pekan yang dipilih
  const filteredStreamers = streamers.filter((strm) => {
    const matchName = strm.discordName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchName) return false;

    if (selectedWeek === 'ALL') return true;

    const hasInActive = strm.activeMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    const hasInHistory = strm.historyMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    return hasInActive || hasInHistory;
  });

  return (
    <div className="space-y-6">
      {filteredStreamers.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          Tidak ada data streamer yang sesuai dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStreamers.map((strm) => {
            const isLive = strm.activeMatches.length > 0;
            const totalParticipation = strm.historyMatches.length + strm.activeMatches.length;

            return (
              <div
                key={strm.discordId}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg transition hover:border-zinc-700"
              >
                <div>
                  {/* Profil Streamer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-950 border border-indigo-800/80 text-sm font-bold text-indigo-300">
                        {strm.discordName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{strm.discordName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{strm.discordId}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isLive
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLive ? 'bg-rose-500 animate-ping' : 'bg-zinc-500'
                        }`}
                      />
                      {isLive ? 'Live On Air' : 'Standby'}
                    </span>
                  </div>

                  {/* Statistik Jam Terbang Siaran */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Total Siaran Selesai</div>
                      <div className="text-base font-bold text-zinc-200">
                        {strm.totalBroadcastMatches}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Siaran Berjalan</div>
                      <div className="text-base font-bold text-indigo-400">
                        {strm.activeMatches.length}
                      </div>
                    </div>
                  </div>

                  {/* Match Aktif yang Sedang Disiarkan */}
                  {isLive && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">
                        Sedang Menyiarkan:
                      </div>
                      <div className="space-y-1.5">
                        {strm.activeMatches.map((m) => (
                          <div
                            key={m.id}
                            className="rounded border border-indigo-900/50 bg-indigo-950/20 p-2 text-xs text-indigo-200"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>{m.teamAName} vs {m.teamBName}</span>
                              <span className="font-mono text-[10px] text-indigo-400">{m.id}</span>
                            </div>
                            {m.streamLink && (
                              <div className="mt-1">
                                <a
                                  href={m.streamLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline"
                                >
                                  <span>🔴 Tonton Siaran Langsung</span>
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Riwayat Siaran Terakhir */}
                  {!isLive && strm.historyMatches.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-medium text-zinc-500 uppercase">
                        Siaran Terakhir:
                      </div>
                      <div className="rounded border border-zinc-900 bg-zinc-900/30 p-2 text-xs text-zinc-400">
                        <div className="flex justify-between">
                          <span>
                            {strm.historyMatches[0].teamAName} vs {strm.historyMatches[0].teamBName}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {strm.historyMatches[0].weekName || 'Babak Match'}
                          </span>
                        </div>
                        {strm.historyMatches[0].streamLink && (
                          <div className="mt-1">
                            <a
                              href={strm.historyMatches[0].streamLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline"
                            >
                              Tonton Rekaman (VOD) ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Kartu */}
                <div className="mt-4 border-t border-zinc-900 pt-3 text-right">
                  <span className="text-[10px] text-zinc-500">
                    Total Partisipasi: {totalParticipation} Pertandingan
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
