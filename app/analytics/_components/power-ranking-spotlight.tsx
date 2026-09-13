"use client";

import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingSpotlightProps {
  player: PowerRankingPlayer;
}

export function PowerRankingSpotlight({ player }: PowerRankingSpotlightProps) {
  return (
    <div className="sticky top-14 z-20 w-full backdrop-blur-md bg-card/90 border border-primary/20 rounded-xl p-3 sm:p-4 shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* Sisi Kiri: Rank 1st, Logo Tim & Identitas Pemain */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-baseline font-black leading-none text-primary select-none shrink-0">
            <span className="text-2xl sm:text-4xl">1</span>
            <span className="text-xs sm:text-sm italic">st</span>
          </div>

          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg bg-muted/40 border border-border/40 p-1 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={player.teamLogo || "/logo.webp"}
              alt={player.teamName}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 flex flex-col">
            <span className="text-xs sm:text-base font-extrabold text-foreground truncate tracking-tight">
              {player.name}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate uppercase">
              {player.teamName}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Metrik Performa (P/W/L, WPM, AGG) */}
        <div className="flex items-center gap-2 sm:gap-5 shrink-0 text-center">
          {/* P / W / L */}
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">
              P / W / L
            </span>
            <span className="text-[11px] sm:text-sm font-black text-foreground">
              {player.played} / {player.won} / {player.lost}
            </span>
          </div>

          {/* WPM */}
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">
              WPM
            </span>
            <span className="text-[11px] sm:text-sm font-black text-primary">
              {player.wpm.toFixed(2)}
            </span>
          </div>

          {/* AGG */}
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">
              AGG
            </span>
            <span
              className={`text-[11px] sm:text-sm font-black ${
                player.agg > 0
                  ? "text-emerald-500"
                  : player.agg < 0
                  ? "text-rose-500"
                  : "text-muted-foreground"
              }`}
            >
              {player.agg > 0 ? `+${player.agg}` : player.agg}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
          }
