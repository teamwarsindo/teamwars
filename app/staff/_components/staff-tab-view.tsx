'use client';

import React, { useMemo } from 'react';
import {
  BaseStaffData,
  FinishedScheduleSummary,
  computeStaffMetrics,
} from '../_library/staff-metrics';
import StaffPodiumCard from './staff-podium-card';
import StaffGridList from './staff-grid-list';
import StaffScheduleHistoryList from './staff-schedule-history-list';

interface StaffTabViewProps {
  role: 'referee' | 'streamer';
  staffList: BaseStaffData[];
  selectedStaffId: string;
  selectedWeek: string;
  selectedDay?: string;
  finishedSchedules: FinishedScheduleSummary[];
  isAdmin?: boolean;
  onRefresh?: () => void;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function StaffTabView({
  role,
  staffList,
  selectedStaffId,
  selectedWeek,
  selectedDay = 'ALL',
  finishedSchedules,
  isAdmin = false,
  onRefresh,
}: StaffTabViewProps) {
  // 1. Filter jadwal berdasarkan Week dan Day
  const filteredSchedules = useMemo(() => {
    return finishedSchedules.filter((schedule) => {
      // Filter Week
      if (selectedWeek !== 'ALL') {
        const weekNum = parseInt(selectedWeek, 10);
        if (schedule.weekNumber !== weekNum) return false;
      }

      // Filter Day
      if (selectedDay !== 'ALL') {
        if (!schedule.matchDate) return false;
        const dateObj = new Date(schedule.matchDate);
        if (isNaN(dateObj.getTime())) return false;
        const dayName = DAY_NAMES[dateObj.getDay()];
        if (dayName.toLowerCase() !== selectedDay.toLowerCase()) return false;
      }

      return true;
    });
  }, [finishedSchedules, selectedWeek, selectedDay]);

  // 2. Hitung metrik staf berdasarkan jadwal yang sudah terfilter
  const { computedStaff, baselineGpm, topStaff } = useMemo(() => {
    return computeStaffMetrics(staffList, filteredSchedules, role);
  }, [staffList, filteredSchedules, role]);

  // 3. Filter daftar staf jika ada staf yang dipilih secara spesifik
  const displayedStaff = useMemo(() => {
    if (selectedStaffId === 'ALL') return computedStaff;
    return computedStaff.filter(
      (s) => s.discordName.toLowerCase() === selectedStaffId.toLowerCase()
    );
  }, [computedStaff, selectedStaffId]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Kartu Sorotan / Podium Teratas */}
      {topStaff && (
        <StaffPodiumCard
          topStaff={topStaff}
          role={role}
          selectedStaffId={selectedStaffId}
          baselineGpm={baselineGpm}
          isAdmin={isAdmin}
        />
      )}

      {/* Grid Roster Staf */}
      <StaffGridList
        staffList={displayedStaff}
        role={role}
        baselineGpm={baselineGpm}
        isAdmin={isAdmin}
      />

      {/* Riwayat Laga Pertandingan yang Terfilter */}
      <StaffScheduleHistoryList
        schedules={filteredSchedules}
        role={role}
        selectedStaffId={selectedStaffId}
        onRefresh={onRefresh}
      />
    </div>
  );
}
