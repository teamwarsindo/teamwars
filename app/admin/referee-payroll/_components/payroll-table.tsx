import { RefereeAggregatedData } from "@/app/tournament/_library/referee-types";
import {
  Building2,
  Copy,
  Edit3,
  Receipt,
  Check,
  Image as ImageIcon,
} from "lucide-react";

interface PayrollTableProps {
  referees: RefereeAggregatedData[];
  selectedWeek: number | "ALL";
  isAdmin: boolean;
  copiedName: string | null;
  onCopySlip: (ref: RefereeAggregatedData) => void;
  onEdit: (ref: RefereeAggregatedData) => void;
  onPay: (ref: RefereeAggregatedData) => void;
}

export function PayrollTable({
  referees,
  selectedWeek,
  isAdmin,
  copiedName,
  onCopySlip,
  onEdit,
  onPay,
}: PayrollTableProps) {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-black uppercase text-muted-foreground tracking-wider">
              <th className="p-3.5 sm:p-4">Wasit</th>
              <th className="p-3.5 sm:p-4 text-center">Match</th>
              <th className="p-3.5 sm:p-4">Honor ({selectedWeek === "ALL" ? "Total" : `W${selectedWeek}`})</th>
              <th className="p-3.5 sm:p-4">Laga yang Dipimpin & Bukti Report</th>
              <th className="p-3.5 sm:p-4">Rekening Tujuan</th>
              <th className="p-3.5 sm:p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {referees.map((ref) => {
              const matches =
                selectedWeek === "ALL"
                  ? ref.matches
                  : ref.matches?.filter((m) => m.weekNumber === selectedWeek);

              const matchCount = matches?.length || 0;
              const earned = matchCount * ref.feePerMatch;

              if (selectedWeek !== "ALL" && matchCount === 0) return null;

              return (
                <tr key={ref.name} className="hover:bg-muted/20 transition">
                  {/* Wasit & Status */}
                  <td className="p-3.5 sm:p-4 align-top">
                    <div className="font-black text-sm text-foreground">{ref.name}</div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[9px] font-black border shadow-2xs ${
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
                  </td>

                  {/* Total Match */}
                  <td className="p-3.5 sm:p-4 align-top text-center">
                    <span className="inline-flex items-center justify-center rounded-lg bg-muted px-2.5 py-1 text-xs font-black text-foreground">
                      {matchCount}
                    </span>
                  </td>

                  {/* Honor */}
                  <td className="p-3.5 sm:p-4 align-top">
                    <div className="font-bold text-sm text-primary">
                      Rp {earned.toLocaleString("id-ID")}
                    </div>
                    {selectedWeek === "ALL" && ref.totalPaid > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Dibayar: Rp {ref.totalPaid.toLocaleString("id-ID")}
                      </div>
                    )}
                  </td>

                  {/* Rincian Laga Langsung Tampil */}
                  <td className="p-3.5 sm:p-4 align-top max-w-[280px]">
                    {matches && matches.length > 0 ? (
                      <div className="space-y-1.5">
                        {matches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 border border-border/50 px-2 py-1 text-[11px]"
                          >
                            <span className="truncate">
                              <strong className="text-muted-foreground mr-1">W{m.weekNumber}</strong>
                              {m.teamAName} <strong className="text-foreground">{m.scoreA}-{m.scoreB}</strong> {m.teamBName}
                            </span>
                            {m.hasReport ? (
                              <a
                                href={m.reportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 shrink-0"
                              >
                                <ImageIcon className="h-3 w-3" /> Bukti
                              </a>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-500 shrink-0">
                                No Bukti
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">-</span>
                    )}
                  </td>

                  {/* Rekening Tujuan */}
                  <td className="p-3.5 sm:p-4 align-top">
                    {ref.profile?.accountNumber ? (
                      <div>
                        <span className="font-bold text-xs text-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary shrink-0" />
                          {ref.profile.bankName} - {ref.profile.accountNumber}
                        </span>
                        <div className="text-[10.5px] text-muted-foreground">
                          a/n {ref.profile.accountHolder || "-"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">
                        Belum diisi
                      </span>
                    )}
                  </td>

                  {/* Aksi */}
                  <td className="p-3.5 sm:p-4 align-top text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => onCopySlip(ref)}
                        title="Salin Slip Pembayaran"
                        className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shadow-2xs"
                      >
                        {copiedName === ref.name ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onEdit(ref)}
                          title="Edit Rekening"
                          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onPay(ref)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Bayar</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
                              }
