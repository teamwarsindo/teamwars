import { CheckCircle2, Clock } from "lucide-react";

interface MetricsProps {
  summary: {
    totalMatchesHandled: number;
    totalPayrollBudget: number;
    totalPaidOut: number;
    totalPendingPayout: number;
  };
}

export function PayrollMetrics({ summary }: MetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-2xs">
        <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">
          Match Selesai
        </span>
        <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">
          {summary.totalMatchesHandled} <span className="text-xs font-semibold text-muted-foreground">Match</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-2xs">
        <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase">
          Total Anggaran
        </span>
        <p className="text-lg sm:text-2xl font-black text-primary mt-0.5">
          Rp {summary.totalPayrollBudget.toLocaleString("id-ID")}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-4 shadow-2xs">
        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Sudah Dibayar
        </span>
        <p className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
          Rp {summary.totalPaidOut.toLocaleString("id-ID")}
        </p>
      </div>

      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 sm:p-4 shadow-2xs">
        <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1">
          <Clock className="h-3 w-3" /> Sisa Tagihan
        </span>
        <p className="text-lg sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
          Rp {summary.totalPendingPayout.toLocaleString("id-ID")}
        </p>
      </div>
    </div>
  );
}
