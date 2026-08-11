"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

interface WinnerSelectorProps {
  match: MatchScheduleItem;
  gameNumber: number;
  isFormReady: boolean;
  gameResult: "A" | "B" | "";
  setGameResult: (val: "A" | "B") => void;
  onSaveGame: () => void;
}

export function WinnerSelector({
  match,
  gameNumber,
  isFormReady,
  gameResult,
  setGameResult,
  onSaveGame,
}: WinnerSelectorProps) {
  const isWinnerSelected = Boolean(gameResult !== "");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-muted-foreground uppercase text-center">
          PEMENANG GAME #{gameNumber}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* WINNER TIM A (TANPA TEKS NAMA TIM YANG KEPANJANGAN) */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("A")}
            className={`py-3 px-2 rounded-2xl border transition flex items-center justify-center gap-2 cursor-pointer ${
              gameResult === "A"
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-7 w-7 object-contain shrink-0" />
            <span className="font-black text-xs tracking-wider uppercase">[ WIN ]</span>
          </button>

          {/* WINNER TIM B (TANPA TEKS NAMA TIM YANG KEPANJANGAN) */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("B")}
            className={`py-3 px-2 rounded-2xl border transition flex items-center justify-center gap-2 cursor-pointer ${
              gameResult === "B"
                ? "bg-rose-600 text-white border-rose-500 shadow-md scale-[1.01]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-7 w-7 object-contain shrink-0" />
            <span className="font-black text-xs tracking-wider uppercase">[ WIN ]</span>
          </button>
        </div>
      </div>

      {/* TOMBOL SIMPAN LOG GAME */}
      <button
        type="button"
        disabled={!isWinnerSelected}
        onClick={onSaveGame}
        className="w-full py-3.5 rounded-2xl bg-primary font-extrabold text-xs text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        ➕ Simpan Log Game #{gameNumber}
      </button>
    </div>
  );
}
