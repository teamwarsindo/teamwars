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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border/80 bg-card text-foreground shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Pengajuan Pencairan Honor Wasit</h2>
            <p className="text-xs text-muted-foreground">Pilih pertandingan sah dan lengkapi detail rekening Anda</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                {errorMessage}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Daftar Pertandingan Belum Diklaim ({selectedMatches.length}/{unclaimedMatches.length})
                </label>
                {unclaimedMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {selectedMatches.length === unclaimedMatches.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {unclaimedMatches.length === 0 ? (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  Tidak ada pertandingan yang dapat dicairkan saat ini.
                </div>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/80 bg-muted/10 p-2">
                  {unclaimedMatches.map((m) => {
                    const isChecked = selectedMatches.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMatchSelection(m.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                          isChecked
                            ? 'border-blue-500/50 bg-blue-500/10 text-foreground'
                            : 'border-border/80 bg-card text-muted-foreground hover:border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-border text-blue-600 focus:ring-0"
                          />
                          <div>
                            <span className="font-semibold text-foreground">
                              {m.teamAName} vs {m.teamBName}
                            </span>
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              ({m.weekName || 'Babak Match'})
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
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

            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Informasi Rekening Tujuan
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    required
                    placeholder="BCA / Mandiri / GoPay"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Atas Nama Pemilik</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Estimasi Total Pencairan</div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedMatches.length} Match × Rp {feePerMatch.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-base font-black text-blue-600">{formattedTotal}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedMatches.length === 0}
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {isSubmitting ? 'Memproses...' : 'Kirim Permohonan Pencairan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );           
}
