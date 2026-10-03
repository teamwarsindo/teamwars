'use client';

import React, { useMemo } from 'react';
import {
  BaseStaffData,
  FinishedScheduleSummary,
  MatchDetail,
  calculateStaffCumulativeMetrics,
} from '../_library/staff-metrics';
import StaffPodiumCard from './staff-podium-card';
import StaffLeaderboardTable from './staff-leaderboard-table';
import StaffHistoryCard from './staff-history-card';

interface StaffTabViewProps {
  role: 'referee' | 'streamer';
  staffList: BaseStaffData[];
  selectedStaffId: string;
  selectedWeek: string;
  selectedDay?: string;
  selectedTeam?: string;
  finishedSchedules?: FinishedScheduleSummary[];
  isAdmin?: boolean;
  onRefresh?: () => void;
}

function getMatchDayName(matchDate?: string): string {
  if (!matchDate) return '';
  const dt = new Date(matchDate);
  if (isNaN(dt.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(dt);
}

export default function StaffTabView({
  role,
  staffList,
  selectedStaffId,
  selectedWeek,
  selectedDay = 'ALL',
  selectedTeam = 'ALL',
  finishedSchedules = [],
  isAdmin = false,
}: StaffTabViewProps) {
  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 1 : num;
  }, [selectedWeek]);

  // 1. Saring riwayat jadwal tuntas turnamen untuk acuan baseline kalkulator
  const filteredFinishedSchedules = useMemo(() => {
    let result = finishedSchedules;

    if (selectedDay !== 'ALL') {
      result = result.filter((schedule) => {
        const scheduleDate =
          (schedule as unknown as { matchDate?: string }).matchDate ||
          (schedule as unknown as { date?: string }).date;
        const d = getMatchDayName(scheduleDate);
        return d.toLowerCase() === selectedDay.toLowerCase();
      });
    }

    if (selectedTeam !== 'ALL') {
      const cleanTeam = selectedTeam.toLowerCase().trim();
      result = result.filter((schedule) => {
        const tA = (schedule as unknown as { teamAName?: string }).teamAName?.toLowerCase().trim() || '';
        const tB = (schedule as unknown as { teamBName?: string }).teamBName?.toLowerCase().trim() || '';
        return tA === cleanTeam || tB === cleanTeam;
      });
    }

    return result;
  }, [finishedSchedules, selectedDay, selectedTeam]);

  // 2. Saring riwayat match setiap staf sebelum diteruskan ke fungsi kalkulasi metrik
  const filteredStaffList = useMemo(() => {
    if (selectedDay === 'ALL' && selectedTeam === 'ALL') {
      return staffList;
    }

    const cleanTeam = selectedTeam !== 'ALL' ? selectedTeam.toLowerCase().trim() : null;

    return staffList.map((staff) => {
      const filterMatches = (matches: MatchDetail[] = []) =>
        matches.filter((m) => {
          if (selectedDay !== 'ALL') {
            const mDate = m.matchDate || (m as unknown as { date?: string }).date;
            const d = getMatchDayName(mDate);
            if (d.toLowerCase() !== selectedDay.toLowerCase()) return false;
          }

          if (cleanTeam) {
            const tA = (m.teamAName || '').toLowerCase().trim();
            const tB = (m.teamBName || '').toLowerCase().trim();
            if (tA !== cleanTeam && tB !== cleanTeam) return false;
          }

          return true;
        });

      const newHistory = filterMatches(staff.historyMatches);
      const newActive = filterMatches(staff.activeMatches);

      return {
        ...staff,
        historyMatches: newHistory,
        activeMatches: newActive,
        totalFinishedMatches: newHistory.length,
        totalBroadcastMatches: newHistory.length,
      };
    });
  }, [staffList, selectedDay, selectedTeam]);

  // 3. Kalkulasi metrik kumulatif berdasarkan daftar staf yang sudah terfilter
  const { statsList, baselineGpm } = useMemo(() => {
    return calculateStaffCumulativeMetrics(
      filteredStaffList,
      selectedWeekNum,
      filteredFinishedSchedules,
      role
    );
  }, [filteredStaffList, selectedWeekNum, filteredFinishedSchedules, role]);

  const topStaff = useMemo(() => {
    if (selectedStaffId !== 'ALL') {
      return statsList.find((s) => s.discordId === selectedStaffId) || statsList[0] || null;
    }
    return statsList[0] || null;
  }, [statsList, selectedStaffId]);

  const groupedMatches = useMemo(() => {
    if (!topStaff) return [];
    const map = new Map<number, MatchDetail[]>();

    topStaff.cumulativeHistory.forEach((m) => {
      if (selectedDay !== 'ALL') {
        const matchDate = m.matchDate || (m as unknown as { date?: string }).date;
        const d = getMatchDayName(matchDate);
        if (d.toLowerCase() !== selectedDay.toLowerCase()) return;
      }

      if (selectedTeam !== 'ALL') {
        const cleanTeam = selectedTeam.toLowerCase().trim();
        const tA = (m.teamAName || '').toLowerCase().trim();
        const tB = (m.teamBName || '').toLowerCase().trim();
        if (tA !== cleanTeam && tB !== cleanTeam) return;
      }

      const w = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
      const list = map.get(w) || [];
      list.push(m);
      map.set(w, list);
    });

    const groups: { weekNumber: number; matches: MatchDetail[] }[] = [];
    Array.from(map.keys())
      .sort((a, b) => b - a)
      .forEach((w) => {
        groups.push({ weekNumber: w, matches: map.get(w)! });
      });

    return groups;
  }, [topStaff, selectedDay, selectedTeam]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {topStaff && (
        <StaffPodiumCard
          topStaff={topStaff}
          role={role}
          selectedStaffId={selectedStaffId}
          baselineGpm={baselineGpm}
          isAdmin={isAdmin}
        />
      )}

      {selectedStaffId === 'ALL' ? (
        <StaffLeaderboardTable
          statsList={statsList}
          role={role}
          baselineGpm={baselineGpm}
        />
      ) : (
        <div className="space-y-4">
          {groupedMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 p-8 text-center text-xs font-semibold text-muted-foreground">
              Tidak ada riwayat pertandingan yang cocok dengan filter yang dipilih.
            </div>
          ) : (
            groupedMatches.map((group) => (
              <div key={group.weekNumber} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Week {group.weekNumber}
                  </span>
                  <div className="h-[1px] flex-1 bg-border/80" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.matches.map((m) => (
                    <StaffHistoryCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
          }
      
