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

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-medium">0</span>;
  };

  return (
    <div className="sticky top-[60px] sm:top-[66px] z-20 bg-background/95 backdrop-blur-md pt-1 pb-2">
      <div className="rounded-2xl border border-border/90 bg-card/95 p-2 sm:p-2.5 shadow-md">
        <div className="text-center mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Top 3 MVP Players
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 items-end">
          {/* ── 2ND PLACE (SILVER) ── */}
          {top2 ? (
            <div className="flex flex-col items-center bg-slate-300/10 border border-slate-300/40 rounded-xl p-1.5 text-center relative">
              <span className="text-[9px] font-black text-slate-400 uppercase leading-tight">2nd</span>
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-slate-300 overflow-hidden my-1 bg-background flex items-center justify-center shrink-0">
                {getPlayerLogo(top2) ? (
                  <Image
                    src={getPlayerLogo(top2)}
                    alt={top2.teamName}
                    width={40}
                    height={40}
                    className="rounded-full object-contain p-0.5"
                    unoptimized
                  />
                ) : (
                  <Trophy className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="font-bold text-[11px] text-foreground truncate w-full" title={top2.name}>
                {top2.name}
              </div>
              <div className="text-[8px] text-muted-foreground truncate w-full mb-1">
                {top2.teamName}
              </div>
              <div className="w-full border-t border-border/60 pt-1 space-y-0.5 font-mono text-[8px] sm:text-[9px]">
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Played</span>
                  <span className="text-foreground font-medium">{top2.played}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Win</span>
                  <span className="text-emerald-500 font-bold">{top2.won}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Lose</span>
                  <span className="text-rose-500 font-bold">{top2.lost}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">WPM</span>
                  <span className="text-foreground">{top2.wpm}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Agg</span>
                  <span>{renderAgg(top2.agg)}</span>
                </div>
              </div>
            </div>
          ) : <div />}

          {/* ── 1ST PLACE (GOLD) ── */}
          {top1 && (
            <div className="flex flex-col items-center bg-amber-500/15 border-2 border-amber-500/60 rounded-xl p-1.5 sm:p-2 text-center relative -translate-y-1 shadow-md">
              <span className="text-[10px] font-black text-amber-500 uppercase leading-tight">1st MVP</span>
              <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-amber-500 overflow-hidden my-1 bg-background flex items-center justify-center shrink-0">
                {getPlayerLogo(top1) ? (
                  <Image
                    src={getPlayerLogo(top1)}
                    alt={top1.teamName}
                    width={48}
                    height={48}
                    className="rounded-full object-contain p-0.5"
                    unoptimized
                  />
                ) : (
                  <Trophy className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="font-black text-xs text-foreground truncate w-full" title={top1.name}>
                {top1.name}
              </div>
              <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold truncate w-full mb-1">
                {top1.teamName}
              </div>
              <div className="w-full border-t border-amber-500/30 pt-1 space-y-0.5 font-mono text-[9px] sm:text-[10px]">
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Played</span>
                  <span className="text-foreground font-bold">{top1.played}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Win</span>
                  <span className="text-emerald-500 font-bold">{top1.won}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Lose</span>
                  <span className="text-rose-500 font-bold">{top1.lost}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">WPM</span>
                  <span className="text-foreground font-bold">{top1.wpm}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Agg</span>
                  <span>{renderAgg(top1.agg)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── 3RD PLACE (BRONZE) ── */}
          {top3 ? (
            <div className="flex flex-col items-center bg-amber-900/10 border border-amber-700/40 rounded-xl p-1.5 text-center relative">
              <span className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase leading-tight">3rd</span>
              <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-amber-700/70 overflow-hidden my-1 bg-background flex items-center justify-center shrink-0">
                {getPlayerLogo(top3) ? (
                  <Image
                    src={getPlayerLogo(top3)}
                    alt={top3.teamName}
                    width={40}
                    height={40}
                    className="rounded-full object-contain p-0.5"
                    unoptimized
                  />
                ) : (
                  <Trophy className="h-4 w-4 text-amber-700" />
                )}
              </div>
              <div className="font-bold text-[11px] text-foreground truncate w-full" title={top3.name}>
                {top3.name}
              </div>
              <div className="text-[8px] text-muted-foreground truncate w-full mb-1">
                {top3.teamName}
              </div>
              <div className="w-full border-t border-border/60 pt-1 space-y-0.5 font-mono text-[8px] sm:text-[9px]">
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Played</span>
                  <span className="text-foreground font-medium">{top3.played}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Win</span>
                  <span className="text-emerald-500 font-bold">{top3.won}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Lose</span>
                  <span className="text-rose-500 font-bold">{top3.lost}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">WPM</span>
                  <span className="text-foreground">{top3.wpm}</span>
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-muted-foreground">Agg</span>
                  <span>{renderAgg(top3.agg)}</span>
                </div>
              </div>
            </div>
          ) : <div />}
        </div>
      </div>
    </div>
  );
                }
