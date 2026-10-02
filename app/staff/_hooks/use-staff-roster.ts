'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BaseStaffData,
  FinishedScheduleSummary,
} from '../_library/staff-metrics';

export const DAY_OPTIONS = [
  { value: 'ALL', label: 'Semua Hari' },
  { value: 'Rabu', label: 'Rabu' },
  { value: 'Kamis', label: 'Kamis' },
  { value: 'Jumat', label: 'Jumat' },
  { value: 'Sabtu', label: 'Sabtu' },
  { value: 'Minggu', label: 'Minggu' },
  { value: 'Senin', label: 'Senin' },
  { value: 'Selasa', label: 'Selasa' },
];

export function useStaffRoster() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Baca initial state dari URL Query Params
  const queryTab = searchParams.get('tab');
  const queryStaff = searchParams.get('staff');
  const queryWeek = searchParams.get('week');
  const queryDay = searchParams.get('day');

  const initialTab = queryTab === 'streamer' ? 'streamer' : 'referee';
  const initialStaff = queryStaff || 'ALL';
  const initialWeek = queryWeek || 'ALL';
  const initialDay = queryDay || 'ALL';

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer'>(initialTab);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaff);
  const [selectedWeek, setSelectedWeek] = useState<string>(initialWeek);
  const [selectedDay, setSelectedDay] = useState<string>(initialDay);

  const [referees, setReferees] = useState<BaseStaffData[]>([]);
  const [streamers, setStreamers] = useState<BaseStaffData[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. Fetch data dari API Roster
  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tournament/staff/roster', { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal mengambil data staf');
      const data = await res.json();

      setReferees(data.referees || []);
      setStreamers(data.streamers || []);
      setFinishedSchedules(data.finishedSchedules || []);
      setAvailableWeeks(data.availableWeeks || []);
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // 3. Helper sinkronisasi URL Query Parameters
  const updateUrlParams = useCallback(
    (newParams: { tab?: string; staff?: string; week?: string; day?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      const targetTab = newParams.tab !== undefined ? newParams.tab : activeTab;
      const targetStaff = newParams.staff !== undefined ? newParams.staff : selectedStaffId;
      const targetWeek = newParams.week !== undefined ? newParams.week : selectedWeek;
      const targetDay = newParams.day !== undefined ? newParams.day : selectedDay;

      if (targetTab === 'streamer') params.set('tab', 'streamer');
      else params.delete('tab');

      if (targetStaff && targetStaff !== 'ALL') params.set('staff', targetStaff);
      else params.delete('staff');

      if (targetWeek && targetWeek !== 'ALL') params.set('week', targetWeek);
      else params.delete('week');

      if (targetDay && targetDay !== 'ALL') params.set('day', targetDay);
      else params.delete('day');

      const qs = params.toString();
      router.replace(`/staff${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, activeTab, selectedStaffId, selectedWeek, selectedDay, router]
  );

  const handleTabChange = useCallback(
    (tab: 'referee' | 'streamer') => {
      setActiveTab(tab);
      setSelectedStaffId('ALL');
      updateUrlParams({ tab, staff: 'ALL' });
    },
    [updateUrlParams]
  );

  const handleSelectStaff = useCallback(
    (staffId: string) => {
      setSelectedStaffId(staffId);
      updateUrlParams({ staff: staffId });
    },
    [updateUrlParams]
  );

  const handleSelectWeek = useCallback(
    (week: string) => {
      setSelectedWeek(week);
      updateUrlParams({ week });
    },
    [updateUrlParams]
  );

  const handleSelectDay = useCallback(
    (day: string) => {
      setSelectedDay(day);
      updateUrlParams({ day });
    },
    [updateUrlParams]
  );

  const handleResetFilter = useCallback(() => {
    setSelectedStaffId('ALL');
    setSelectedWeek('ALL');
    setSelectedDay('ALL');
    updateUrlParams({ staff: 'ALL', week: 'ALL', day: 'ALL' });
  }, [updateUrlParams]);

  const currentStaffList = useMemo(() => {
    return activeTab === 'referee' ? referees : streamers;
  }, [activeTab, referees, streamers]);

  const sortedStaffOptions = useMemo(() => {
    return [...currentStaffList].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [currentStaffList]);

  const isFilterActive = selectedStaffId !== 'ALL' || selectedWeek !== 'ALL' || selectedDay !== 'ALL';

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
    setSelectedStaffId: handleSelectStaff,
    selectedWeek,
    setSelectedWeek: handleSelectWeek,
    selectedDay,
    setSelectedDay: handleSelectDay,
    isFilterActive,
    handleResetFilter,
    loading,
    fetchRoster,
  };
}
