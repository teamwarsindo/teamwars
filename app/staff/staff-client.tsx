'use client';

import React from 'react';
import { ShieldAlert, Radio, ShieldCheck } from 'lucide-react';
import { useStaffRoster } from './_hooks/use-staff-roster';
import StaffFilterBar from './_components/staff-filter-bar';
import StaffTabView from './_components/staff-tab-view';

interface StaffClientContentProps {
  isAdmin?: boolean;
}

export default function StaffClientContent({ isAdmin = false }: StaffClientContentProps) {
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
    fetchRoster,
  } = useStaffRoster();

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* BANNER STATUS SESI ADMIN (STYLE MATCH EDITOR) */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 sm:px-5 sm:py-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                Sesi Administrator Aktif
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Akses penuh: visibilitas fee wasit dan pengelolaan turnamen terbuka.
              </span>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            VERIFIED
          </span>
        </div>
      )}

      {/* 1. TAB SWITCHER */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-2xl border border-border/80 bg-muted/30 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => handleTabChange('referee')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'referee'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Wasit Pertandingan ({referees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('streamer')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'streamer'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Broadcaster ({streamers.length})</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER BAR */}
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

      {/* 3. MAIN VIEW */}
      {loading ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
          ⏳ Memperbarui Data Staf...
        </div>
      ) : (
        <StaffTabView
          role={activeTab}
          staffList={currentStaffList}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          finishedSchedules={finishedSchedules}
          isAdmin={isAdmin}
          onRefresh={fetchRoster}
        />
      )}
    </div>
  );
}
