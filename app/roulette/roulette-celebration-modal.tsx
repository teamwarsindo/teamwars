"use client";

import { useState } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

interface RouletteCelebrationModalProps {
  celebrationWinner: TeamItem;
  groupA: TeamItem[];
  isAdmin: boolean;
  onClose: () => void;
}

export function RouletteCelebrationModal({
  celebrationWinner,
  groupA,
  isAdmin,
  onClose,
}: RouletteCelebrationModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isGroupA = groupA.some((t) => t.name === celebrationWinner.name);

  // 🟢 Handler untuk trigger API sync jadwal lalu tutup modal
  const handleContinue = async () => {
    try {
      setIsUpdating(true);
      await fetch("/api/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "SYNC_ROULETTE" }),
      });
    } catch (error) {
      console.error("Gagal update jadwal:", error);
    } finally {
      setIsUpdating(false);
      onClose(); // Lanjutkan/Tutup modal setelah API selesai dipanggil
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-2xl">
        <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary mb-4 border border-primary/20">
          🎉 TIM TERPILIH!
        </span>

        <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-2">
          {celebrationWinner.logo ? (
            <img
              src={celebrationWinner.logo}
              alt={celebrationWinner.name}
              className="h-full w-full object-cover rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.webp";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
              N/A
            </div>
          )}
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-2">
          {celebrationWinner.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Berhasil dialokasikan ke{" "}
          <span className="font-bold text-primary">
            {isGroupA ? "Group A" : "Group B"}
          </span>
        </p>

        {isAdmin ? (
          <button
            onClick={handleContinue}
            disabled={isUpdating}
            className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? "MENGUPDATE JADWAL..." : "LANJUTKAN PENGUNDIAN ➔"}
          </button>
        ) : (
          <div className="rounded-xl bg-muted/50 p-3 text-xs font-medium text-muted-foreground animate-pulse">
            ⏳ Menunggu Panitia Melanjutkan Pengundian...
          </div>
        )}
      </div>
    </div>
  );
}
