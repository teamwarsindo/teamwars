'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import RefereeTab, { RefereeData } from './_components/referee-tab';
import StreamerTab, { StreamerData } from './_components/streamer-tab';
import AdminApprovalTab from './_components/admin-approval-tab';

export interface StaffClientProps {
  isAdmin: boolean;
}

interface RosterResponse {
  success: boolean;
  currentVerifiedId: string | null;
  availableWeeks: string[];
  referees: RefereeData[];
  streamers: StreamerData[];
  message?: string;
}

export default function StaffClientContent({ isAdmin }: StaffClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'approval'>('referee');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('ALL');

  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [, startTransition] = useTransition();

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

  // Hitung jumlah total pengajuan honor yang masih pending untuk badge admin
  const pendingApprovalsCount = referees.reduce((acc, ref) => {
    const list = (ref as any).payrollRequests || ref.payroll?.payrollRequests || [];
    const pendingInRef = list.filter((item: any) => item.status === 'PENDING').length;
    return acc + pendingInRef;
  }, 0);

  return (
    <div className="w-full space-y-6">
      {/* 1. PILL TAB SWITCHER RESMI TWI */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('referee')}
          className={`rounded-full px-6 py-2 text-xs font-bold tracking-wide transition-all ${
            activeTab === 'referee'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          Wasit ({referees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('streamer')}
          className={`rounded-full px-6 py-2 text-xs font-bold tracking-wide transition-all ${
            activeTab === 'streamer'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          Streamer ({streamers.length})
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('approval')}
            className={`flex items-center gap-1.5 rounded-full px-6 py-2 text-xs font-bold tracking-wide transition-all ${
              activeTab === 'approval'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span>Persetujuan Klaim</span>
            {pendingApprovalsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 2. CONTROL BAR BERDESAIN MELENGKUNG TWI */}
      {activeTab !== 'approval' && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Input Pencarian */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari profil staf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background/80 py-2 pl-9 pr-8 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Pekan & Refresh Button */}
            <div className="flex items-center gap-2">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium text-foreground focus:border-blue-500 focus:outline-none sm:w-auto"
              >
                <option value="ALL">Semua Pekan</option>
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    {wk}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchRosterData}
                disabled={isLoading}
                title="Sinkronisasi Data"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 transition"
              >
                <svg
                  className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
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
      )}

      {/* 3. PESAN ERROR */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
          {errorMsg}
        </div>
      )}

      {/* 4. KONTEN TAB UTAMA */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
          <span className="text-xs">Memuat data staf TWI...</span>
        </div>
      ) : activeTab === 'referee' ? (
        <RefereeTab
          referees={referees}
          token={token}
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          selectedWeek={selectedWeek}
          onRefresh={fetchRosterData}
        />
      ) : activeTab === 'streamer' ? (
        <StreamerTab
          streamers={streamers}
          searchQuery={searchQuery}
          selectedWeek={selectedWeek}
        />
      ) : (
        <AdminApprovalTab
          referees={referees}
          onRefresh={fetchRosterData}
        />
      )}
    </div>
  );
}
