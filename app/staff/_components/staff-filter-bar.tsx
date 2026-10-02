'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, RotateCcw, Users, CalendarDays, Shield } from 'lucide-react';
import StaffAvatar from './staff-avatar';
import StaffFilterDropdown, { DropdownItemOption } from './staff-filter-dropdown';
import { BaseStaffData } from '../_library/staff-metrics';

export interface FilterTeamOption {
  id: string;
  name: string;
}

interface StaffFilterBarProps {
  staffOptions: BaseStaffData[];
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
  teamOptions?: FilterTeamOption[];
  selectedTeam?: string;
  onSelectTeam?: (teamId: string) => void;
  availableWeeks: string[];
  selectedWeek: string;
  onSelectWeek: (wk: string) => void;
  availableDays?: string[];
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
  onReset: () => void;
  isFilterActive: boolean;
}

const ORDERED_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function StaffFilterBar({
  staffOptions,
  selectedStaffId,
  onSelectStaff,
  teamOptions = [],
  selectedTeam = 'ALL',
  onSelectTeam,
  availableWeeks,
  selectedWeek,
  onSelectWeek,
  availableDays = [],
  selectedDay = 'ALL',
  onSelectDay,
  onReset,
  isFilterActive,
}: StaffFilterBarProps) {
  const [openStaffDropdown, setOpenStaffDropdown] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target as Node)) {
        setOpenStaffDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStaffSpecific = selectedStaffId !== 'ALL';
  const selectedStaff = staffOptions.find((s) => s.discordId === selectedStaffId);

  const teamItems: DropdownItemOption[] = useMemo(() => {
    return [
      { id: 'ALL', label: 'Semua Tim' },
      ...teamOptions.map((tm) => ({ id: tm.id, label: tm.name })),
    ];
  }, [teamOptions]);

  const selectedTeamLabel = useMemo(() => {
    if (selectedTeam === 'ALL') return 'Semua Tim';
    const found = teamOptions.find((t) => t.id === selectedTeam);
    return found ? found.name : 'Semua Tim';
  }, [teamOptions, selectedTeam]);

  const weekItems: DropdownItemOption[] = useMemo(() => {
    return availableWeeks.map((wk) => ({ id: wk, label: wk }));
  }, [availableWeeks]);

  const sortedDayItems: DropdownItemOption[] = useMemo(() => {
    const sorted = [...availableDays].sort((a, b) => {
      const idxA = ORDERED_DAYS.indexOf(a);
      const idxB = ORDERED_DAYS.indexOf(b);
      const posA = idxA === -1 ? 99 : idxA;
      const posB = idxB === -1 ? 99 : idxB;
      return posA - posB;
    });

    return [
      { id: 'ALL', label: 'Semua Hari' },
      ...sorted.map((dy) => ({ id: dy, label: dy })),
    ];
  }, [availableDays]);

  const selectedDayLabel = selectedDay === 'ALL' ? 'Semua Hari' : selectedDay;

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
      {/* Baris 1: Staff + Tim */}
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* Dropdown Staff dengan Avatar */}
        <div ref={staffDropdownRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setOpenStaffDropdown((prev) => !prev)}
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

          {openStaffDropdown && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  onSelectStaff('ALL');
                  setOpenStaffDropdown(false);
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
                    setOpenStaffDropdown(false);
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

        {/* Dropdown Tim */}
        <StaffFilterDropdown
          label={selectedTeamLabel}
          items={teamItems}
          selectedValue={selectedTeam}
          onSelect={(val) => onSelectTeam?.(val)}
          disabled={isStaffSpecific}
          icon={
            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="h-3 w-3" />
            </div>
          }
          align="right"
        />
      </div>

      {/* Baris 2: Pekan + Hari + Reset Button */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        {/* Dropdown Pekan */}
        <StaffFilterDropdown
          label={selectedWeek}
          items={weekItems}
          selectedValue={selectedWeek}
          onSelect={onSelectWeek}
          disabled={isStaffSpecific}
          align="left"
        />

        {/* Dropdown Hari */}
        <StaffFilterDropdown
          label={selectedDayLabel}
          items={sortedDayItems}
          selectedValue={selectedDay}
          onSelect={(val) => onSelectDay?.(val)}
          icon={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          align="right"
        />

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={onReset}
          disabled={!isFilterActive}
          title="Reset Filter"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition ${
            isFilterActive
              ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer active:scale-95'
              : 'bg-rose-500/15 text-rose-400/50 border border-rose-500/20 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );                 
}
