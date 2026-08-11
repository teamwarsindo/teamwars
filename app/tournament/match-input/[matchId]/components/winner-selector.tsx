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
        <label className="block text-[10px] font-bold text-muted-foreground uppercase">
          PEMENANG GAME #{gameNumber}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* WINNER TIM A [ W - L ] */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("A")}
            className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 cursor-pointer ${
              gameResult === "A"
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-6 w-6 object-contain shrink-0" />
            <div className="text-left leading-tight min-w-0">
              <span className="block font-black text-xs truncate">{match.teamAName}</span>
              <span className="text-[10px] opacity-80 font-bold">[ WINNER: W - L ]</span>
            </div>
          </button>

          {/* WINNER TIM B [ L - W ] */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("B")}
            className={`p-3 rounded-2xl border transition flex items-center justify-center gap-2 cursor-pointer ${
              gameResult === "B"
                ? "bg-rose-600 text-white border-rose-500 shadow-md scale-[1.01]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-6 w-6 object-contain shrink-0" />
            <div className="text-left leading-tight min-w-0">
              <span className="block font-black text-xs truncate">{match.teamBName}</span>
              <span className="text-[10px] opacity-80 font-bold">[ WINNER: L - W ]</span>
            </div>
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
