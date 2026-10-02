'use client';

import React, { useState } from 'react';
import { BaseStaffData as RefereeData } from '../_library/staff-metrics';

interface AdminApprovalTabProps {
  referees: RefereeData[];
  onRefresh: () => void;
}

export default function AdminApprovalTab({
  referees,
  onRefresh,
}: AdminApprovalTabProps) {
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [declineInputs, setDeclineInputs] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Kumpulkan seluruh tiket yang berstatus PENDING dari semua wasit
  const pendingRequests: Array<{
    refereeDiscordId: string;
    refereeDiscordName: string;
    bankInfo: any;
    request: any;
  }> = [];

  referees.forEach((ref) => {
    const list = (ref as any).payrollRequests || ref.payroll?.payrollRequests || [];
    const bank = (ref as any).bankInfo || ref.payroll?.bankInfo || null;

    list.forEach((req: any) => {
      if (req.status === 'PENDING') {
        pendingRequests.push({
          refereeDiscordId: ref.discordId,
          refereeDiscordName: ref.discordName,
          bankInfo: bank,
          request: req,
        });
      }
    });
  });

  const handleAction = async (
    requestId: string,
    refereeDiscordId: string,
    action: 'APPROVE' | 'DECLINE'
  ) => {
    setActionError(null);
    const proofUrl = proofInputs[requestId]?.trim() || '';
    const declineReason = declineInputs[requestId]?.trim() || '';

    if (action === 'APPROVE' && !proofUrl) {
      setActionError(`URL Bukti transfer wajib diisi untuk menyetujui tiket ${requestId}.`);
      return;
    }

    if (action === 'DECLINE' && !declineReason) {
      setActionError(`Alasan penolakan wajib diisi untuk menolak tiket ${requestId}.`);
      return;
    }

    setProcessingId(requestId);
    try {
      const res = await fetch('/api/tournament/staff/payroll/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          refereeDiscordId,
          action,
          proofUrl,
          declineReason,
          adminName: 'Admin Team Wars',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memproses tindakan admin.');
      }

      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
          {actionError}
        </div>
      )}

      {pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground">
          ✨ Tidak ada permohonan pencairan honor yang menunggu persetujuan saat ini.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(({ refereeDiscordId, refereeDiscordName, bankInfo, request }) => {
            const isProcessing = processingId === request.requestId;

            return (
              <div
                key={request.requestId}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{refereeDiscordName}</span>
                      <span className="text-[11px] text-muted-foreground">({refereeDiscordId})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Diajukan pada: {new Date(request.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground">Total Pencairan:</span>
                    <div className="text-base font-black text-blue-600">
                      Rp {(request.totalAmount || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      Rekening Tujuan
                    </div>
                    <div><strong>Bank/E-Wallet:</strong> {bankInfo?.bankName || '-'}</div>
                    <div><strong>No Rekening:</strong> {bankInfo?.accountNumber || '-'}</div>
                    <div><strong>Atas Nama:</strong> {bankInfo?.accountHolder || '-'}</div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                      Match yang Diklaim ({request.matchIds?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {request.matchIds?.map((id: string) => (
                        <span key={id} className="rounded bg-background border border-border/60 px-1.5 py-0.5 text-[10px] font-mono">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="URL Gambar / Link Bukti Transfer..."
                      value={proofInputs[request.requestId] || ''}
                      onChange={(e) =>
                        setProofInputs((prev) => ({ ...prev, [request.requestId]: e.target.value }))
                      }
                      className="flex-1 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(request.requestId, refereeDiscordId, 'APPROVE')}
                      className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Setujui
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Alasan penolakan jika ditolak..."
                      value={declineInputs[request.requestId] || ''}
                      onChange={(e) =>
                        setDeclineInputs((prev) => ({ ...prev, [request.requestId]: e.target.value }))
                      }
                      className="flex-1 rounded-xl border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-red-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(request.requestId, refereeDiscordId, 'DECLINE')}
                      className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
