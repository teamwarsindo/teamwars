"use client";

import Image from "next/image";
import { Trophy } from "lucide-react";
import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingPodiumProps {
  top1: PowerRankingPlayer | null;
  top2: PowerRankingPlayer | null;
  top3: PowerRankingPlayer | null;
  teamLogoMap: Map<string, string>;
}

export function PowerRankingPodium({
  top1,
  top2,
  top3,
  teamLogoMap,
}: PowerRankingPodiumProps) {
  const getPlayerLogo = (p: PowerRankingPlayer) => {
    return (
      p.teamLogo ||
      teamLogoMap.get(p.teamName.toLowerCase()) ||
      teamLogoMap.get(p.teamSlug.toLowerCase()) ||
      ""
    );
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-3 sm:p-4 shadow-sm">
      <div className="text-center mb-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-primary">
          Most Valuable Players
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-end">
        {/* 2ND PLACE (KIRI) */}
        {top2 ? (
          <div className="flex flex-col items-center bg-muted/20 border border-slate-300/30 rounded-2xl p-2 text-center relative pt-4">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-1.5">2nd</span>
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-slate-300 p-0.5 overflow-hidden mb-1.5 shadow-sm bg-background flex items-center justify-center">
              {getPlayerLogo(top2) ? (
                <Image
                  src={getPlayerLogo(top2)}
                  alt={top2.teamName}
                  width={52}
                  height={52}
                  className="rounded-full object-contain p-0.5"
                  unoptimized
                />
              ) : (
                <Trophy className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="font-bold text-xs text-foreground truncate w-full" title={top2.name}>
              {top2.name}
            </div>
            <div className="text-[9px] text-muted-foreground truncate w-full mb-2">
              {top2.teamName}
            </div>
            <div className="w-full border-t border-border/60 pt-1.5 space-y-0.5 font-mono text-[9px] sm:text-[10px]">
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Win</span>
                <span className="text-emerald-500 font-bold">{top2.won}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Lose</span>
                <span className="text-rose-500 font-bold">{top2.lost}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Play</span>
                <span className="text-foreground">{top2.played}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">WPM</span>
                <span className="text-foreground">{top2.wpm}</span>
              </div>
            </div>
          </div>
        ) : <div />}

        {/* 1ST PLACE (TENGAH) */}
        {top1 && (
          <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/40 rounded-2xl p-2.5 text-center relative -translate-y-1 shadow-md pt-5">
            <span className="text-xs font-black text-amber-500 uppercase mb-1.5">1st MVP</span>
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-amber-500 p-0.5 overflow-hidden mb-1.5 shadow-md bg-background flex items-center justify-center">
              {getPlayerLogo(top1) ? (
                <Image
                  src={getPlayerLogo(top1)}
                  alt={top1.teamName}
                  width={60}
                  height={60}
                  className="rounded-full object-contain p-0.5"
                  unoptimized
                />
              ) : (
                <Trophy className="h-7 w-7 text-amber-500" />
              )}
            </div>
            <div className="font-black text-xs sm:text-sm text-foreground truncate w-full" title={top1.name}>
              {top1.name}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate w-full mb-2">
              {top1.teamName}
            </div>
            <div className="w-full border-t border-amber-500/30 pt-1.5 space-y-0.5 font-mono text-[10px] sm:text-[11px]">
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Win</span>
                <span className="text-emerald-500 font-bold">{top1.won}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Lose</span>
                <span className="text-rose-500 font-bold">{top1.lost}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Play</span>
                <span className="text-foreground">{top1.played}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">WPM</span>
                <span className="text-foreground">{top1.wpm}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3RD PLACE (KANAN) */}
        {top3 ? (
          <div className="flex flex-col items-center bg-muted/20 border border-amber-700/30 rounded-2xl p-2 text-center relative pt-4">
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase mb-1.5">3rd</span>
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-amber-700/60 p-0.5 overflow-hidden mb-1.5 shadow-sm bg-background flex items-center justify-center">
              {getPlayerLogo(top3) ? (
                <Image
                  src={getPlayerLogo(top3)}
                  alt={top3.teamName}
                  width={52}
                  height={52}
                  className="rounded-full object-contain p-0.5"
                  unoptimized
                />
              ) : (
                <Trophy className="h-5 w-5 text-amber-700" />
              )}
            </div>
            <div className="font-bold text-xs text-foreground truncate w-full" title={top3.name}>
              {top3.name}
            </div>
            <div className="text-[9px] text-muted-foreground truncate w-full mb-2">
              {top3.teamName}
            </div>
            <div className="w-full border-t border-border/60 pt-1.5 space-y-0.5 font-mono text-[9px] sm:text-[10px]">
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Win</span>
                <span className="text-emerald-500 font-bold">{top3.won}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Lose</span>
                <span className="text-rose-500 font-bold">{top3.lost}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">Play</span>
                <span className="text-foreground">{top3.played}</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-muted-foreground">WPM</span>
                <span className="text-foreground">{top3.wpm}</span>
              </div>
            </div>
          </div>
        ) : <div />}
      </div>
    </div>
  );
                  }
