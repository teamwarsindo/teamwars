import { RefereeAggregatedData } from "@/app/tournament/_library/referee-types";
import {
  Building2,
  Copy,
  Edit3,
  Receipt,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";

interface RefereeCardItemProps {
  referee: RefereeAggregatedData;
  activeWeeks: number[];
  selectedWeek: number | "ALL";
  isAdmin: boolean;
  isExpanded: boolean;
  isCopied: boolean;
  onToggleExpand: () => void;
  onCopySlip: () => void;
  onEdit: () => void;
  onPay: () => void;
}

export function RefereeCardItem({
  referee: ref,
  activeWeeks,
  selectedWeek,
  isAdmin,
  isExpanded,
  isCopied,
  onToggleExpand,
  onCopySlip,
  onEdit,
  onPay,
}: RefereeCardItemProps) {
  const matchCountForWeek =
    selectedWeek === "ALL"
      ? ref.totalMatches
      : ref.weekBreakdown?.[selectedWeek] || 0;

  const filteredMatches =
    selectedWeek === "ALL"
      ? ref.matches
      : ref.matches?.filter((m) => m.weekNumber === selectedWeek);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition shadow-2xs overflow-hidden">
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Sisi Kiri: Profil & Breakdown Pekan */}
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

        {/* Sisi Kanan: Rekening & Aksi */}
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
              onClick={onCopySlip}
              title="Salin Slip Pembayaran"
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onEdit}
                title="Edit Rekening"
                className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={onPay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Bayar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
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

      {/* Accordion List Match */}
      {isExpanded && (
        <div className="bg-background/80 border-t border-border/60 p-3 sm:p-4 space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Daftar Laga yang Dipimpin:
          </span>

          {filteredMatches && filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-card text-xs font-semibold"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-black text-muted-foreground shrink-0">
                      W{m.weekNumber}
                    </span>
                    <span className="truncate text-foreground">
                      {m.teamAName}{" "}
                      <strong className="text-primary">
                        {m.scoreA}-{m.scoreB}
                      </strong>{" "}
                      {m.teamBName}
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
      }
