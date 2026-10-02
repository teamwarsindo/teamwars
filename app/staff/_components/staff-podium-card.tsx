'use client';

import React from 'react';
import { Crown } from 'lucide-react';
import { ComputedStaffItem } from '../_library/staff-metrics';
import StaffAvatar from './staff-avatar';

interface StaffPodiumCardProps {
  topStaff: ComputedStaffItem;
  role: 'referee' | 'streamer';
  selectedStaffId: string;
  baselineGpm: number;
  isAdmin?: boolean;
}

export default function StaffPodiumCard({
  topStaff,
  role,
  selectedStaffId,
  baselineGpm,
  isAdmin = false,
}: StaffPodiumCardProps) {
  return (
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-none">
                {topStaff.discordName}
              </span>
              {isAdmin && (
                <span className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-rose-500 leading-none">
                  ADMIN
                </span>
              )}
            </div>

            {selectedStaffId === 'ALL' && (
              <span className="w-fit rounded bg-amber-400 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-slate-950 leading-none shadow-xs mt-1.5">
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
          <span className={`text-xs font-bold mt-0.5 ${topStaff.performNum >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {topStaff.performNum}%
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">GPM</span>
          <span className={`text-xs font-bold mt-0.5 ${topStaff.gpmNum >= baselineGpm ? 'text-emerald-500' : 'text-rose-500'}`}>
            {topStaff.gpmNum.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">
            {role === 'referee' ? 'FEE' : 'PLATFORM'}
          </span>
          {role === 'referee' ? (
            <span className={`text-xs font-bold mt-0.5 ${isAdmin ? 'text-emerald-500' : 'text-muted-foreground/80'}`}>
              {isAdmin ? `Rp ${topStaff.calculatedFee.toLocaleString('id-ID')}` : 'Rp ***'}
            </span>
          ) : (
            <span className="text-xs font-bold text-blue-500 mt-0.5">{topStaff.primaryPlatform}</span>
          )}
        </div>
      </div>
    </div>
  );
}