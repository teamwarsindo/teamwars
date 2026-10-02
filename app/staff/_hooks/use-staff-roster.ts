'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BaseStaffData, FinishedScheduleSummary } from '../_library/staff-metrics';

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

  const initialTab: 'referee' | 'streamer' =
    queryTab === 'streamer' ? 'streamer' : 'referee';

  const [activeTab, setActiveTab] = useState<'referee' | 'streamer'>(initialTab);
  const [referees, setReferees] = useState<BaseStaffData[]>([]);
  const [streamers, setStreamers] = useState<BaseStaffData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [finishedSchedules, setFinishedSchedules] = useState<FinishedScheduleSummary[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Helper untuk sinkronisasi URL query params
  const updateUrlParams = useCallback(
    (tab: 'referee' | 'streamer', staffId: string, currentList: BaseStaffData[]) => {
      const params = new URLSearchParams(searchParams.toString());

      // Set parameter tab
      params.set('tab', tab);

      // Set parameter staff berbentuk slug nama jika bukan 'ALL'
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

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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

        if (weeks.length > 0) {
          const latest = getLatestWeek(weeks);
          setSelectedWeek((prev) => (prev && weeks.includes(prev) ? prev : latest));
        }

        // Resolusi staff dari slug URL saat pertama kali data didapatkan
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
  }, [getLatestWeek, initialTab, queryStaffSlug]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const currentStaffList = activeTab === 'referee' ? referees : streamers;

  const handleTabChange = (tab: 'referee' | 'streamer') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
    const targetList = tab === 'referee' ? referees : streamers;
    updateUrlParams(tab, 'ALL', targetList);
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    updateUrlParams(activeTab, staffId, currentStaffList);
  };

  const handleResetFilter = () => {
    setSelectedStaffId('ALL');
    setSelectedWeek(getLatestWeek(availableWeeks));
    updateUrlParams(activeTab, 'ALL', currentStaffList);
  };

  const sortedStaffOptions = useMemo(() => {
    return [...currentStaffList].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [currentStaffList]);

  const activeWeekLatest = getLatestWeek(availableWeeks);
  const isFilterActive =
    selectedStaffId !== 'ALL' || (Boolean(selectedWeek) && selectedWeek !== activeWeekLatest);

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
    setSelectedWeek,
    isFilterActive,
    handleResetFilter,
    loading,
    fetchRoster,
  };
}