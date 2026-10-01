'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RefereeTab, { RefereeData } from './_components/referee-tab';
import StreamerTab, { StreamerData } from './_components/streamer-tab';

interface RosterResponse {
  success: boolean;
  currentVerifiedId: string | null;
  availableWeeks: string[];
  referees: RefereeData[];
  streamers: StreamerData[];
  message?: string;
}

function StaffContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer'>('referee');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('ALL');

  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [isPending, startTransition] = useTransition();

  const fetchRosterData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = token
        ? `/api/tournament/staff/roster?token=${encodeURIComponent(token)}`
        : '/api/tournament/staff/roster';

      const res = await fetch(url, { cache: 'no-store' });
      const data: RosterResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memuat data staf.');
      }

      startTransition(() => {
        setReferees(data.referees || []);
        setStreamers(data.streamers || []);
        setAvailableWeeks(data.availableWeeks || []);
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat memuat data staf.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, [token]);

  return (
    <main className="min-h-screen bg-black text-zinc-100 pb-16">
      {/* Header Banner */}
      <section className="border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 border border-rose-800/60">
                Official Staff
              </span>
              <span className="text-xs text-zinc-500">Team Wars Tournament</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Staff & Official Management
            </h1>
            <p className="text-xs text-zinc-400 sm:text-sm">
              Direktori resmi penugasan wasit, broadcaster/streamer, dan monitoring jam terbang pertandingan.
            </p>
          </div>

          {/* Tab Selector & Controls */}
          <div className="mt-8 flex flex-col gap-4 border-t border-zinc-900/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Pill Tabs */}
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('referee')}
                className={`rounded-md px-5 py-2 text-xs font-semibold transition ${
                  activeTab === 'referee'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Wasit ({referees.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('streamer')}
                className={`rounded-md px-5 py-2 text-xs font-semibold transition ${
                  activeTab === 'streamer'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Streamer ({streamers.length})
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama staf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none sm:w-56"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Week Filter */}
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-rose-500 focus:outline-none"
              >
                <option value="ALL">Semua Pekan</option>
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    {wk}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchRosterData}
                disabled={isLoading}
                title="Perbarui Data"
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:opacity-50 transition"
              >
                <svg
                  className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body Content */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-600 border-t-transparent mb-2" />
            <span className="text-xs">Memuat direktori staf...</span>
          </div>
        ) : activeTab === 'referee' ? (
          <RefereeTab
            referees={referees}
            token={token}
            searchQuery={searchQuery}
            selectedWeek={selectedWeek}
            onRefresh={fetchRosterData}
          />
        ) : (
          <StreamerTab
            streamers={streamers}
            searchQuery={searchQuery}
            selectedWeek={selectedWeek}
          />
        )}
      </section>
    </main>
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-xs">
          Memuat halaman staf...
        </div>
      }
    >
      <StaffContent />
    </Suspense>
  );   
}      
