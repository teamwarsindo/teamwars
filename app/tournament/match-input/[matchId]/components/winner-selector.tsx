"use client";

import { MatchScheduleItem } from "@/lib/tournament";

interface WinnerSelectorProps {
  match: MatchScheduleItem;
  gameNumber: number;
  isFormReady: boolean;
  gameResult: "A" | "B" | "";
  setGameResult: (val: "A" | "B" | "") => void;
  onSaveGame: () => Promise<void>;
  disabledA?: boolean;
  disabledB?: boolean;
}

export function WinnerSelector({
  match,
  gameNumber,
  isFormReady,
  gameResult,
  setGameResult,
  onSaveGame,
  disabledA = false,
  disabledB = false,
}: WinnerSelectorProps) {
  return (
    <div className="space-y-3 pt-3 border-t border-border/40">
      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-foreground text-center">
        Pemenang Game #{gameNumber}
      </label>

      <div className="grid grid-cols-2 gap-3">
        {/* TOMBOL WIN TIM A */}
        <button
          type="button"
          disabled={!isFormReady || disabledA}
          onClick={() => setGameResult(gameResult === "A" ? "" : "A")}
          className={`py-3 px-2 rounded-xl font-black text-xs transition border flex items-center justify-center gap-2 cursor-pointer ${
            gameResult === "A"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
              : disabledA
              ? "bg-muted/30 border-border/20 text-muted-foreground/30 cursor-not-allowed line-through"
              : isFormReady
              ? "bg-background border-border text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/50"
              : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
          }`}
        >
          <img src={match.teamALogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain" />
          <span>[ WIN ] {match.teamAName}</span>
        </button>

        {/* TOMBOL WIN TIM B */}
        <button
          type="button"
          disabled={!isFormReady || disabledB}
          onClick={() => setGameResult(gameResult === "B" ? "" : "B")}
          className={`py-3 px-2 rounded-xl font-black text-xs transition border flex items-center justify-center gap-2 cursor-pointer ${
            gameResult === "B"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
              : disabledB
              ? "bg-muted/30 border-border/20 text-muted-foreground/30 cursor-not-allowed line-through"
              : isFormReady
              ? "bg-background border-border text-foreground hover:bg-emerald-500/10 hover:border-emerald-500/50"
              : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
          }`}
        >
          <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain" />
          <span>[ WIN ] {match.teamBName}</span>
        </button>
      </div>

      <button
        type="button"
        disabled={!isFormReady || !gameResult}
        onClick={onSaveGame}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md hover:bg-primary/90 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ➕ Simpan Log Game #{gameNumber}
      </button>
    </div>
  );
}