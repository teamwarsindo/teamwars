"use client";

import { useEffect, useState, useTransition, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { getCurrentWeek } from "@/app/tournament/_library";
import { RefereeProfile } from "@/app/tournament/_library/referee-types";
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
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";

function RefereePayrollContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | "ALL">("ALL");

  const [editingProfile, setEditingProfile] = useState<RefereeProfile | null>(null);
  const [payingReferee, setPayingReferee] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  // AMBIL PEKAN AKTIF LANGSUNG DARI LIBRARY TURNAMEN
  const activeWeeks = useMemo(() => {
    const current = typeof getCurrentWeek === "function" ? getCurrentWeek() : 3;
    const count = Math.min(Math.max(current, 1), 7);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, []);

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

  const handleCopySlip = (ref: any) => {
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
    <main className="flex-1 w-full max-w-6xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      <HeroHeader showDetails={false} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-xl font-black tracking-tight">
              Referee Performance & Payroll Hub
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Rekap kepemimpinan match, audit laporan mingguan, dan pembayaran honor wasit Season 7.
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

          {/* FILTER PEKAN SINKRON DENGAN LIBRARY */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Filter:
            </span>
            <button
              onClick={() => setSelectedWeek("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedWeek === "ALL"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Semua Pekan
            </button>
            {activeWeeks.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedWeek === w
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                Week {w}
              </button>
            ))}
          </div>

          {/* DAFTAR WASIT */}
          <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" /> Rincian Kinerja & Rekening
              </span>
              <span className="text-[10.5px] sm:text-xs text-muted-foreground font-semibold">
                Tarif: Rp 15.000 / Match
              </span>
            </div>

            <div className="space-y-2.5">
              {data.referees.map((ref: any) => {
                const matchCountForWeek =
                  selectedWeek === "ALL"
                    ? ref.totalMatches
                    : ref.weekBreakdown?.[selectedWeek] || 0;

                const filteredMatches =
                  selectedWeek === "ALL"
                    ? ref.matches
                    : ref.matches?.filter((m: any) => m.weekNumber === selectedWeek);

                const isExpanded = expandedRef === ref.name;

                return (
                  <div
                    key={ref.name}
                    className="rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition shadow-2xs overflow-hidden"
                  >
                    <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* SISI KIRI */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-foreground">{ref.name}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border shadow-2xs ${
                              ref.payoutStatus === "LUNAS"
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                                : ref.payoutStatus === "PARSIAL"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40"
                            }`}
                          >
                            {ref.payoutStatus === "LUNAS"
                              ? "Lunas"
                              : ref.payoutStatus === "PARSIAL"
                              ? "Parsial"
                              : "Belum Bayar"}
                          </span>
                        </div>

                        {/* PEKAN PILLS (HANYA MUNCULKAN PEKAN AKTIF SINKRON DENGAN LIBRARY) */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {activeWeeks.map((w) => {
                            const count = ref.weekBreakdown?.[w] || 0;
                            return (
                              <span
                                key={w}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${
                                  count > 0
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/40 border-border/40 text-muted-foreground/40"
                                }`}
                              >
                                W{w}: {count}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span>
                            Total: <strong>{matchCountForWeek}</strong> Match
                          </span>
                          <span>•</span>
                          <span className="font-bold text-foreground">
                            Rp {(matchCountForWeek * ref.feePerMatch).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>

                      {/* SISI KANAN */}
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
                            <span className="text-xs text-muted-foreground/60 italic">
                              Rekening belum diisi
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopySlip(ref)}
                            title="Salin Slip Pembayaran"
                            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
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
                              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {data.isAdmin && (
                            <button
                              type="button"
                              onClick={() => setPayingReferee(ref)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Bayar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedRef(isExpanded ? null : ref.name)}
                            className="p-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            title="Lihat Rincian Pertandingan"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL MATCH ACCORDION */}
                    {isExpanded && (
                      <div className="bg-background/80 border-t border-border/60 p-3 sm:p-4 space-y-2">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">
                          Daftar Laga yang Dipimpin:
                        </span>

                        {filteredMatches && filteredMatches.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredMatches.map((m: any) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-card text-xs font-semibold"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-black text-muted-foreground shrink-0">
                                    W{m.weekNumber}
                                  </span>
                                  <span className="truncate text-foreground">
                                    {m.teamAName} <strong className="text-primary">{m.scoreA}-{m.scoreB}</strong> {m.teamBName}
                                  </span>
                                </div>

                                <div>
                                  {m.hasReport ? (
                                    <a
                                      href={m.reportUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    >
                                      <ImageIcon className="h-3 w-3" /> Bukti
                                    </a>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-500">
                                      Tanpa Bukti
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Tidak ada pertandingan untuk pekan yang dipilih.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

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
    </main>
  );
}

export default function RefereePayrollPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar title="Referee Payroll" />
      <Suspense
        fallback={
          <div className="flex-1 py-20 text-center text-xs font-bold text-muted-foreground animate-pulse">
            ⏳ Memuat Payroll...
          </div>
        }
      >
        <RefereePayrollContent />
      </Suspense>
      <Footer />
    </div>
  );
    }
                          
