'use client';

import React, { useState } from 'react';
import RefereeClaim from './referee-claim';

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
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingLinkId, setLoadingLinkId] = useState<string | null>(null);

  const verifiedReferee = referees.find((r) => r.payroll !== null && r.payroll !== undefined);

  const filteredReferees = referees.filter((ref) => {
    const matchName = ref.discordName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchName) return false;

    if (selectedWeek === 'ALL') return true;

    const hasInActive = ref.activeMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    const hasInHistory = ref.historyMatches.some(
      (m) => (m.weekName || `Week ${m.weekNumber}`) === selectedWeek
    );
    return hasInActive || hasInHistory;
  });

  const unclaimedMatches = verifiedReferee
    ? verifiedReferee.historyMatches.filter(
        (m) => !verifiedReferee.payroll?.claimedMatchIds.includes(m.id)
      )
    : [];

  const handleCopyRefereeLink = async (discordId: string) => {
    try {
      setLoadingLinkId(discordId);
      const res = await fetch('/api/tournament/staff/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membuat link');
      }

      await navigator.clipboard.writeText(data.url);
      setCopiedId(discordId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Gagal menyalin link wasit');
    } finally {
      setLoadingLinkId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel Khusus Wasit Terverifikasi (Mode Token) */}
      {verifiedReferee && verifiedReferee.payroll && (
        <div className="rounded-2xl border border-blue-500/30 bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-500/20">
                  Panel Wasit Resmi
                </span>
                <span className="text-xs text-muted-foreground">ID: {verifiedReferee.discordId}</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Halo, {verifiedReferee.discordName}
              </h2>
              <p className="text-xs text-muted-foreground">
                Tersedia {verifiedReferee.payroll.unclaimedMatchCount} pertandingan yang belum dicairkan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-border/80 bg-background px-4 py-2 text-center">
                <div className="text-[10px] uppercase text-muted-foreground">Tarif Honor</div>
                <div className="text-sm font-bold text-blue-600">
                  Rp {verifiedReferee.payroll.feePerMatch.toLocaleString('id-ID')} / match
                </div>
              </div>

              {token && (
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  disabled={unclaimedMatches.length === 0}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 transition"
                >
                  Ajukan Pencairan Honor
                </button>
              )}
            </div>
          </div>

          {verifiedReferee.payroll.bankInfo && (
            <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Rekening Terdaftar: <strong className="text-foreground">{verifiedReferee.payroll.bankInfo.bankName}</strong> - {verifiedReferee.payroll.bankInfo.accountNumber} (a.n {verifiedReferee.payroll.bankInfo.accountHolder})
            </div>
          )}
        </div>
      )}

      {/* Grid Kartu Wasit */}
      {filteredReferees.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
          Tidak ada data wasit yang cocok dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReferees.map((ref) => {
            const isAssigned = ref.activeMatches.length > 0;

            return (
              <div
                key={ref.discordId}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-blue-500/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600 border border-blue-500/20">
                        {ref.discordName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{ref.discordName}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{ref.discordId}</div>
                      </div>
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

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Match Selesai</div>
                      <div className="text-sm font-bold text-foreground">{ref.totalFinishedMatches}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Tugas Berjalan</div>
                      <div className="text-sm font-bold text-blue-600">{ref.activeMatches.length}</div>
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
                    Total: {ref.historyMatches.length + ref.activeMatches.length} Match
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleCopyRefereeLink(ref.discordId)}
                      disabled={loadingLinkId === ref.discordId}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-500/20 transition disabled:opacity-50"
                    >
                      {loadingLinkId === ref.discordId
                        ? 'Membuat Link...'
                        : copiedId === ref.discordId
                        ? '✓ Tersalin'
                        : '🔗 Salin Link Wasit'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {verifiedReferee && token && (
        <RefereeClaim
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          token={token}
          feePerMatch={verifiedReferee.payroll?.feePerMatch || 10000}
          unclaimedMatches={unclaimedMatches}
          savedBankInfo={verifiedReferee.payroll?.bankInfo || null}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );                     
}
