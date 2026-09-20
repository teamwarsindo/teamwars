"use client";

import Image from "next/image";
import { Trophy, Crown } from "lucide-react";
import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingPodiumProps {
  top1: PowerRankingPlayer | null;
  teamLogoMap: Map<string, string>;
  teamColorMap?: Map<string, string>;
}

const normalize = (str?: string) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

export function PowerRankingPodium({
  top1,
  teamLogoMap,
  teamColorMap,
}: PowerRankingPodiumProps) {
  if (!top1) return null;

  const rawKey = (top1.teamName || "").toLowerCase();
  const rawSlug = (top1.teamSlug || "").toLowerCase();
  const normKey = normalize(top1.teamName);
  const normSlug = normalize(top1.teamSlug);

  const logo =
    top1.teamLogo ||
    teamLogoMap.get(rawKey) ||
    teamLogoMap.get(rawSlug) ||
    teamLogoMap.get(normKey) ||
    teamLogoMap.get(normSlug) ||
    "";

  // Warna tim tetap untuk border & ambient card
  const teamColor =
    (top1 as any).warna ||
    (top1 as any).color ||
    (top1 as any).teamColor ||
    teamColorMap?.get(rawKey) ||
    teamColorMap?.get(rawSlug) ||
    teamColorMap?.get(normKey) ||
    teamColorMap?.get(normSlug) ||
    "#3b82f6";

  const bestDeckName = top1.bestDeck || (top1 as any).deck1?.archetype || "-";

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-semibold">0</span>;
  };

  const formatWpm = (val: number) => Number(val || 0).toFixed(1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 bg-card p-3 sm:p-3.5 shadow-xs transition flex flex-col gap-2.5"
      style={{
        borderColor: `${teamColor}99`,
        background: `linear-gradient(135deg, ${teamColor}22 0%, var(--card) 65%, var(--card) 100%)`,
      }}
    >
      {/* ── BARIS ATAS: Info Pemain & Badge Best Deck Center ── */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 overflow-hidden bg-background flex items-center justify-center shadow-inner"
              style={{ borderColor: teamColor }}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt={top1.teamName}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-xs">
              <Crown className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-xs sm:text-sm text-foreground truncate">
                {top1.name}
              </span>
              {/* Badge MVP #1 biru netral yang tajam dan kontras */}
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                MVP #1
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              {top1.teamName}
            </span>
          </div>
        </div>

        {/* ── BEST DECK BADGE (Warna Biru Netral, Jelas, & Tidak Terpotong) ── */}
        <div className="shrink-0 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[7.5px] font-black uppercase tracking-wider leading-none mb-1 text-blue-600 dark:text-blue-400">
            BEST DECK
          </span>
          <span className="text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap leading-none text-blue-700 dark:text-blue-300">
            {bestDeckName}
          </span>
        </div>
      </div>

      {/* ── BARIS BAWAH: 5 Kolom Stat Rata ── */}
      <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-border/40 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold uppercase text-muted-foreground">PLAY</span>
          <span className="text-xs font-bold text-foreground">{top1.played}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold uppercase text-emerald-600 dark:text-emerald-400">WIN</span>
          <span className="text-xs font-bold text-emerald-500">{top1.won}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold uppercase text-rose-600 dark:text-rose-400">LOSE</span>
          <span className="text-xs font-bold text-rose-500">{top1.lost}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold uppercase text-muted-foreground">WPM</span>
          <span className="text-xs font-bold text-foreground">{formatWpm(top1.wpm)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[7.5px] font-bold uppercase text-muted-foreground">AGG</span>
          <span className="text-xs">{renderAgg(top1.agg)}</span>
        </div>
      </div>
    </div>
  );
}
