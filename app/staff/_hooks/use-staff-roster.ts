'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseStaffData, FinishedScheduleSummary } from '../_library/staff-metrics';

export function useStaffRoster(initialToken: string | null = null) {
  const [activeTab, setActiveTab] = useState<'referee' | 'streamer' | 'approval'>('referee');
  const [referees, setReferees] = useState<BaseStaffData[]>([]);
  const [streamers, setStreamers] = useState<BaseStaffData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Helper mencari pekan dengan angka numerik tertinggi
  const getLatestWeek = useCallback((weeks: string[]): string => {
    if (!weeks || weeks.length === 0) return 'Week 1';
    const sorted = [...weeks].sort((a, b) => {
      const numA = Number(a.replace(/\D/g, '')) || 0;
      const numB = Number(b.replace(/\D/g, '')) || 0;
      return numB - numA;
    });
    return sorted[0];
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

        // Langsung tetapkan pekan aktif terbaru jika belum dipilih
        if (weeks.length > 0) {
          const latest = getLatestWeek(weeks);
          setSelectedWeek((prev) => (prev && weeks.includes(prev) ? prev : latest));
        }
      }
    } catch (err) {
      console.error('[FETCH ROSTER ERROR]:', err);
    } finally {
      setLoading(false);
    }
  }, [initialToken, getLatestWeek]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleTabChange = (tab: 'referee' | 'streamer' | 'approval') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
  };

  const handleResetFilter = () => {
    setSelectedStaffId('ALL');
    setSelectedWeek(getLatestWeek(availableWeeks));
  };

  const currentStaffList = activeTab === 'referee' ? referees : streamers;
  const sortedStaffOptions = useMemo(() => {
    return [...currentStaffList].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [currentStaffList]);

  const activeWeekLatest = getLatestWeek(availableWeeks);
  const isFilterActive = selectedStaffId !== 'ALL' || (Boolean(selectedWeek) && selectedWeek !== activeWeekLatest);

  return {
    activeTab,
    handleTabChange,
    referees,
    streamers,
    currentStaffList,
    sortedStaffOptions,
    availableWeeks,
    finishedSchedules,
    selectedStaffId,
    setSelectedStaffId,
    selectedWeek,
    setSelectedWeek,
    isFilterActive,
    handleResetFilter,
    loading,
    fetchRoster,
  };
}