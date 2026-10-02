'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RotateCcw, Users, CalendarDays } from 'lucide-react';
import StaffAvatar from './staff-avatar';
import { BaseStaffData } from '../_library/staff-metrics';
import { DAY_OPTIONS } from '../_hooks/use-staff-roster';

interface StaffFilterBarProps {
  staffOptions: BaseStaffData[];
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
  availableWeeks: (string | number)[];
  selectedWeek: string;
  onSelectWeek: (wk: string) => void;
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
  const [openDropdown, setOpenDropdown] = useState<'staff' | 'week' | 'day' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedStaff = staffOptions.find((s) => s.discordId === selectedStaffId);
  const selectedDayLabel = DAY_OPTIONS.find((d) => d.value === selectedDay)?.label || selectedDay;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-border/80 bg-card p-3 shadow-xs"
    >
      <div className="grid grid-cols-[1fr_110px_110px_auto] sm:grid-cols-[1fr_130px_130px_auto] gap-2 items-center">
        {/* Dropdown Staf dengan Avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown((prev) => (prev === 'staff' ? null : 'staff'))}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground shadow-xs hover:border-primary/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              {selectedStaff ? (
                <StaffAvatar name={selectedStaff.discordName} avatarUrl={selectedStaff.avatar} size="sm" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3" />
                </div>
              )}
              <span className="truncate">{selectedStaff ? selectedStaff.discordName : 'Semua'}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
          </button>

          {openDropdown === 'staff' && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  onSelectStaff('ALL');
                  setOpenDropdown(null);
                }}
                className={`w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedStaffId === 'ALL'
                    ? 'bg-primary/10 text-primary font-black'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3" />
                </div>
                <span>Semua</span>
              </button>
              {staffOptions.map((st) => (
                <button
                  key={st.discordId}
                  type="button"
                  onClick={() => {
                    onSelectStaff(st.discordId);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-xs font-bold transition truncate cursor-pointer ${
                    selectedStaffId === st.discordId
                      ? 'bg-primary/10 text-primary font-black'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <StaffAvatar name={st.discordName} avatarUrl={st.avatar} size="sm" />
                  <span className="truncate">{st.discordName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Pekan (Week) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown((prev) => (prev === 'week' ? null : 'week'))}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs hover:border-primary/50 transition cursor-pointer"
          >
            <span className="truncate">{selectedWeek}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
          </button>

          {openDropdown === 'week' && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
              {availableWeeks.map((wk) => {
                const label = String(wk).toLowerCase().startsWith('week') ? String(wk) : `Week ${wk}`;
                return (
                  <button
                    key={String(wk)}
                    type="button"
                    onClick={() => {
                      onSelectWeek(label);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedWeek === label
                        ? 'bg-primary/10 text-primary font-black'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dropdown Hari (Day) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown((prev) => (prev === 'day' ? null : 'day'))}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs hover:border-primary/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5 truncate">
              <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedDayLabel}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
          </button>

          {openDropdown === 'day' && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
              {DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSelectDay(opt.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedDay === opt.value
                      ? 'bg-primary/10 text-primary font-black'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tombol Reset Filter */}
        <button
          onClick={onReset}
          disabled={!isFilterActive}
          title="Reset Filter"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition active:scale-95 cursor-pointer ${
            isFilterActive
              ? 'bg-rose-500 hover:bg-rose-600'
              : 'bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
