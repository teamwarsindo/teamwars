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
  finishedSchedules?: FinishedScheduleSummary[];
  onRefresh?: () => void;
}

export default function StaffTabView({
  role,
  staffList,
  selectedStaffId,
  selectedWeek,
  finishedSchedules = [],
}: StaffTabViewProps) {
  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 1 : num;
  }, [selectedWeek]);

  const { statsList, baselineGpm } = useMemo(() => {
    return calculateStaffCumulativeMetrics(staffList, selectedWeekNum, finishedSchedules, role);
  }, [staffList, selectedWeekNum, finishedSchedules, role]);

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
  }, [topStaff]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {topStaff && (
        <StaffPodiumCard
          topStaff={topStaff}
          role={role}
          selectedStaffId={selectedStaffId}
          baselineGpm={baselineGpm}
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
          {groupedMatches.map((group) => (
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
          ))}
        </div>
      )}
    </div>
  );
}