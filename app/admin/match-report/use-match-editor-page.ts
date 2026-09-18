'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DIVISION_MAP } from '@/app/tournament/_library';

export function useMatchEditorPage() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const isRefereeMode = Boolean(tokenParam);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | typeof DIVISION_MAP.GROUP_A | typeof DIVISION_MAP.GROUP_B>('ALL');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | ''>(1);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [editorTab, setEditorTab] = useState<'lineup' | 'game' | 'preview'>('lineup');

  // Fetch Master Schedule & Teams
  const fetchInitialData = useCallback(() => {
    Promise.all([
      fetch('/api/admin/match-report', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/tournament/teams', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ]).then(([schedRes, teamRes]) => {
      const schedList = schedRes?.schedules || [];
      if (schedList.length > 0) setSchedules(schedList);

      const apiTeams = Array.isArray(teamRes) ? teamRes : teamRes?.teams || teamRes?.data || [];
      if (apiTeams.length > 0) {
        setTeams(apiTeams);
      } else if (schedList.length > 0) {
        const map = new Map<string, any>();
        schedList.forEach((s: any) => {
          if (s.teamAName && !map.has(s.teamAName)) map.set(s.teamAName, { name: s.teamAName, slug: s.teamASlug, groupName: s.groupName, logo: s.teamALogo });
          if (s.teamBName && !map.has(s.teamBName)) map.set(s.teamBName, { name: s.teamBName, slug: s.teamBSlug, groupName: s.groupName, logo: s.teamBLogo });
        });
        setTeams(Array.from(map.values()));
      }
    });
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle Referee Mode Token
  useEffect(() => {
    if (tokenParam) {
      fetch(`/api/admin/match-report/token?token=${tokenParam}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.matchId) setSelectedMatchId(res.matchId);
        })
        .catch(console.error);
    }
  }, [tokenParam]);

  const activeMatch = useMemo(() => schedules.find((s) => s.id === selectedMatchId), [schedules, selectedMatchId]);

  const matchesInView = useMemo(() => schedules.filter((s) => {
    if (selectedGroup !== 'ALL' && s.groupName !== selectedGroup) return false;
    if (selectedWeek !== '' && Number(s.weekNumber) !== Number(selectedWeek)) return false;
    if (selectedTeam !== '' && s.teamAName !== selectedTeam && s.teamBName !== selectedTeam) return false;
    return true;
  }), [schedules, selectedGroup, selectedWeek, selectedTeam]);

  const scheduleDateInfo = useMemo(() => {
    const raw = activeMatch?.matchDate;
    if (!raw) return { day: '-', date: '-', time: '-' };
    try {
      const d = new Date(raw);
      const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(d);
      const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
      const timeStr = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(d);
      return { day, date, time: `${timeStr.replace(':', '.')} WIB` };
    } catch {
      return { day: '-', date: raw, time: '-' };
    }
  }, [activeMatch?.matchDate]);

  const resolvedMatchNumber = useMemo(() => {
    if (activeMatch?.matchNumber) return activeMatch.matchNumber;
    if (selectedMatchId) {
      const extracted = selectedMatchId.replace(/\D/g, '');
      if (extracted) return extracted;
    }
    return 1;
  }, [activeMatch?.matchNumber, selectedMatchId]);

  return {
    isRefereeMode,
    teams,
    selectedGroup,
    setSelectedGroup,
    selectedTeam,
    setSelectedTeam,
    selectedWeek,
    setSelectedWeek,
    selectedMatchId,
    setSelectedMatchId,
    editorTab,
    setEditorTab,
    activeMatch,
    matchesInView,
    scheduleDateInfo,
    resolvedMatchNumber,
  };
        }
