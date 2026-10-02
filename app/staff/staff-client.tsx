'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import RefereeTab, { RefereeData } from './_components/referee-tab';
import StreamerTab, { StreamerData } from './_components/streamer-tab';
import AdminApprovalTab from './_components/admin-approval-tab';
import { FinishedScheduleSummary } from './_library/staff-metrics';

interface StaffClientProps {
  initialToken?: string | null;
  isAdmin?: boolean;
}

export default function StaffClient({ initialToken = null, isAdmin = false }: StaffClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'approval'>('referee');
  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 1');
  const [loading, setLoading] = useState(true);

  // Ambil data staf dari API roster
  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const url = initialToken
        ? `/api/tournament/staff/roster?token=${encodeURIComponent(initialToken)}`
        : '/api/tournament/staff/roster';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        setReferees(json.referees || []);
        setStreamers(json.streamers || []);
        setFinishedSchedules(json.finishedSchedules || []);

        const weeks: string[] = json.availableWeeks || [];
        setAvailableWeeks(weeks);

        if (weeks.length > 0) {
          setSelectedWeek((prev) => (weeks.includes(prev) ? prev : weeks[weeks.length - 1]));
        }
      }
    } catch (err) {
      console.error('[FETCH ROSTER ERROR]:', err);
    } finally {
      setLoading(false);
    }
  }, [initialToken]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Reset filter staf ketika beralih tab
  const handleTabChange = (tab: 'referee' | 'streamer' | 'approval') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
  };

  // Reset seluruh filter
  const handleResetFilter = () => {
    setSelectedStaffId('ALL');
    if (availableWeeks.length > 0) {
      setSelectedWeek(availableWeeks[availableWeeks.length - 1]);
    }
  };

  // Urutkan opsi dropdown staf secara alfabetis (A-Z)
  const sortedStaffOptions = useMemo(() => {
    const list = activeTab === 'referee' ? referees : streamers;
    return [...list].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [activeTab, referees, streamers]);

  const isFilterActive =
    selectedStaffId !== 'ALL' ||
    (availableWeeks.length > 0 && selectedWeek !== availableWeeks[availableWeeks.length - 1]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-2 sm:px-4">
      {/* 1. NAVIGASI PILL-TAB */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          onClick={() => handleTabChange('referee')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'referee'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Referee ({referees.length})
        </button>

        <button
          onClick={() => handleTabChange('streamer')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'streamer'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Streamer ({streamers.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabChange('approval')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
              activeTab === 'approval'
                ? 'bg-blue-600 text-white shadow-blue-500/25'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Payroll Approval
          </button>
        )}
      </div>

      {/* 2. BAR KONTROL FILTER (Kecuali tab admin approval) */}
      {activeTab !== 'approval' && (
        <div className="rounded-2xl border border-border/80 bg-card/90 p-2.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            {/* Dropdown Filter Staf Terurut Alfabetis */}
            <div className="flex-1">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
              >
                <option value="ALL">
                  Semua {activeTab === 'referee' ? 'Referee' : 'Streamer'} ({sortedStaffOptions.length})
                </option>
                {sortedStaffOptions.map((st) => (
                  <option key={st.discordId} value={st.discordId}>
                    {st.discordName}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Filter Pekan */}
            <div className="w-32 sm:w-40">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
              >
                {availableWeeks.map((wk) => (
                  <option key={wk} value={wk}>
                    {wk}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Reset Filter */}
            {isFilterActive && (
              <button
                onClick={handleResetFilter}
                title="Reset Filter"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs transition hover:bg-rose-600 active:scale-95 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. KONTEN TAB UTAMA */}
      {loading ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs font-bold text-primary animate-pulse shadow-xs">
          Memuat data staf...
        </div>
      ) : activeTab === 'referee' ? (
        <RefereeTab
          referees={referees}
          token={initialToken}
          isAdmin={isAdmin}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          finishedSchedules={finishedSchedules}
          onRefresh={fetchRoster}
        />
      ) : activeTab === 'streamer' ? (
        <StreamerTab
          streamers={streamers}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          finishedSchedules={finishedSchedules}
        />
      ) : (
        <AdminApprovalTab onActionSuccess={fetchRoster} />
      )}
    </div>
  );    
}   
