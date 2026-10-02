'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BaseStaffData, FinishedScheduleSummary } from '../_library/staff-metrics';
import { ORDERED_DAYS } from '@/app/tournament/_library/constants';

export interface FilterTeamOption {
  id: string;
  name: string;
}

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
  const queryTeam = searchParams.get('team');

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
  const [selectedTeam, setSelectedTeam] = useState<string>(queryTeam || 'ALL');
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
      team: string,
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

      if (team && team !== 'ALL') {
        params.set('team', team);
      } else {
        params.delete('team');
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

  // Ekstraksi opsi tim unik (A-Z) dari jadwal tanding
  const teamOptions = useMemo<FilterTeamOption[]>(() => {
    const teamsSet = new Set<string>();
    finishedSchedules.forEach((item: any) => {
      if (item.teamAName) teamsSet.add(item.teamAName);
      if (item.teamBName) teamsSet.add(item.teamBName);
    });

    return Array.from(teamsSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ id: name, name }));
  }, [finishedSchedules]);

  // Daftar 7 hari penuh mandiri (Senin s/d Minggu)
  const availableDays = useMemo(() => [...ORDERED_DAYS], []);

  const handleTabChange = (tab: 'referee' | 'streamer') => {
    setActiveTab(tab);
    setSelectedStaffId('ALL');
    const targetList = tab === 'referee' ? referees : streamers;
    updateUrlParams(tab, 'ALL', selectedWeek, selectedDay, selectedTeam, targetList);
  };

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    // Jika staf spesifik dipilih, bersihkan filter tim dari query URL
    const targetTeam = staffId !== 'ALL' ? 'ALL' : selectedTeam;
    if (staffId !== 'ALL') setSelectedTeam('ALL');
    updateUrlParams(activeTab, staffId, selectedWeek, selectedDay, targetTeam, currentStaffList);
  };

  const handleSelectWeek = (wk: string) => {
    setSelectedWeek(wk);
    updateUrlParams(activeTab, selectedStaffId, wk, selectedDay, selectedTeam, currentStaffList);
  };

  const handleSelectDay = (day: string) => {
    setSelectedDay(day);
    updateUrlParams(activeTab, selectedStaffId, selectedWeek, day, selectedTeam, currentStaffList);
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    updateUrlParams(activeTab, selectedStaffId, selectedWeek, selectedDay, teamId, currentStaffList);
  };

  const handleResetFilter = () => {
    const latest = getLatestWeek(availableWeeks);
    setSelectedStaffId('ALL');
    setSelectedWeek(latest);
    setSelectedDay('ALL');
    setSelectedTeam('ALL');
    updateUrlParams(activeTab, 'ALL', latest, 'ALL', 'ALL', currentStaffList);
  };

  const sortedStaffOptions = useMemo(() => {
    return [...currentStaffList].sort((a, b) => a.discordName.localeCompare(b.discordName));
  }, [currentStaffList]);

  const activeWeekLatest = getLatestWeek(availableWeeks);
  const isFilterActive =
    selectedStaffId !== 'ALL' ||
    (Boolean(selectedWeek) && selectedWeek !== activeWeekLatest) ||
    selectedDay !== 'ALL' ||
    selectedTeam !== 'ALL';

  return {
    activeTab,
    handleTabChange,
    referees,
    streamers,
    currentStaffList,
    sortedStaffOptions,
    availableWeeks,
    availableDays,
    teamOptions,
    selectedTeam,
    setSelectedTeam: handleSelectTeam,
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
