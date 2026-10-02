'use client';

import React from 'react';
import { ShieldAlert, Radio } from 'lucide-react';
import { useStaffRoster } from './_hooks/use-staff-roster';
import StaffFilterBar from './_components/staff-filter-bar';
import StaffTabView from './_components/staff-tab-view';

export default function StaffClientContent() {
  const {
    activeTab,
    handleTabChange,
    referees,
    streamers,
    currentStaffList,
    sortedStaffOptions,
    availableWeeks,
    finishedSchedules,
    selectedStaffId,
    setSelectedStaffId,
    selectedWeek,
    setSelectedWeek,
    isFilterActive,
    handleResetFilter,
    loading,
    fetchRoster,
  } = useStaffRoster();

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* TAB SWITCHER */}
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

      {/* FILTER BAR */}
      <StaffFilterBar
        role={activeTab}
        selectedStaffId={selectedStaffId}
        onSelectStaffId={setSelectedStaffId}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
        staffOptions={sortedStaffOptions}
        availableWeeks={availableWeeks}
        isFilterActive={isFilterActive}
        onResetFilter={handleResetFilter}
      />

      {/* MAIN VIEW */}
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
          onRefresh={fetchRoster}
        />
      )}
    </div>
  );
}