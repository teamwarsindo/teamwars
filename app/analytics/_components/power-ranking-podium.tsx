"use client";

import Image from "next/image";
import { Trophy, Crown, Medal } from "lucide-react";
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
    if (val > 0) return <span className="text-emerald-500 font-black">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-black">{val}</span>;
    return <span className="text-muted-foreground font-bold">0</span>;
  };

  const formatWpm = (val: number) => Number(val || 0).toFixed(1);

  const renderCard = (
    player: PowerRankingPlayer,
    rank: 1 | 2 | 3
  ) => {
    const logo = getPlayerLogo(player);

    const config = {
      1: {
        border: "border-amber-500/60 shadow-amber-500/10",
        bg: "bg-gradient-to-r from-amber-500/15 via-card to-card",
        badgeBg: "bg-amber-500 text-slate-950",
        icon: <Crown className="w-3.5 h-3.5 fill-current" />,
        label: "MVP #1",
        rankColor: "text-amber-500",
      },
      2: {
        border: "border-slate-300/50 shadow-slate-300/5",
        bg: "bg-gradient-to-r from-slate-400/10 via-card to-card",
        badgeBg: "bg-slate-300 text-slate-950",
        icon: <Medal className="w-3 h-3" />,
        label: "2ND",
        rankColor: "text-slate-400",
      },
      3: {
        border: "border-amber-700/50 shadow-amber-700/5",
        bg: "bg-gradient-to-r from-amber-800/10 via-card to-card",
        badgeBg: "bg-amber-700 text-white",
        icon: <Trophy className="w-3 h-3" />,
        label: "3RD",
        rankColor: "text-amber-600 dark:text-amber-500",
      },
    }[rank];

    return (
      <div
        key={player.name}
        className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-2 sm:p-2.5 shadow-xs transition hover:shadow-md flex items-center justify-between gap-2`}
      >
        {/* Sisi Kiri: Badge Rank, Logo Tim Lingkaran, Nama Player & Tim */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Badge Posisi */}
          <div
            className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg ${config.badgeBg} font-black text-xs shrink-0 shadow-xs`}
          >
            {rank === 1 ? config.icon : rank}
          </div>

          {/* Logo Tim Circle */}
          <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-border/70 overflow-hidden bg-background shrink-0 flex items-center justify-center shadow-inner">
            {logo ? (
              <Image
                src={logo}
                alt={player.teamName}
                width={40}
                height={40}
                className="h-full w-full object-cover rounded-full"
                unoptimized
              />
            ) : (
              <Trophy className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Detail Player & Tim */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black text-xs sm:text-sm truncate ${
                  rank === 1 ? "text-foreground font-black" : "text-foreground font-bold"
                }`}
              >
                {player.name}
              </span>
              {rank === 1 && (
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  MVP
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {player.teamName}
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Statistik Lengkap Terstruktur Rata Kanan */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 font-mono text-right">
          {/* Record Play, Win & Lose */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-sans font-bold uppercase text-muted-foreground tracking-tight">
              P / W / L
            </span>
            <div className="text-xs sm:text-[13px] font-bold text-foreground leading-tight">
              <span className="text-foreground/70">{player.played}</span>
              <span className="text-muted-foreground/30 mx-0.5">/</span>
              <span className="text-emerald-500">{player.won}</span>
              <span className="text-muted-foreground/30 mx-0.5">/</span>
              <span className="text-rose-500">{player.lost}</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-border/60" />

          {/* WPM */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-sans font-bold uppercase text-muted-foreground tracking-tight">
              WPM
            </span>
            <span className="text-xs sm:text-[13px] font-semibold text-foreground/80 leading-tight">
              {formatWpm(player.wpm)}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-border/60" />

          {/* AGG */}
          <div className="flex flex-col items-end min-w-8">
            <span className="text-[8px] font-sans font-bold uppercase text-muted-foreground tracking-tight">
              AGG
            </span>
            <span className="text-xs sm:text-sm font-black leading-tight">
              {renderAgg(player.agg)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-1.5">
      {top1 && renderCard(top1, 1)}
      {top2 && renderCard(top2, 2)}
      {top3 && renderCard(top3, 3)}
    </div>
  );
}
