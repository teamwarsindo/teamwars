'use client';

import React, { useState } from 'react';
import { RefereeData } from './referee-tab';

interface RefereePrivatePanelProps {
  verifiedReferee: RefereeData;
  token: string;
  selectedWeek: string;
  onRefresh: () => void;
}

export default function RefereePrivatePanel({
  verifiedReferee,
  token,
  selectedWeek,
  onRefresh,
}: RefereePrivatePanelProps) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [bankName, setBankName] = useState(
    verifiedReferee.payroll?.bankInfo?.bankName || ''
  );
  const [accountNumber, setAccountNumber] = useState(
    verifiedReferee.payroll?.bankInfo?.accountNumber || ''
  );
  const [accountHolder, setAccountHolder] = useState(
    verifiedReferee.payroll?.bankInfo?.accountHolder || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  const feePerMatch = verifiedReferee.payroll?.feePerMatch || 10000;

  const unclaimedMatches = verifiedReferee.historyMatches.filter(
    (m) =>
      !verifiedReferee.payroll?.claimedMatchIds.includes(m.id) &&
      (selectedWeek === 'ALL' || (m.weekName || `Week ${m.weekNumber}`) === selectedWeek)
  );

  const handleToggleMatch = (mId: string) => {
    setSelectedMatches((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMatches.length === unclaimedMatches.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(unclaimedMatches.map((m) => m.id));
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    setClaimSuccess('');

    if (selectedMatches.length === 0) {
      setClaimError('Pilih minimal 1 pertandingan yang ingin dicairkan.');
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setClaimError('Mohon lengkapi informasi rekening tujuan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tournament/staff/payroll/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          matchIds: selectedMatches,
          bankInfo: {
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengajukan honor.');
      }
      setClaimSuccess('Pengajuan honor berhasil dikirim dan menunggu persetujuan admin!');
      setSelectedMatches([]);
      onRefresh();
    } catch (err: any) {
      setClaimError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-card p-6 shadow-sm space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-base font-black text-white shadow-md">
            {verifiedReferee.discordName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-500/20">
              Wasit Terverifikasi
            </span>
            <h1 className="text-xl font-bold text-foreground">{verifiedReferee.discordName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border/80 bg-background px-4 py-2 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Honor / Match</div>
            <div className="text-sm font-bold text-blue-600">
              Rp {feePerMatch.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-background px-4 py-2 text-center">
            <div className="text-[10px] uppercase text-muted-foreground">Siap Dicairkan</div>
            <div className="text-sm font-bold text-emerald-600">
              {unclaimedMatches.length} Match
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleClaimSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Match Untuk Dicairkan ({selectedMatches.length}/{unclaimedMatches.length})
          </h2>
          {unclaimedMatches.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {selectedMatches.length === unclaimedMatches.length ? 'Batal Semua' : 'Pilih Semua'}
            </button>
          )}
        </div>

        {claimError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
            {claimError}
          </div>
        )}
        {claimSuccess && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600">
            {claimSuccess}
          </div>
        )}

        {unclaimedMatches.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            Tidak ada match yang siap dicairkan pada periode pekan ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
            {unclaimedMatches.map((m) => {
              const isChecked = selectedMatches.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => handleToggleMatch(m.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition ${
                    isChecked
                      ? 'border-blue-500/60 bg-blue-500/10 text-foreground'
                      : 'border-border/80 bg-background/80 text-muted-foreground hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-border text-blue-600"
                    />
                    <span className="font-semibold">{m.teamAName} vs {m.teamBName}</span>
                  </div>
                  <span className="text-[10px] opacity-75">{m.weekName || 'Match'}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/10 p-3.5">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Bank / E-Wallet</label>
            <input
              type="text"
              required
              placeholder="BCA / Mandiri / GoPay"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">No. Rekening</label>
            <input
              type="text"
              required
              placeholder="1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Atas Nama</label>
            <input
              type="text"
              required
              placeholder="Nama Pemilik"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div>
            <span className="text-xs text-muted-foreground">Estimasi Dicairkan:</span>
            <div className="text-base font-black text-blue-600">
              Rp {(selectedMatches.length * feePerMatch).toLocaleString('id-ID')}
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || selectedMatches.length === 0}
            className="rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 transition"
          >
            {isSubmitting ? 'Memproses...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
}
