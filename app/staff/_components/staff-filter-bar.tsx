'use client';

import React from 'react';
import { Users, Calendar, RotateCcw, CalendarDays } from 'lucide-react';
import { BaseStaffData } from '../_library/staff-metrics';
import { DAY_OPTIONS } from '../_hooks/use-staff-roster';

interface StaffFilterBarProps {
  staffOptions: BaseStaffData[];
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
  availableWeeks: number[];
  selectedWeek: string;
  onSelectWeek: (week: string) => void;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onReset: () => void;
  isFilterActive: boolean;
}

export default function StaffFilterBar({
  staffOptions,
  selectedStaffId,
  onSelectStaff,
  availableWeeks,
  selectedWeek,
  onSelectWeek,
  selectedDay,
  onSelectDay,
  onReset,
  isFilterActive,
}: StaffFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/60 p-2 sm:p-2.5 backdrop-blur-xs shadow-xs">
      {/* 1. FILTER STAFF */}
      <div className="relative flex-1 min-w-[140px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-blue-500" />
        </div>
        <select
          value={selectedStaffId}
          onChange={(e) => onSelectStaff(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border/80 bg-background/90 py-2 pl-9 pr-8 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
        >
          <option value="ALL">Semua Staf</option>
          {staffOptions.map((staff) => (
            <option key={staff.discordId || staff.discordName} value={staff.discordName}>
              {staff.discordName}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
          <span className="text-[10px]">▼</span>
        </div>
      </div>

      {/* 2. FILTER WEEK */}
      <div className="relative min-w-[110px] sm:min-w-[120px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-blue-500" />
        </div>
        <select
          value={selectedWeek}
          onChange={(e) => onSelectWeek(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border/80 bg-background/90 py-2 pl-9 pr-8 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
        >
          <option value="ALL">Semua Minggu</option>
          {availableWeeks.map((week) => (
            <option key={week} value={week.toString()}>
              Week {week}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
          <span className="text-[10px]">▼</span>
        </div>
      </div>

      {/* 3. FILTER DAY */}
      <div className="relative min-w-[110px] sm:min-w-[120px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
        </div>
        <select
          value={selectedDay}
          onChange={(e) => onSelectDay(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border/80 bg-background/90 py-2 pl-9 pr-8 text-xs font-semibold text-foreground focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
        >
          {DAY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
          <span className="text-[10px]">▼</span>
        </div>
      </div>

      {/* 4. RESET BUTTON */}
      {isFilterActive && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer shadow-xs shrink-0"
          title="Reset Semua Filter"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      )}
    </div>
  );
}
