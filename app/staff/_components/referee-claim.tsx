'use client';

import React, { useState } from 'react';

interface MatchItem {
  id: string;
  matchDate?: string;
  weekName?: string;
  teamAName: string;
  teamBName: string;
  scoreA?: number;
  scoreB?: number;
}

interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface RefereeClaimProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  feePerMatch: number;
  unclaimedMatches: MatchItem[];
  savedBankInfo?: BankInfo | null;
  onSuccess: () => void;
}

export default function RefereeClaim({
  isOpen,
  onClose,
  token,
  feePerMatch,
  unclaimedMatches,
  savedBankInfo,
  onSuccess,
}: RefereeClaimProps) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [bankName, setBankName] = useState(savedBankInfo?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(savedBankInfo?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(savedBankInfo?.accountHolder || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatches((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMatches.length === unclaimedMatches.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(unclaimedMatches.map((m) => m.id));
    }
  };

  const totalHonor = selectedMatches.length * feePerMatch;

  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(totalHonor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedMatches.length === 0) {
      setErrorMessage('Pilih minimal 1 pertandingan yang ingin dicairkan.');
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setErrorMessage('Mohon lengkapi seluruh rincian informasi rekening bank/e-wallet.');
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
        throw new Error(data.message || 'Gagal mengirim pengajuan honor.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memproses permohonan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Pengajuan Pencairan Honor Wasit</h2>
            <p className="text-xs text-zinc-400">Pilih pertandingan sah dan lengkapi detail rekening Anda</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Match Selection Section */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Daftar Pertandingan Belum Diklaim ({selectedMatches.length}/{unclaimedMatches.length})
                </label>
                {unclaimedMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    {selectedMatches.length === unclaimedMatches.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {unclaimedMatches.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center text-xs text-zinc-500">
                  Tidak ada pertandingan yang dapat dicairkan saat ini.
                </div>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2">
                  {unclaimedMatches.map((m) => {
                    const isChecked = selectedMatches.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMatchSelection(m.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-md border p-2.5 text-xs transition ${
                          isChecked
                            ? 'border-rose-900/80 bg-rose-950/20 text-white'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0"
                          />
                          <div>
                            <span className="font-semibold text-zinc-200">
                              {m.teamAName} vs {m.teamBName}
                            </span>
                            <span className="ml-2 text-[10px] text-zinc-500">
                              ({m.weekName || 'Babak Match'})
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {m.scoreA !== undefined && m.scoreB !== undefined
                            ? `${m.scoreA} - ${m.scoreB}`
                            : m.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bank Information Section */}
            <div className="space-y-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Informasi Rekening Tujuan
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    required
                    placeholder="BCA / Mandiri / GoPay"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Atas Nama Pemilik</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Pemilik"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-between rounded-lg border border-rose-950/60 bg-rose-950/20 px-4 py-3">
              <div>
                <div className="text-xs text-zinc-400">Estimasi Total Pencairan</div>
                <div className="text-[11px] text-zinc-500">
                  {selectedMatches.length} Match × Rp {feePerMatch.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-lg font-bold text-rose-400">{formattedTotal}</div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedMatches.length === 0}
              className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-950 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Memproses Pengajuan...' : 'Kirim Permohonan Pencairan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}                                         
