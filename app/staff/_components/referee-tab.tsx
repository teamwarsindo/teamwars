'use client';

import React, { useState } from 'react';
import RefereePrivatePanel from './referee-private-panel';

export interface MatchDetail {
  id: string;
  matchDate?: string;
  weekNumber?: number;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  scoreA?: number;
  scoreB?: number;
  isFinished?: boolean;
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
  searchQuery: string;
  selectedWeek: string;
  onRefresh: () => void;
}

export default function RefereeTab({
  referees,
  token,
  isAdmin,
  searchQuery,
  selectedWeek,
  onRefresh,
}: RefereeTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filteredReferees = referees.filter((ref) => {
    if (searchQuery && !ref.discordName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedWeek === 'ALL') return true;
    const inActive = ref.activeMatches.some((m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek);
    const inHistory = ref.historyMatches.some((m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek);
    return inActive || inHistory;
  });

  const handleCopyLink = async (discordId: string) => {
    try {
      const res = await fetch('/api/tournament/staff/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      await navigator.clipboard.writeText(data.url);
      setCopiedId(discordId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyalin link.');
    }
  };

  return (
    <div className="space-y-6">
      {filteredReferees.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
          Tidak ada data wasit yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReferees.map((ref) => {
            const isAssigned = ref.activeMatches.length > 0;
            const filteredHistory = ref.historyMatches.filter(
              (m) => selectedWeek === 'ALL' || (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
            );
            const filteredActive = ref.activeMatches.filter(
              (m) => selectedWeek === 'ALL' || (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
            );
            const totalMatchesInWeek = filteredHistory.length;

            return (
              <div
                key={ref.discordId}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-blue-500/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 border border-blue-500/20">
                        {ref.discordName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-sm font-bold text-foreground">{ref.discordName}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isAssigned
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border/80'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAssigned ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                        }`}
                      />
                      {isAssigned ? 'Bertugas' : 'Standby'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground">Selesai</div>
                      <div className="text-xs font-bold text-foreground">{totalMatchesInWeek}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground">Aktif</div>
                      <div className="text-xs font-bold text-blue-600">{filteredActive.length}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground">Total Honor</div>
                      <div className="text-xs font-bold text-emerald-600 tracking-wider">
                        {totalMatchesInWeek === 0 ? 'Rp 0' : 'Rp ***'}
                      </div>
                    </div>
                  </div>

                  {isAssigned && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase">
                        Sedang Memimpin:
                      </div>
                      {ref.activeMatches.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-400"
                        >
                          <span className="font-semibold">{m.teamAName} vs {m.teamBName}</span>
                          <span className="font-mono text-[10px] opacity-75">{m.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {selectedWeek === 'ALL' ? 'Semua Pekan' : selectedWeek}: {totalMatchesInWeek} Match
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(ref.discordId)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-500/20 transition"
                    >
                      {copiedId === ref.discordId ? '✓ Tersalin' : '🔗 Salin Link Wasit'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
