"use client";

import { useState } from "react";
import { RefereeAggregatedData } from "@/app/tournament/_library/referee-types";
import {
  Building2,
  Copy,
  Edit3,
  Receipt,
  Check,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from "lucide-react";

interface PayrollTableProps {
  referees: RefereeAggregatedData[];
  activeWeeks: number[];
  isAdmin: boolean;
  copiedName: string | null;
  onCopySlip: (ref: RefereeAggregatedData, selectedWeeks: number[], totalAmount: number) => void;
  onEdit: (ref: RefereeAggregatedData) => void;
  onPay: (ref: RefereeAggregatedData, selectedWeeks: number[], totalAmount: number) => void;
}

export function PayrollTable({
  referees,
  activeWeeks,
  isAdmin,
  copiedName,
  onCopySlip,
  onEdit,
  onPay,
}: PayrollTableProps) {
  // State pilihan checkbox week per wasit: { "AninKZ": [1, 2], "Vent": [1, 2, 3] }
  const [selectedWeeksMap, setSelectedWeeksMap] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    referees.forEach((r) => {
      // Default: centang semua pekan yang memiliki match
      const weeksWithMatches = activeWeeks.filter((w) => (r.weekBreakdown?.[w] || 0) > 0);
      init[r.name] = weeksWithMatches.length > 0 ? weeksWithMatches : activeWeeks;
    });
    return init;
  });

  const toggleWeek = (refName: string, week: number) => {
    setSelectedWeeksMap((prev) => {
      const current = prev[refName] || [];
      const updated = current.includes(week)
        ? current.filter((w) => w !== week)
        : [...current, week].sort((a, b) => a - b);
      return { ...prev, [refName]: updated };
    });
  };

  const selectAllWeeks = (refName: string) => {
    setSelectedWeeksMap((prev) => ({ ...prev, [refName]: [...activeWeeks] }));
  };

  return (
    <div className="space-y-3">
      {referees.map((ref) => {
        const checkedWeeks = selectedWeeksMap[ref.name] || [];
        
        // Filter laga berdasarkan pekan yang dicentang
        const activeMatches = ref.matches?.filter((m) => checkedWeeks.includes(m.weekNumber)) || [];
        const matchCount = activeMatches.length;
        const calculatedFee = matchCount * ref.feePerMatch;

        return (
          <div
            key={ref.name}
            className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-all duration-200"
          >
            {/* BARIS ATAS: PROFIL WASIT & STATUS PEMBAYARAN */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm shadow-2xs">
                  {ref.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-foreground tracking-tight">
                      {ref.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9.5px] font-black border tracking-wider uppercase shadow-2xs ${
                        ref.payoutStatus === "LUNAS"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : ref.payoutStatus === "PARSIAL"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {ref.payoutStatus === "LUNAS"
                        ? "Lunas"
                        : ref.payoutStatus === "PARSIAL"
                        ? "Parsial"
                        : "Belum Bayar"}
                    </span>
                  </div>
                  {ref.profile?.accountNumber ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium mt-0.5">
                      <Building2 className="h-3 w-3 text-primary shrink-0" />
                      {ref.profile.bankName} • {ref.profile.accountNumber} (a/n {ref.profile.accountHolder})
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 italic">
                      Rekening pembayaran belum diatur
                    </span>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onCopySlip(ref, checkedWeeks, calculatedFee)}
                  title="Salin Rincian Honor Terpilih"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {copiedName === ref.name ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Salin Slip</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onEdit(ref)}
                    title="Edit Nomor Rekening"
                    className="p-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onPay(ref, checkedWeeks, calculatedFee)}
                    disabled={calculatedFee === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground text-xs font-black transition shadow-sm cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Bayar Rp {calculatedFee.toLocaleString("id-ID")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* BARIS TENGAH: CHECKBOX PILLS PER PEKAN (MULTI-SELECT) */}
            <div className="pt-3 pb-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Pilih Pekan yang Dihitung / Dibayar:
                </span>
                <button
                  type="button"
                  onClick={() => selectAllWeeks(ref.name)}
                  className="text-[10.5px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Centang Semua
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {activeWeeks.map((w) => {
                  const countInWeek = ref.weekBreakdown?.[w] || 0;
                  const isChecked = checkedWeeks.includes(w);

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => toggleWeek(ref.name, w)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary shadow-xs scale-102"
                          : "bg-muted/30 border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5 opacity-60" />
                      )}
                      <span>Week {w}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          isChecked
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {countInWeek}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARIS BAWAH: RINCIAN LAGA YANG AKTIF DICENTANG */}
            <div className="mt-2 rounded-2xl bg-muted/30 border border-border/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  Total Terpilih: <strong className="text-primary">{matchCount} Match</strong>
                </span>
                <span className="font-black text-sm text-primary">
                  Akumulasi: Rp {calculatedFee.toLocaleString("id-ID")}
                </span>
              </div>

              {activeMatches.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {activeMatches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-card border border-border/60 px-2.5 py-1.5 text-xs font-semibold shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-black text-muted-foreground shrink-0">
                          W{m.weekNumber}
                        </span>
                        <span className="truncate text-foreground text-[11.5px]">
                          {m.teamAName}{" "}
                          <strong className="text-primary">
                            {m.scoreA}-{m.scoreB}
                          </strong>{" "}
                          {m.teamBName}
                        </span>
                      </div>

                      {m.hasReport ? (
                        <a
                          href={m.reportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 ml-1"
                        >
                          <ImageIcon className="h-3 w-3" /> Bukti
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500 shrink-0 ml-1">
                          No Bukti
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11.5px] text-muted-foreground/70 italic py-1 text-center">
                  Tidak ada pekan yang dicentang. Silakan centang minimal 1 pekan di atas.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
                      }
