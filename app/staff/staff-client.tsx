'use client';

import React from 'react';
import { useStaffRoster } from './_hooks/use-staff-roster';
import StaffFilterBar from './_components/staff-filter-bar';
import StaffTabView from './_components/staff-tab-view';

interface StaffClientProps {
  isAdmin: boolean;
}

export default function StaffClientContent({ isAdmin }: StaffClientProps) {
  const {
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
    setSelectedTeam,
    finishedSchedules,
    selectedStaffId,
    setSelectedStaffId,
    selectedWeek,
    setSelectedWeek,
    selectedDay,
    setSelectedDay,
    isFilterActive,
    handleResetFilter,
    loading,
  } = useStaffRoster();

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. STATUS MODE ADMIN (HANYA MUNCUL JIKA ADA SESI ADMIN) */}
      {isAdmin && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs text-primary shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Mode Pengurus Aktif</span>
          </div>
          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            Admin
          </span>
        </div>
      )}

      {/* 2. NAVIGASI PILL-TAB */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleTabChange('referee')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'referee'
              ? 'bg-primary text-primary-foreground shadow-primary/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Wasit Pertandingan ({referees.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('streamer')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'streamer'
              ? 'bg-primary text-primary-foreground shadow-primary/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Broadcaster ({streamers.length})
        </button>
      </div>

      {/* 3. FILTER BAR DUA BARIS (STAFF + TIM, WEEK + HARI + RESET) */}
      <StaffFilterBar
        staffOptions={sortedStaffOptions}
        selectedStaffId={selectedStaffId}
        onSelectStaff={setSelectedStaffId}
        teamOptions={teamOptions}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
        availableWeeks={availableWeeks}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        availableDays={availableDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onReset={handleResetFilter}
        isFilterActive={isFilterActive}
      />

      {/* 4. KONTEN TAB UTAMA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-semibold">Memuat data staf...</span>
        </div>
      ) : (
        <StaffTabView
          role={activeTab}
          staffList={currentStaffList}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          selectedDay={selectedDay}
          selectedTeam={selectedTeam}
          finishedSchedules={finishedSchedules}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
