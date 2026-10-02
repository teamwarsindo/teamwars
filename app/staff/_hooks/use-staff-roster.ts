'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BaseStaffData, FinishedScheduleSummary } from '../_library/staff-metrics';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useStaffRoster() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Baca initial query params dari URL
  const queryTab = searchParams.get('tab');
  const queryStaffSlug = searchParams.get('staff');
  const queryWeek = searchParams.get('week');
  const queryDay = searchParams.get('day');

  const initialTab: 'referee' | 'streamer' =
    queryTab === 'streamer' ? 'streamer' : 'referee';

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer'>(initialTab);
  const [referees, setReferees] = useState<BaseStaffData[]>([]);
  const [streamers, setStreamers] = useState<BaseStaffData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>(queryDay || 'ALL');
  const [loading, setLoading] = useState(true);

  const getLatestWeek = useCallback((weeks: string[]): string => {
    if (!weeks || weeks.length === 0) return 'Week 1';
    const sorted = [...weeks].sort((a, b) => {
      const numA = Number(a.replace(/\D/g, '')) || 0;
      const numB = Number(b.replace(/\D/g, '')) || 0;
      return numB - numA;
    });
    return sorted[0];
  }, []);

  // Sinkronisasi URL query params
  const updateUrlParams = useCallback(
    (
      tab: 'referee' | 'streamer',
      staffId: string,
      week: string,
      day: string,
      currentList: BaseStaffData[]
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      params.set('tab', tab);

      if (staffId !== 'ALL') {
        const found = currentList.find((s) => s.discordId === staffId);
        if (found) {
          params.set('staff', toSlug(found.discordName));
        } else {
          params.delete('staff');
        }
      } else {
        params.delete('staff');
      }

      if (week) {
        params.set('week', week);
      } else {
        params.delete('week');
      }

      if (day && day !== 'ALL') {
        params.set('day', day);
      } else {
        params.delete('day');
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tournament/staff/roster', { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        const refs: BaseStaffData[] = json.referees || [];
        const strms: BaseStaffData[] = json.streamers || [];
        setReferees(refs);
        setStreamers(strms);
        setFinishedSchedules(json.finishedSchedules || []);

        const weeks: string[] = json.availableWeeks || [];
        setAvailableWeeks(weeks);

        const latest = getLatestWeek(weeks);
        const resolvedWeek = queryWeek && weeks.includes(queryWeek) ? queryWeek : latest;
        setSelectedWeek(resolvedWeek);

        const activeList = initialTab === 'referee' ? refs : strms;
        if (queryStaffSlug) {
          const matched = activeList.find((s) => toSlug(s.discordName) === queryStaffSlug.toLowerCase());
          if (matched) {
            setSelectedStaffId(matched.discordId);
          }
        }
      }
    } catch (err) {
      console.error('[FETCH ROSTER ERROR]:', err);
    } finally {
      setLoading(false);
    }
  }, [getLatestWeek, initialTab, queryStaffSlug, queryWeek]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const currentStaffList = activeTab === 'referee' ? referees : streamers;

  // Hitung daftar hari dinamis hanya yang ada jadwalnya di selectedWeek
  const availableDays = useMemo(() => {
    if (!selectedWeek || finishedSchedules.length === 0) return [];
    const targetWeekNum = Number(selectedWeek.replace(/\D/g, '')) || 0;

    const daysSet = new Set<string>();
    finishedSchedules.forEach((m) => {
      const matchWk = Number(m.weekNumber) || 0;
      if (matchWk === targetWeekNum && m.matchDate) {
        const dt = new Date(m.matchDate);
        if (!isNaN(dt.getTime())) {
          const dayName = DAY_NAMES[dt.getDay()];
          if (dayName) daysSet.add(dayName);
        }
      }
    });

    return Array.from(daysSet);
  }, [selectedWeek, finishedSchedules]);

  const handleTabChange = (tab: 'referee' | 'streamer') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
    setSelectedDay('ALL');
    const targetList = tab === 'referee' ? referees : streamers;
    updateUrlParams(tab, 'ALL', selectedWeek, 'ALL', targetList);
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    updateUrlParams(activeTab, staffId, selectedWeek, selectedDay, currentStaffList);
  };

  const handleSelectWeek = (wk: string) => {
    setSelectedWeek(wk);
    setSelectedDay('ALL'); // Reset hari saat pekan berganti
    updateUrlParams(activeTab, selectedStaffId, wk, 'ALL', currentStaffList);
  };

  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
    updateUrlParams(activeTab, selectedStaffId, selectedWeek, day, currentStaffList);
  };

  const handleResetFilter = () => {
    const latest = getLatestWeek(availableWeeks);
    setSelectedStaffId('ALL');
    setSelectedWeek(latest);
    setSelectedDay('ALL');
    updateUrlParams(activeTab, 'ALL', latest, 'ALL', currentStaffList);
  };

  const sortedStaffOptions = useMemo(() => {
    return [...currentStaffList].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [currentStaffList]);

  const activeWeekLatest = getLatestWeek(availableWeeks);
  const isFilterActive =
    selectedStaffId !== 'ALL' ||
    (Boolean(selectedWeek) && selectedWeek !== activeWeekLatest) ||
    selectedDay !== 'ALL';

  return {
    activeTab,
    handleTabChange,
    referees,
    streamers,
    currentStaffList,
    sortedStaffOptions,
    availableWeeks,
    availableDays,
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
