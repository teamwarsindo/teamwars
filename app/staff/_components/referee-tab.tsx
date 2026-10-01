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
  searchQuery: string;
  selectedWeek: string;
  onRefresh: () => void;
}

export default function RefereeTab({
  referees,
  token,
  searchQuery,
  selectedWeek,
  onRefresh,
}: RefereeTabProps) {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Cari data wasit yang sedang terverifikasi melalui token
  const verifiedReferee = referees.find((r) => r.payroll !== null && r.payroll !== undefined);

  // Filter wasit berdasarkan query nama dan pekan yang dipilih
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

  // Tentukan match yang belum pernah diklaim untuk wasit yang terverifikasi
  const unclaimedMatches = verifiedReferee
    ? verifiedReferee.historyMatches.filter(
        (m) => !verifiedReferee.payroll?.claimedMatchIds.includes(m.id)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Panel Khusus Wasit Terverifikasi (Token Holder) */}
      {verifiedReferee && verifiedReferee.payroll && (
        <div className="rounded-xl border border-rose-900/60 bg-gradient-to-r from-rose-950/30 via-zinc-950 to-zinc-950 p-5 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  Panel Wasit Resmi
                </span>
                <span className="text-xs text-zinc-400">ID: {verifiedReferee.discordId}</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Halo, {verifiedReferee.discordName}
              </h2>
              <p className="text-xs text-zinc-400">
                Tersedia {verifiedReferee.payroll.unclaimedMatchCount} pertandingan yang belum dicairkan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-2">
                <div className="text-[10px] text-zinc-500 uppercase">Tarif Honor</div>
                <div className="text-sm font-semibold text-rose-400">
                  Rp {verifiedReferee.payroll.feePerMatch.toLocaleString('id-ID')} / match
                </div>
              </div>

              {token && (
                <button
                  onClick={() => setIsClaimModalOpen(true)}
                  disabled={unclaimedMatches.length === 0}
                  className="rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-950 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  Ajukan Pencairan Honor
                </button>
              )}
            </div>
          </div>

          {/* Ringkasan Rekening & Riwayat Tiket Terakhir */}
          {verifiedReferee.payroll.bankInfo && (
            <div className="mt-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-400 flex flex-wrap gap-x-6 gap-y-1">
              <span>Rekening Tersimpan: <strong className="text-zinc-200">{verifiedReferee.payroll.bankInfo.bankName}</strong> - {verifiedReferee.payroll.bankInfo.accountNumber} (a.n {verifiedReferee.payroll.bankInfo.accountHolder})</span>
            </div>
          )}

          {/* Status Tiket Pengajuan Terakhir */}
          {verifiedReferee.payroll.payrollRequests.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Status Pengajuan Terbaru:
              </div>
              <div className="flex flex-wrap gap-2">
                {verifiedReferee.payroll.payrollRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px]"
                  >
                    <span className="font-mono text-zinc-400">{req.monthKey}</span>
                    <span className="text-zinc-300">
                      Rp {req.totalAmount.toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Roster Wasit */}
      {filteredReferees.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          Tidak ada data wasit yang sesuai dengan filter pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReferees.map((ref) => {
            const isAssigned = ref.activeMatches.length > 0;

            return (
              <div
                key={ref.discordId}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg transition hover:border-zinc-700"
              >
                <div>
                  {/* Profil Wasit */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-950 border border-rose-800/80 text-sm font-bold text-rose-300">
                        {ref.discordName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{ref.discordName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{ref.discordId}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isAssigned
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAssigned ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                        }`}
                      />
                      {isAssigned ? 'Bertugas' : 'Standby'}
                    </span>
                  </div>

                  {/* Statistik Jam Terbang */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Match Selesai</div>
                      <div className="text-base font-bold text-zinc-200">
                        {ref.totalFinishedMatches}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Tugas Berjalan</div>
                      <div className="text-base font-bold text-rose-400">
                        {ref.activeMatches.length}
                      </div>
                    </div>
                  </div>

                  {/* Match Aktif yang Sedang Dipimpin */}
                  {isAssigned && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-medium text-zinc-400 uppercase">
                        Sedang Memimpin:
                      </div>
                      <div className="space-y-1">
                        {ref.activeMatches.map((m) => (
                          <div
                            key={m.id}
                            className="rounded border border-emerald-900/50 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-300 flex justify-between"
                          >
                            <span>{m.teamAName} vs {m.teamBName}</span>
                            <span className="font-mono text-[10px] opacity-75">{m.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Kartu */}
                <div className="mt-4 border-t border-zinc-900 pt-3 text-right">
                  <span className="text-[10px] text-zinc-500">
                    Total Partisipasi: {ref.historyMatches.length + ref.activeMatches.length} Pertandingan
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Pengajuan Klaim Honor */}
      {verifiedReferee && token && (
        <RefereeClaim
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          token={token}
          feePerMatch={verifiedReferee.payroll?.feePerMatch || 10000}
          unclaimedMatches={unclaimedMatches}
          savedBankInfo={verifiedReferee.payroll?.bankInfo || null}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
