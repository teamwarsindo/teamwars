"use client";

import { useEffect, useState, useTransition, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { getCurrentServerWeek } from "@/app/tournament/_library";
import {
  RefereeAggregatedData,
  RefereeProfile,
} from "@/app/tournament/_library/referee-types";
import { PayrollMetrics } from "./_components/payroll-metrics";
import { EditProfileModal, PaymentModal } from "./_components/payroll-modals";
import { PayrollTable } from "./_components/payroll-table";
import { ShieldCheck, AlertTriangle } from "lucide-react";

function RefereePayrollContent() {
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
  const [payingReferee, setPayingReferee] = useState<{
    referee: RefereeAggregatedData;
    selectedWeeks: number[];
    amount: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeWeeks = useMemo(() => {
    const current = typeof getCurrentServerWeek === "function" ? getCurrentServerWeek() : 3;
    return Array.from({ length: Math.min(Math.max(current, 1), 7) }, (_, i) => i + 1);
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

  const handleCopySlip = (
    ref: RefereeAggregatedData,
    selectedWeeks: number[],
    totalAmount: number
  ) => {
    const weeksLabel =
      selectedWeeks.length === activeWeeks.length
        ? "Semua Pekan"
        : `Week ${selectedWeeks.join(", ")}`;

    const text = `[SLIP HONOR REFEREE TWI S7]\nNama: ${ref.name}\nPekan: ${weeksLabel}\nTotal Match: ${totalAmount / ref.feePerMatch} Match\nTotal Honor: Rp ${totalAmount.toLocaleString("id-ID")}\nRekening Tujuan: ${ref.profile?.bankName || "-"} ${ref.profile?.accountNumber || "-"} a/n ${ref.profile?.accountHolder || "-"}\n\nTerima kasih atas tugas kepemimpinannya!`;
    
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
          refereeName: payingReferee.referee.name,
          amountPaid: amount,
          paidWeeks: payingReferee.selectedWeeks,
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
    <main className="flex-1 w-full max-w-5xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
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
            Centang pekan untuk akumulasi gaji otomatis, audit laporan match, dan transfer honor.
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
          ⏳ Memuat rekap audit wasit...
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

          <PayrollTable
            referees={data.referees}
            activeWeeks={activeWeeks}
            isAdmin={data.isAdmin}
            copiedName={copiedName}
            onCopySlip={handleCopySlip}
            onEdit={(ref) =>
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
            onPay={(ref, selectedWeeks, totalAmount) =>
              setPayingReferee({
                referee: ref,
                selectedWeeks,
                amount: totalAmount,
              })
            }
          />
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
          referee={{
            ...payingReferee.referee,
            remainingUnpaid: payingReferee.amount,
          }}
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
        
