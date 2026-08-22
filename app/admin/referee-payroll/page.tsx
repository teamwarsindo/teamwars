"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, Footer } from "@/components/layout-shared";
import {
  RefereeAggregatedData,
  RefereeProfile,
} from "@/app/tournament/_library/referee-types";
import { PayrollMetrics } from "./_components/payroll-metrics";
import { EditProfileModal, PaymentModal } from "./_components/payroll-modals";
import {
  ShieldCheck,
  Wallet,
  Copy,
  Edit3,
  Receipt,
  AlertTriangle,
  Check,
  Building2,
} from "lucide-react";

export default function RefereePayrollPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<{
    isAdmin: boolean;
    isChief: boolean;
    referees: RefereeAggregatedData[];
    summary: any;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<RefereeProfile | null>(null);
  const [payingReferee, setPayingReferee] = useState<RefereeAggregatedData | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = token ? `/api/referee/payroll?token=${token}` : `/api/referee/payroll`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.error) setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCopySlip = (ref: RefereeAggregatedData) => {
    const text = `[SLIP HONOR REFEREE TWI S7]\nNama: ${ref.name}\nTotal Match: ${ref.totalMatches} Match\nTotal Fee: Rp ${ref.totalEarned.toLocaleString("id-ID")}\nSudah Dibayar: Rp ${ref.totalPaid.toLocaleString("id-ID")}\nSisa Tagihan: Rp ${ref.remainingUnpaid.toLocaleString("id-ID")}\nRekening Tujuan: ${ref.profile?.bankName || "-"} ${ref.profile?.accountNumber || "-"} a/n ${ref.profile?.accountHolder || "-"}\n\nTerima kasih atas tugasnya!`;
    navigator.clipboard.writeText(text);
    setCopiedName(ref.name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const handleSaveProfile = (profile: RefereeProfile) => {
    startTransition(async () => {
      const res = await fetch("/api/referee/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setEditingProfile(null);
        fetchData();
      }
    });
  };

  const handleSavePayment = (amount: number, notes: string, receiptUrl: string) => {
    if (!payingReferee) return;
    startTransition(async () => {
      const res = await fetch("/api/referee/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refereeName: payingReferee.name,
          amountPaid: amount,
          notes,
          transferReceiptUrl: receiptUrl,
        }),
      });
      if (res.ok) {
        setPayingReferee(null);
        fetchData();
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar title="Referee Payroll" />

      <main className="flex-1 w-full max-w-6xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="text-base sm:text-xl font-black tracking-tight">
                Referee Performance & Payroll Hub
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Rekap kepemimpinan match, audit laporan, dan pembayaran honor wasit Season 7.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border shadow-2xs w-fit ${
              data?.isAdmin
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40"
            }`}
          >
            {data?.isAdmin ? "Mode Super Admin (Akses Penuh)" : "Mode Chief Referee (Masked)"}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-muted-foreground animate-pulse">
            ⏳ Memuat data rekap wasit...
          </div>
        ) : !data ? (
          <div className="py-16 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-muted-foreground">
              Akses ditolak. Token tidak valid atau sesi admin berakhir.
            </p>
          </div>
        ) : (
          <>
            <PayrollMetrics summary={data.summary} />

            <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-primary" /> Rincian Kinerja & Rekening
                </span>
                <span className="text-[10.5px] sm:text-xs text-muted-foreground font-semibold">
                  Tarif: Rp 15.000 / Match
                </span>
              </div>

              <div className="space-y-2">
                {data.referees.map((ref) => (
                  <div
                    key={ref.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition shadow-2xs"
                  >
                    <div className="flex items-start justify-between sm:justify-start gap-3 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">{ref.name}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border shadow-2xs ${
                              ref.payoutStatus === "LUNAS"
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                                : ref.payoutStatus === "PARSIAL"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40"
                            }`}
                          >
                            {ref.payoutStatus === "LUNAS" ? "Lunas" : ref.payoutStatus === "PARSIAL" ? "Parsial" : "Belum Bayar"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            <strong>{ref.totalMatches}</strong> Match Dipimpin
                          </span>
                          <span>•</span>
                          <span className="font-bold text-foreground">
                            Rp {ref.totalEarned.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                      <div className="text-left sm:text-right min-w-0">
                        {ref.profile?.accountNumber ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-foreground flex items-center sm:justify-end gap-1">
                              <Building2 className="h-3 w-3 text-primary" />
                              {ref.profile.bankName} - {ref.profile.accountNumber}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground truncate">
                              a/n {ref.profile.accountHolder || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Rekening belum diisi</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopySlip(ref)}
                          title="Salin Slip Pembayaran"
                          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition"
                        >
                          {copiedName === ref.name ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {data.isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingProfile(
                                ref.profile || {
                                  name: ref.name,
                                  bankName: "BCA",
                                  accountNumber: "",
                                  accountHolder: "",
                                  feePerMatch: 15000,
                                }
                              )
                            }
                            title="Edit Rekening"
                            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {data.isAdmin && (
                          <button
                            type="button"
                            onClick={() => setPayingReferee(ref)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold transition shadow-2xs"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Bayar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveProfile}
          isPending={isPending}
        />
      )}

      {payingReferee && (
        <PaymentModal
          referee={payingReferee}
          onClose={() => setPayingReferee(null)}
          onSave={handleSavePayment}
          isPending={isPending}
        />
      )}

      <Footer />
    </div>
  );
                    }
                    
