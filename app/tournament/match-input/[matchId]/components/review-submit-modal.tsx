"use client";

import { useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

export function ReviewSubmitModal({
  open,
  onClose,
  match,
  referee,
  streamer,
  gameLogs,
  isSaving,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  match: MatchScheduleItem;
  referee: string;
  streamer: string;
  gameLogs: GameDetailLog[];
  isSaving: boolean;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  const countWinsA = gameLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
  const countWinsB = gameLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="glass glow-border flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-popover/90 shadow-2xl animate-in zoom-in-95">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="text-base font-extrabold text-foreground">Review Laporan Match Report</h2>
          <button onClick={onClose} disabled={isSaving} className="rounded-full p-1.5 hover:bg-muted transition">
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl border border-border/40">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Matchup</span>
              <span className="font-extrabold text-foreground">
                {match.teamAName} vs {match.teamBName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Petugas Wasit / Streamer</span>
              <span className="font-semibold text-foreground">
                {referee || "Analyst"} / {streamer || "-"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-center">
            <span className="text-[10px] font-bold text-primary uppercase block">Rekapitulasi Game Logs</span>
            <span className="text-lg font-black text-foreground">
              {match.teamAName} ({countWinsA}) - ({countWinsB}) {match.teamBName}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Total {gameLogs.length} log game akan dikunci ke dalam sistem KV.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-foreground block">Rincian Per Game:</span>
            <div className="divide-y border rounded-xl overflow-hidden bg-background">
              {gameLogs.map((g, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-[11px]">
                  <span>
                    <b>Game {idx + 1}:</b> {g.playerAName} ({g.deckA}) vs {g.playerBName} ({g.deckB})
                  </span>
                  <span className="font-black text-primary">
                    WIN: {g.winnerTeamId === match.teamAId ? match.teamAName : match.teamBName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="flex items-center justify-end gap-3 border-t bg-muted/10 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl px-4 py-2 text-xs font-bold hover:bg-muted transition"
          >
            Kembali Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="rounded-xl bg-primary px-6 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Memproses..." : "Konfirmasi & Simpan Permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}