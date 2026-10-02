'use client';

import React, { useMemo, useState } from 'react';
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
  token?: string | null;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export default function StaffTabView({
  role,
  staffList,
  selectedStaffId,
  selectedWeek,
  finishedSchedules = [],
  token,
  isAdmin = false,
  onRefresh = () => {},
}: StaffTabViewProps) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);

  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? 1 : num;
  }, [selectedWeek]);

  const { statsList, baselineGpm } = useMemo(() => {
    return calculateStaffCumulativeMetrics(staffList, selectedWeekNum, finishedSchedules, role);
  }, [staffList, selectedWeekNum, finishedSchedules, role]);

  const verifiedReferee = useMemo(() => {
    if (role !== 'referee' || !token) return null;
    return statsList.find((r) => r.payroll !== null && r.payroll !== undefined) || null;
  }, [role, token, statsList]);

  const topStaff = useMemo(() => {
    if (verifiedReferee) return verifiedReferee;
    if (selectedStaffId !== 'ALL') {
      return statsList.find((s) => s.discordId === selectedStaffId) || statsList[0] || null;
    }
    return statsList[0] || null;
  }, [statsList, selectedStaffId, verifiedReferee]);

  const unclaimedMatches = useMemo(() => {
    if (!verifiedReferee) return [];
    return verifiedReferee.historyMatches.filter(
      (m) =>
        !verifiedReferee.payroll?.claimedMatchIds.includes(m.id) &&
        (!selectedWeek || selectedWeek === 'ALL' || (m.weekName || `Week ${m.weekNumber}`) === selectedWeek)
    );
  }, [verifiedReferee, selectedWeek]);

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
      {/* 1. Podium Atas */}
      {topStaff && (
        <StaffPodiumCard
          topStaff={topStaff}
          role={role}
          selectedStaffId={selectedStaffId}
          baselineGpm={baselineGpm}
          isAdmin={isAdmin}
          token={token}
          verifiedReferee={verifiedReferee}
          selectedMatches={selectedMatches}
          onClaimSuccess={() => {
            setSelectedMatches([]);
            onRefresh();
          }}
        />
      )}

      {/* 2. Leaderboard Publik atau Riwayat Laga */}
      {selectedStaffId === 'ALL' && !verifiedReferee ? (
        <StaffLeaderboardTable
          statsList={statsList}
          role={role}
          baselineGpm={baselineGpm}
          isAdmin={isAdmin}
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
                {group.matches.map((m) => {
                  const isUnclaimed = unclaimedMatches.some((um) => um.id === m.id);
                  const isChecked = selectedMatches.includes(m.id);
                  return (
                    <div key={m.id} className="relative flex flex-col">
                      {verifiedReferee && isUnclaimed && (
                        <div
                          onClick={() =>
                            setSelectedMatches((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }
                          className={`mb-1 flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'border-blue-500 bg-blue-500/10 text-foreground font-bold'
                              : 'border-border/80 bg-card hover:border-blue-500/40 text-muted-foreground'
                          }`}
                        >
                          <label className="flex items-center gap-2 pointer-events-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded text-blue-600"
                            />
                            <span>Pilih untuk klaim honor</span>
                          </label>
                          <span className="text-[10px] text-emerald-600 font-bold">Siap Dicairkan</span>
                        </div>
                      )}
                      <StaffHistoryCard match={m} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}