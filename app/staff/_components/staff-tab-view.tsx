'use client';

import React, { useMemo } from 'react';
import { Crown } from 'lucide-react';
import {
  BaseStaffData,
  FinishedScheduleSummary,
  MatchDetail,
  calculateStaffCumulativeMetrics,
} from '../_library/staff-metrics';
import StaffAvatar from './staff-avatar';
import StaffHistoryCard from './staff-history-card';
import RefereePrivatePanel from './referee-private-panel';

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
  const verifiedReferee =
    role === 'referee'
      ? staffList.find((r) => r.payroll !== null && r.payroll !== undefined)
      : null;

  if (role === 'referee' && token && verifiedReferee) {
    return (
      <RefereePrivatePanel
        verifiedReferee={verifiedReferee as any}
        token={token}
        selectedWeek={selectedWeek}
        onRefresh={onRefresh}
      />
    );
  }

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
      {/* 1. Podium Atas */}
      {topStaff && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/60 bg-gradient-to-br from-blue-500/15 via-card to-card p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <StaffAvatar name={topStaff.discordName} avatarUrl={topStaff.avatar} size="lg" />
                <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xs">
                  <Crown className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-none">
                  {topStaff.discordName}
                </span>
                {selectedStaffId === 'ALL' && (
                  <span className="mt-1 w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-slate-950 leading-none shadow-xs">
                    {role === 'referee' ? 'BEST REFEREE' : 'BEST STREAMER'}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mb-1 text-blue-600 dark:text-blue-400">
                FAVORITE DAY
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap leading-none text-blue-700 dark:text-blue-300">
                {topStaff.favDay}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-border/40 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">MATCH</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{topStaff.matchCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">PERFORM</span>
              <span
                className={`text-xs font-bold mt-0.5 ${
                  topStaff.performNum >= 50 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {topStaff.performNum}%
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">GPM</span>
              <span
                className={`text-xs font-bold mt-0.5 ${
                  topStaff.gpmNum >= baselineGpm ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {topStaff.gpmNum.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">
                {role === 'referee' ? 'FEE' : 'PLATFORM'}
              </span>
              {role === 'referee' ? (
                <span className="text-xs font-bold text-emerald-500 mt-0.5">
                  {isAdmin ? `Rp ${topStaff.calculatedFee.toLocaleString('id-ID')}` : 'Rp ***'}
                </span>
              ) : (
                <span className="text-xs font-bold text-blue-500 mt-0.5">
                  {topStaff.primaryPlatform}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Leaderboard atau Riwayat Laga */}
      {selectedStaffId === 'ALL' ? (
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
          <table className="w-full border-collapse text-left table-fixed">
            <thead className="bg-muted/65 border-b border-border text-[10px] uppercase tracking-wider text-foreground/75 font-bold">
              <tr>
                <th className="py-2.5 pl-4 pr-1 text-center w-14 sm:w-16">RANK</th>
                <th className="py-2.5 pl-2 sm:pl-3 pr-2 text-left">{role === 'referee' ? 'REFEREE' : 'STREAMER'}</th>
                <th className="py-2.5 px-0.5 text-center w-14 sm:w-16">MATCH</th>
                <th className="py-2.5 px-0.5 text-center w-16 sm:w-20">PERFORM</th>
                <th className="py-2.5 pr-4 pl-0.5 text-center w-14 sm:w-16">GPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {statsList.slice(1).map((st, idx) => (
                <tr key={st.discordId} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pl-4 pr-1 text-center font-bold font-mono text-xs">
                    <div className="flex items-center justify-center gap-1">
                      {st.rankChange.direction === 'UP' && (
                        <span className="text-[9px] text-emerald-500 font-bold leading-none">▲</span>
                      )}
                      {st.rankChange.direction === 'DOWN' && (
                        <span className="text-[9px] text-rose-500 font-bold leading-none">▼</span>
                      )}
                      {st.rankChange.direction === 'SAME' && (
                        <span className="text-[9px] text-muted-foreground/60 font-bold leading-none">-</span>
                      )}
                      <span>{idx + 2}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-2 sm:pl-3 pr-2 font-bold truncate flex items-center gap-2">
                    <StaffAvatar name={st.discordName} avatarUrl={st.avatar} size="sm" />
                    <span className="truncate">{st.discordName}</span>
                  </td>
                  <td className="py-2.5 px-0.5 text-center font-semibold">{st.matchCount}</td>
                  <td
                    className={`py-2.5 px-0.5 text-center font-bold ${
                      st.performNum >= 50 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {st.performNum}%
                  </td>
                  <td
                    className={`py-2.5 pr-4 pl-0.5 text-center font-bold ${
                      st.gpmNum >= baselineGpm ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {st.gpmNum.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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