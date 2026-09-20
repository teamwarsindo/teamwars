"use client";

import Image from "next/image";
import { Trophy, Crown } from "lucide-react";
import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingPodiumProps {
  top1: PowerRankingPlayer | null;
  teamLogoMap: Map<string, string>;
  teamColorMap?: Map<string, string>; // Hex code warna tim (contoh: #e11d48)
}

export function PowerRankingPodium({
  top1,
  teamLogoMap,
  teamColorMap,
}: PowerRankingPodiumProps) {
  if (!top1) return null;

  const logo =
    top1.teamLogo ||
    teamLogoMap.get(top1.teamName.toLowerCase()) ||
    teamLogoMap.get(top1.teamSlug.toLowerCase()) ||
    "";

  // Ambil warna tim jika ada, fallback ke warna emas turnamen
  const teamColor =
    (top1 as any).teamColor ||
    teamColorMap?.get(top1.teamName.toLowerCase()) ||
    teamColorMap?.get(top1.teamSlug.toLowerCase()) ||
    "#f59e0b"; // amber-500 default

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-semibold">0</span>;
  };

  const formatWpm = (val: number) => Number(val || 0).toFixed(1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 bg-card p-2.5 sm:p-3 shadow-xs transition hover:shadow-md flex items-center justify-between gap-2"
      style={{
        borderColor: teamColor,
        background: `linear-gradient(90deg, ${teamColor}22 0%, var(--card) 45%, var(--card) 100%)`,
      }}
    >
      {/* ── Sisi Kiri: Badge #1, Avatar Tim Bulat, Info Player & Tim ── */}
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

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs sm:text-sm text-foreground truncate">
              {top1.name}
            </span>
            <span
              className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: `${teamColor}25`,
                color: teamColor,
                borderColor: `${teamColor}40`,
                borderWidth: "1px",
              }}
            >
              MVP #1
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium truncate">
            {top1.teamName}
          </div>
        </div>
      </div>

      {/* ── Sisi Kanan: Stats Baris Atas (P / W / L) & Baris Bawah (WPM · AGG) ── */}
      <div className="flex flex-col items-end shrink-0 gap-1 text-right">
        {/* Baris Atas: Play, Win, Lose sejajar */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-center">
          <div className="flex flex-col items-center min-w-5">
            <span className="text-[7.5px] font-bold uppercase text-muted-foreground leading-none mb-0.5">
              PLAY
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-foreground leading-tight">
              {top1.played}
            </span>
          </div>
          <div className="flex flex-col items-center min-w-5">
            <span className="text-[7.5px] font-bold uppercase text-emerald-600 dark:text-emerald-400 leading-none mb-0.5">
              WIN
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-emerald-500 leading-tight">
              {top1.won}
            </span>
          </div>
          <div className="flex flex-col items-center min-w-5">
            <span className="text-[7.5px] font-bold uppercase text-rose-600 dark:text-rose-400 leading-none mb-0.5">
              LOSE
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-rose-500 leading-tight">
              {top1.lost}
            </span>
          </div>
        </div>

        {/* Baris Bawah: WPM dan AGG Sejajar Tanpa Font Monospace */}
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground">
          <span>
            WPM <strong className="text-foreground font-bold">{formatWpm(top1.wpm)}</strong>
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span>
            AGG <span className="font-bold">{renderAgg(top1.agg)}</span>
          </span>
        </div>
      </div>
    </div>
  );
            }
