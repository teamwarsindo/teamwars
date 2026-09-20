"use client";

import Image from "next/image";
import { Trophy, Crown } from "lucide-react";
import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingPodiumProps {
  top1: PowerRankingPlayer | null;
  teamLogoMap: Map<string, string>;
  teamColorMap?: Map<string, string>;
}

export function PowerRankingPodium({
  top1,
  teamLogoMap,
  teamColorMap,
}: PowerRankingPodiumProps) {
  if (!top1) return null;

  const teamKeyLower = (top1.teamName || "").toLowerCase();
  const teamSlugLower = (top1.teamSlug || "").toLowerCase();

  const logo =
    top1.teamLogo ||
    teamLogoMap.get(teamKeyLower) ||
    teamLogoMap.get(teamSlugLower) ||
    "";

  // Ambil warna tim dari properti langsung atau map
  const teamColor =
    (top1 as any).color ||
    (top1 as any).teamColor ||
    teamColorMap?.get(teamKeyLower) ||
    teamColorMap?.get(teamSlugLower) ||
    "#eab308"; // Fallback kuning emas

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
        borderColor: teamColor,
        background: `linear-gradient(135deg, ${teamColor}20 0%, var(--card) 55%, var(--card) 100%)`,
      }}
    >
      {/* ── BARIS ATAS: Info Pemain, Logo Tim & Badge MVP ── */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
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
                <Trophy className="h-5 w-5" style={{ color: teamColor }} />
              )}
            </div>

            <div
              className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full text-slate-950 shadow-xs"
              style={{ backgroundColor: teamColor }}
            >
              <Crown className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-xs sm:text-sm text-foreground truncate">
                {top1.name}
              </span>
              <span
                className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: `${teamColor}25`,
                  color: teamColor,
                  borderColor: `${teamColor}50`,
                  borderWidth: "1px",
                }}
              >
                MVP #1
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              {top1.teamName}
            </span>
          </div>
        </div>

        {/* Quick Win Rate badge di pojok kanan atas */}
        <div 
          className="px-2 py-1 rounded-lg text-[9px] font-bold border shrink-0"
          style={{
            backgroundColor: `${teamColor}15`,
            borderColor: `${teamColor}30`,
            color: teamColor,
          }}
        >
          {top1.played > 0 ? ((top1.won / top1.played) * 100).toFixed(0) : 0}% WR
        </div>
      </div>

      {/* ── BARIS BAWAH: Memanfaatkan Ruang Kosong dengan 5 Kolom Stat Rata ── */}
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
