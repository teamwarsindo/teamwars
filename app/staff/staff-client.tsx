'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
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

  const isTokenMode = Boolean(token);
  const effectiveIsAdmin = isTokenMode ? false : isAdmin;

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'approval'>('referee');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');

  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
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

        const weeks = data.availableWeeks || [];
        setAvailableWeeks(weeks);

        // Default week ke pekan tertinggi secara kumulatif
        if (weeks.length > 0) {
          setSelectedWeek((prev) => (prev ? prev : weeks[weeks.length - 1]));
        }
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

  // Nomor pekan tertinggi sebagai acuan default
  const defaultWeek = useMemo(() => {
    if (availableWeeks.length === 0) return '';
    return availableWeeks[availableWeeks.length - 1];
  }, [availableWeeks]);

  const isFilterActive = selectedStaffId !== 'ALL' || (selectedWeek !== '' && selectedWeek !== defaultWeek);

  const handleResetFilter = () => {
    setSelectedStaffId('ALL');
    setSelectedWeek(defaultWeek);
  };

  const pendingApprovalsCount = referees.reduce((acc, ref) => {
    const list = (ref as any).payrollRequests || ref.payroll?.payrollRequests || [];
    const pendingInRef = list.filter((item: any) => item.status === 'PENDING').length;
    return acc + pendingInRef;
  }, 0);

  const staffOptions =
    activeTab === 'referee'
      ? referees.map((r) => ({ id: r.discordId, name: r.discordName }))
      : streamers.map((s) => ({ id: s.discordId, name: s.discordName }));

  return (
    <div className="w-full space-y-6">
      {/* 1. NAVIGASI TAB */}
      {!isTokenMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('referee');
                setSelectedStaffId('ALL');
              }}
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
              onClick={() => {
                setActiveTab('streamer');
                setSelectedStaffId('ALL');
              }}
              className={`rounded-full px-6 py-2 text-xs font-bold tracking-wide transition-all ${
                activeTab === 'streamer'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/30'
                  : 'border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              Streamer ({streamers.length})
            </button>

            {effectiveIsAdmin && (
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
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-xs font-bold text-blue-600">
          🔒 Panel Wasit Privat Terverifikasi
        </div>
      )}

      {/* 2. DUA DROPDOWN & TOMBOL RESET FILTER BULAT MERAH */}
      {!isTokenMode && activeTab !== 'approval' && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {/* Dropdown 1: Seleksi Staf */}
            <div className="relative flex-1">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/80 bg-background/80 px-3 pr-8 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Semua {activeTab === 'referee' ? 'Wasit' : 'Streamer'}</option>
                {staffOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-[10px]">
                ▼
              </div>
            </div>

            {/* Dropdown 2: Seleksi Pekan Kumulatif */}
            <div className="relative flex-1">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/80 bg-background/80 px-3 pr-8 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    {wk}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground text-[10px]">
                ▼
              </div>
            </div>

            {/* Tombol Reset Bulat Merah (Mengadopsi analytics-filter.tsx) */}
            <button
              type="button"
              onClick={handleResetFilter}
              disabled={!isFilterActive}
              title="Reset Filter"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
                isFilterActive
                  ? 'border-rose-500/50 bg-rose-500 text-white shadow-md shadow-rose-500/25 hover:bg-rose-600 cursor-pointer'
                  : 'border-border/60 bg-muted/40 text-muted-foreground/30 cursor-not-allowed opacity-50'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
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
          <span className="text-xs">Memuat data staf...</span>
        </div>
      ) : activeTab === 'referee' || isTokenMode ? (
        <RefereeTab
          referees={referees}
          token={token || null}
          isAdmin={effectiveIsAdmin}
          searchQuery=""
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          onRefresh={fetchRosterData}
        />
      ) : activeTab === 'streamer' ? (
        <StreamerTab
          streamers={
            selectedStaffId === 'ALL'
              ? streamers
              : streamers.filter((s) => s.discordId === selectedStaffId)
          }
          searchQuery=""
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
