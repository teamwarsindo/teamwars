'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import RefereeTab, { RefereeData } from './_components/referee-tab';
import StreamerTab, { StreamerData } from './_components/streamer-tab';
import AdminApprovalTab from './_components/admin-approval-tab';
import { FinishedScheduleSummary } from './_library/staff-metrics';

interface StaffClientProps {
  initialToken?: string | null;
  isAdmin?: boolean;
}

export default function StaffClient({ initialToken = null, isAdmin = false }: StaffClientProps) {
  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'approval'>('referee');
  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 1');
  const [loading, setLoading] = useState(true);

  // State untuk mengontrol dropdown kustom
  const [openDropdown, setOpenDropdown] = useState<'staff' | 'week' | null>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown popover saat klik di luar kontainer
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleTabChange = (tab: 'referee' | 'streamer' | 'approval') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
    setOpenDropdown(null);
  };

  const handleResetFilter = () => {
    setSelectedStaffId('ALL');
    if (availableWeeks.length > 0) {
      setSelectedWeek(availableWeeks[availableWeeks.length - 1]);
    }
    setOpenDropdown(null);
  };

  // Opsi staf terurut abjad A-Z
  const sortedStaffOptions = useMemo(() => {
    const list = activeTab === 'referee' ? referees : streamers;
    return [...list].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [activeTab, referees, streamers]);

  const selectedStaffName = useMemo(() => {
    if (selectedStaffId === 'ALL') return 'Semua';
    const found = sortedStaffOptions.find((s) => s.discordId === selectedStaffId);
    return found ? found.discordName : 'Semua';
  }, [selectedStaffId, sortedStaffOptions]);

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

      {/* 2. BAR KONTROL FILTER (CUSTOM TAILWIND DROPDOWN) */}
      {activeTab !== 'approval' && (
        <div
          ref={filterContainerRef}
          className="relative rounded-2xl border border-border/80 bg-card p-3 shadow-xs"
        >
          <div className="grid grid-cols-[1fr_120px_auto] sm:grid-cols-[1fr_140px_auto] gap-2 items-center">
            {/* Custom Dropdown Staf */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'staff' ? null : 'staff'))}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs hover:border-primary/50 transition cursor-pointer"
              >
                <span className="truncate">{selectedStaffName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
              </button>

              {openDropdown === 'staff' && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffId('ALL');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedStaffId === 'ALL'
                        ? 'bg-primary/10 text-primary font-black'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    Semua
                  </button>
                  {sortedStaffOptions.map((st) => (
                    <button
                      key={st.discordId}
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(st.discordId);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition truncate cursor-pointer ${
                        selectedStaffId === st.discordId
                          ? 'bg-primary/10 text-primary font-black'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {st.discordName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Dropdown Pekan */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'week' ? null : 'week'))}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs hover:border-primary/50 transition cursor-pointer"
              >
                <span className="truncate">{selectedWeek}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
              </button>

              {openDropdown === 'week' && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
                  {availableWeeks.map((wk) => (
                    <button
                      key={wk}
                      type="button"
                      onClick={() => {
                        setSelectedWeek(wk);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedWeek === wk
                          ? 'bg-primary/10 text-primary font-black'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {wk}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Reset Filter */}
            <button
              onClick={handleResetFilter}
              disabled={!isFilterActive}
              title="Reset Filter"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition active:scale-95 cursor-pointer ${
                isFilterActive
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
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
        <AdminApprovalTab referees={referees} onRefresh={fetchRoster} />
      )}
    </div>
  );
}
