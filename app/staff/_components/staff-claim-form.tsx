'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { BaseStaffData } from '../_library/staff-metrics';

interface StaffClaimFormProps {
  verifiedReferee: BaseStaffData;
  token: string;
  selectedMatches: string[];
  onClaimSuccess: () => void;
}

export default function StaffClaimForm({
  verifiedReferee,
  token,
  selectedMatches,
  onClaimSuccess,
}: StaffClaimFormProps) {
  const [bankName, setBankName] = useState(verifiedReferee.payroll?.bankInfo?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(verifiedReferee.payroll?.bankInfo?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(verifiedReferee.payroll?.bankInfo?.accountHolder || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const feePerMatch = verifiedReferee.payroll?.feePerMatch || 10000;
  const estimatedTotal = selectedMatches.length * feePerMatch;

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedMatches.length === 0) return;
    setIsSubmitting(true);
    setClaimMsg(null);

    try {
      const res = await fetch('/api/tournament/staff/payroll/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          matchIds: selectedMatches,
          bankInfo: { bankName, accountNumber, accountHolder },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengajukan honor.');

      setClaimMsg({ type: 'ok', text: 'Pengajuan honor berhasil dikirim dan menunggu persetujuan admin!' });
      onClaimSuccess();
    } catch (err: any) {
      setClaimMsg({ type: 'err', text: err.message || 'Terjadi kesalahan sistem saat mengajukan honor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleClaimSubmit} className="pt-3 border-t border-border/60 space-y-3">
      {claimMsg && (
        <div
          className={`p-2.5 rounded-xl text-xs font-bold ${
            claimMsg.type === 'ok'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
          }`}
        >
          {claimMsg.text}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          required
          placeholder="Bank / E-Wallet (BCA/GoPay)"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          required
          placeholder="Nomor Rekening"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          required
          placeholder="Atas Nama Pemilik"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          className="rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground font-semibold">
          Dipilih: {selectedMatches.length} Laga (Rp {estimatedTotal.toLocaleString('id-ID')})
        </span>
        <button
          type="submit"
          disabled={isSubmitting || selectedMatches.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 transition cursor-pointer"
        >
          <Send className="h-3 w-3" />
          <span>{isSubmitting ? 'Memproses...' : 'Klaim Honor'}</span>
        </button>
      </div>
    </form>
  );
}