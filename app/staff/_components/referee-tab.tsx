'use client';

import { useState } from 'react';
import Image from 'next/image';

interface RefereeTabProps {
  referees: any[];
  token: string | null;
  isAdmin: boolean;
  selectedStaffId: string;
  currentVerifiedId: string | null;
  onRefresh: () => void;
}

export function RefereeTab({
  referees,
  token,
  isAdmin,
  selectedStaffId,
  currentVerifiedId,
  onRefresh,
}: RefereeTabProps) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Filter daftar wasit berdasarkan selektor
  const displayedReferees =
    selectedStaffId === 'ALL'
      ? referees
      : referees.filter((ref) => ref.discordId === selectedStaffId);

  // Kalkulasi untuk Diagram Rekap Jam Terbang
  const totalMatchesAll = referees.reduce((sum, r) => sum + (r.totalFinishedMatches || 0), 0);

  // Handler pengajuan klaim honor in-page
  const handleClaimSubmit = async (e: React.FormEvent, verifiedRef: any) => {
    e.preventDefault();
    if (!token || selectedMatches.length === 0) return;

    try {
      setIsSubmitting(true);
      setClaimMessage(null);

      const res = await fetch('/api/tournament/staff/payroll/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          matchIds: selectedMatches,
          bankInfo: {
            bankName: bankName.trim() || verifiedRef.payroll?.bankInfo?.bankName,
            accountNumber: accountNumber.trim() || verifiedRef.payroll?.bankInfo?.accountNumber,
            accountHolder: accountHolder.trim() || verifiedRef.payroll?.bankInfo?.accountHolder,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setClaimMessage({ text: 'Klaim honor berhasil diajukan!', success: true });
        setSelectedMatches([]);
        onRefresh();
      } else {
        setClaimMessage({ text: json.message || 'Gagal mengajukan klaim honor.', success: false });
      }
    } catch {
      setClaimMessage({ text: 'Terjadi kendala jaringan saat mengajukan klaim.', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedReferee = referees.find((r) => r.discordId === currentVerifiedId);

  return (
    <div className="w-full space-y-8">
      {/* 1. VISUALISASI REKAP JAM TERBANG WASIT */}
      {selectedStaffId === 'ALL' && referees.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              📊 Distribusi Jam Terbang Wasit
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              Total {totalMatchesAll} Pertandingan
            </span>
          </div>

          <div className="space-y-3">
            {referees.map((ref) => {
              const count = ref.totalFinishedMatches || 0;
              const percentage = totalMatchesAll > 0 ? Math.round((count / totalMatchesAll) * 100) : 0;

              return (
                <div key={ref.discordId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{ref.discordName}</span>
                    <span className="font-mono text-muted-foreground">
                      {count} Match ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PANEL PRIVAT WASIT TERVERIFIKASI */}
      {verifiedReferee && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-primary/40 bg-card">
                <Image
                  src={verifiedReferee.avatar}
                  alt={verifiedReferee.discordName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{verifiedReferee.discordName}</h3>
                <p className="text-xs text-muted-foreground">Panel Pribadi Wasit Terverifikasi</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/80 px-4 py-2.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Honor Diterima</div>
              <div className="font-mono text-lg font-black text-emerald-500">
                Rp {((verifiedReferee.visibleHonor || 0)).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* FORMULIR KLAIM IN-PAGE */}
          {verifiedReferee.payroll && (
            <form onSubmit={(e) => handleClaimSubmit(e, verifiedReferee)} className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-card/70 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Pilih Match yang Ingin Dicairkan
                </h4>
                {verifiedReferee.historyMatches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada riwayat pertandingan selesai.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {verifiedReferee.historyMatches.map((m: any) => {
                      const isClaimed = verifiedReferee.payroll.claimedMatchIds.includes(m.id);
                      const isSelected = selectedMatches.includes(m.id);

                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                            isClaimed
                              ? 'cursor-not-allowed border-border/40 bg-muted/20 opacity-50'
                              : isSelected
                              ? 'cursor-pointer border-primary bg-primary/10 text-foreground'
                              : 'cursor-pointer border-border/80 hover:bg-muted/40'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{m.teamAName}</span> vs <span className="font-bold">{m.teamBName}</span>
                            <div className="text-[10px] text-muted-foreground">{m.weekName}</div>
                          </div>
                          <input
                            type="checkbox"
                            disabled={isClaimed}
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMatches([...selectedMatches, m.id]);
                              else setSelectedMatches(selectedMatches.filter((id) => id !== m.id));
                            }}
                            className="rounded border-border accent-primary"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Nama Bank / E-Wallet"
                  defaultValue={verifiedReferee.payroll.bankInfo?.bankName || ''}
                  onChange={(e) => setBankName(e.target.value)}
                  className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Nomor Rekening"
                  defaultValue={verifiedReferee.payroll.bankInfo?.accountNumber || ''}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Atas Nama"
                  defaultValue={verifiedReferee.payroll.bankInfo?.accountHolder || ''}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              {claimMessage && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${claimMessage.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {claimMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || selectedMatches.length === 0}
                className="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses Klaim...' : `Ajukan Klaim (${selectedMatches.length} Match)`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. ROSTER GRID WASIT */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedReferees.map((ref) => (
          <div key={ref.discordId} className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-md transition-all hover:border-border">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/80 bg-muted/40">
                  <Image
                    src={ref.avatar}
                    alt={ref.discordName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{ref.discordName}</h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                    🟢 {ref.totalFinishedMatches} Match Selesai
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                <span className="text-muted-foreground">Total Honor</span>
                <span className="font-mono font-bold text-foreground">
                  {ref.visibleHonor !== null ? `Rp ${ref.visibleHonor.toLocaleString('id-ID')}` : 'Rp ***'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );  
}                 
