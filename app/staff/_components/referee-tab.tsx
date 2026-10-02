'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Trophy, Crown } from 'lucide-react';
import RefereePrivatePanel from './referee-private-panel';
import RefereeHistoryCard from './referee-history-card';

export interface MatchDetail {
  id: string;
  matchDate?: string;
  weekNumber?: number;
  weekName?: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
  isFinished?: boolean;
  streamLink?: string | null;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface PayrollRequestItem {
  requestId: string;
  monthKey: string;
  matchIds: string[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proofUrl?: string;
  declineReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface RefereeData {
  discordId: string;
  discordName: string;
  avatar?: string;
  activeMatches: MatchDetail[];
  historyMatches: MatchDetail[];
  totalFinishedMatches: number;
  payroll?: {
    feePerMatch: number;
    totalEarned: number;
    bankInfo: BankInfo | null;
    payrollRequests: PayrollRequestItem[];
    claimedMatchIds: string[];
    unclaimedMatchCount: number;
  } | null;
}

interface RefereeTabProps {
  referees: RefereeData[];
  token?: string | null;
  isAdmin?: boolean;
  selectedStaffId?: string;
  selectedWeek: string;
  onRefresh: () => void;
}

export default function RefereeTab({
  referees,
  token,
  isAdmin = false,
  selectedStaffId = 'ALL',
  selectedWeek,
  onRefresh,
}: RefereeTabProps) {
  const verifiedReferee = referees.find((r) => r.payroll !== null && r.payroll !== undefined);
  const isTokenMode = Boolean(token && verifiedReferee);

  if (isTokenMode && verifiedReferee) {
    return (
      <RefereePrivatePanel
        verifiedReferee={verifiedReferee}
        token={token!}
        selectedWeek={selectedWeek}
        onRefresh={onRefresh}
      />
    );
  }

  const selectedWeekNum = useMemo(() => {
    const num = Number(String(selectedWeek).replace(/\D/g, ''));
    return isNaN(num) || num <= 0 ? Infinity : num;
  }, [selectedWeek]);

  // Kalkulasi performa kumulatif (<= selectedWeek)
  const statsList = useMemo(() => {
    let grandTotalMatches = 0;

    const list = referees.map((ref) => {
      const cumulativeMatches = ref.historyMatches.filter((m) => {
        const wNum = Number(m.weekNumber || String(m.weekName).replace(/\D/g, '') || 1);
        return wNum <= selectedWeekNum;
      });

      const matchCount = cumulativeMatches.length;
      grandTotalMatches += matchCount;

      let totalGames = 0;
      const teamFrequencyMap = new Map<string, number>();

      cumulativeMatches.forEach((m) => {
        totalGames += (m.scoreA ?? 0) + (m.scoreB ?? 0);
        if (m.teamAName) teamFrequencyMap.set(m.teamAName, (teamFrequencyMap.get(m.teamAName) || 0) + 1);
        if (m.teamBName) teamFrequencyMap.set(m.teamBName, (teamFrequencyMap.get(m.teamBName) || 0) + 1);
      });

      let favTeam = '-';
      let maxFreq = 0;
      teamFrequencyMap.forEach((freq, tName) => {
        if (freq > maxFreq) {
          maxFreq = freq;
          favTeam = `${tName} (${freq}x)`;
        }
      });

      const gpm = matchCount > 0 ? (totalGames / matchCount).toFixed(1) : '0.0';
      const feePerMatch = ref.payroll?.feePerMatch ?? 25000;
      const calculatedFee = matchCount * feePerMatch;

      return {
        ...ref,
        cumulativeMatches,
        matchCount,
        totalGames,
        gpm,
        favTeam,
        calculatedFee,
        ratio: 0,
      };
    });

    list.forEach((item) => {
      item.ratio = grandTotalMatches > 0 ? Math.round((item.matchCount / grandTotalMatches) * 100) : 0;
    });

    return list.sort((a, b) => b.matchCount - a.matchCount || b.totalGames - a.totalGames);
  }, [referees, selectedWeekNum]);

  const topReferee = useMemo(() => {
    if (selectedStaffId !== 'ALL') {
      return statsList.find((r) => r.discordId === selectedStaffId) || statsList[0] || null;
    }
    return statsList[0] || null;
  }, [statsList, selectedStaffId]);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* 1. KARTU PODIUM ATAS (ALA MVP POWER RANKING) */}
      {topReferee && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/60 bg-gradient-to-br from-blue-500/15 via-card to-card p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-blue-500 overflow-hidden bg-background flex items-center justify-center shadow-inner">
                  {topReferee.avatar ? (
                    <Image
                      src={topReferee.avatar}
                      alt={topReferee.discordName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover rounded-full"
                      unoptimized
                    />
                  ) : (
                    <Trophy className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-xs">
                  <Crown className="w-2.5 h-2.5 fill-current" />
                </div>
              </div>

              {/* Hierarki Vertikal: Badge di atas, Nama Referee di bawahnya */}
              <div className="min-w-0 flex flex-col justify-center">
                <span className="w-fit px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 leading-none mb-1">
                  {selectedStaffId === 'ALL' ? 'BEST REFEREE' : 'OVERVIEW'}
                </span>
                <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-none">
                  {topReferee.discordName}
                </span>
              </div>
            </div>

            {/* Favorite Team Badge */}
            <div className="shrink-0 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mb-1 text-blue-600 dark:text-blue-400">
                FAVORITE TEAM
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap leading-none text-blue-700 dark:text-blue-300">
                {topReferee.favTeam}
              </span>
            </div>
          </div>

          {/* Baris 5 Kolom Metrik Sejajar Rata (FEE Tetap Ada di Kartu Atas) */}
          <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/40 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">MATCH</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{topReferee.matchCount}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-emerald-600 dark:text-emerald-400">GAME</span>
              <span className="text-xs font-bold text-emerald-500 mt-0.5">{topReferee.totalGames}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">GPM</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{topReferee.gpm}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">RATIO</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{topReferee.ratio}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-bold uppercase text-muted-foreground">FEE</span>
              <span className="text-xs font-bold text-emerald-500 mt-0.5">
                {isAdmin ? `Rp ${topReferee.calculatedFee.toLocaleString('id-ID')}` : 'Rp ***'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. KONTEN BAWAH: TABEL KLASEMEN (MULAI DARI RANK 2, TANPA KOLOM FEE) ATAU HISTORY MATCH */}
      {selectedStaffId === 'ALL' ? (
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
          <table className="w-full border-collapse text-left table-fixed">
            <thead className="bg-muted/65 border-b border-border text-[10px] uppercase tracking-wider text-foreground/75 font-bold">
              <tr>
                <th className="py-2.5 pl-4 pr-1 text-center w-12 sm:w-14">RANK</th>
                <th className="py-2.5 pl-2 sm:pl-3 pr-2 text-left">REFEREE</th>
                <th className="py-2.5 px-0.5 text-center w-12 sm:w-14">MATCH</th>
                <th className="py-2.5 px-0.5 text-center w-12 sm:w-14 text-emerald-600 dark:text-emerald-400">GAME</th>
                <th className="py-2.5 px-0.5 text-center w-12 sm:w-14">GPM</th>
                <th className="py-2.5 pr-4 pl-0.5 text-center w-14 sm:w-16">RATIO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {/* Mulai dari Rank 2, Rank 1 sudah berada di kartu podium Best Referee */}
              {statsList.slice(1).map((ref, idx) => (
                <tr key={ref.discordId} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pl-4 pr-1 text-center font-bold font-mono text-xs">{idx + 2}</td>
                  <td className="py-2.5 pl-2 sm:pl-3 pr-2 font-bold truncate flex items-center gap-2">
                    <div className="relative h-5 w-5 rounded-full overflow-hidden border border-border/80 shrink-0">
                      {ref.avatar ? (
                        <Image src={ref.avatar} alt={ref.discordName} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-blue-500/20 text-[9px] flex items-center justify-center font-bold">
                          {ref.discordName.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="truncate">{ref.discordName}</span>
                  </td>
                  <td className="py-2.5 px-0.5 text-center font-semibold">{ref.matchCount}</td>
                  <td className="py-2.5 px-0.5 text-center font-bold text-emerald-500">{ref.totalGames}</td>
                  <td className="py-2.5 px-0.5 text-center">{ref.gpm}</td>
                  <td className="py-2.5 pr-4 pl-0.5 text-center font-medium">{ref.ratio}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* DAFTAR HISTORY MATCH SCOREBOARD */
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            HISTORY MATCH ({topReferee?.cumulativeMatches.length || 0})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(topReferee?.cumulativeMatches || []).map((m) => (
              <RefereeHistoryCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
