'use client';

import React from 'react';
import StaffFilterBar from './_components/staff-filter-bar';
import StaffTabView from './_components/staff-tab-view';
import AdminApprovalTab from './_components/admin-approval-tab';
import { useStaffRoster } from './_hooks/use-staff-roster';

interface StaffClientProps {
  initialToken?: string | null;
  isAdmin?: boolean;
}

export default function StaffClient({ initialToken = null, isAdmin = false }: StaffClientProps) {
  const {
    activeTab,
    handleTabChange,
    referees,
    streamers,
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
  } = useStaffRoster(initialToken);

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* 1. Tab Navigasi */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          onClick={() => handleTabChange('referee')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'referee'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Referee ({referees.length})
        </button>

        <button
          onClick={() => handleTabChange('streamer')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
            activeTab === 'streamer'
              ? 'bg-blue-600 text-white shadow-blue-500/25'
              : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Streamer ({streamers.length})
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabChange('approval')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
              activeTab === 'approval'
                ? 'bg-blue-600 text-white shadow-blue-500/25'
                : 'border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Payroll Approval
          </button>
        )}
      </div>

      {/* 2. Filter Bar */}
      {activeTab !== 'approval' && (
        <StaffFilterBar
          staffOptions={sortedStaffOptions}
          selectedStaffId={selectedStaffId}
          onSelectStaff={setSelectedStaffId}
          availableWeeks={availableWeeks}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          onReset={handleResetFilter}
          isFilterActive={isFilterActive}
        />
      )}

      {/* 3. Konten Tampilan */}
      {loading ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs font-bold text-primary animate-pulse shadow-xs">
          Memuat data staf...
        </div>
      ) : activeTab === 'referee' ? (
        <StaffTabView
          role="referee"
          staffList={referees}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          finishedSchedules={finishedSchedules}
          token={initialToken}
          isAdmin={isAdmin}
          onRefresh={fetchRoster}
        />
      ) : activeTab === 'streamer' ? (
        <StaffTabView
          role="streamer"
          staffList={streamers}
          selectedStaffId={selectedStaffId}
          selectedWeek={selectedWeek}
          finishedSchedules={finishedSchedules}
        />
      ) : (
        <AdminApprovalTab referees={referees as any} onRefresh={fetchRoster} />
      )}
    </div>
  );
}