"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { ExtendedStandingItem } from "@/app/tournament/_library/calculator";

interface PowerRankingTeamCardProps {
  teamName: string;
  standing?: ExtendedStandingItem;
  teamLogoMap: Map<string, string>;
  teamColorMap: Map<string, string>;
  totalRosterCount?: number;
}

const normalize = (str?: string) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

export function PowerRankingTeamCard({
  teamName,
  standing,
  teamLogoMap,
  teamColorMap,
  totalRosterCount = 0,
}: PowerRankingTeamCardProps) {
  const rawKey = teamName.toLowerCase();
  const normKey = normalize(teamName);

  const logo =
    standing?.teamLogo ||
    teamLogoMap.get(rawKey) ||
    teamLogoMap.get(normKey) ||
    "";

  // Warna aksen tim resmi
  const teamColor =
    teamColorMap.get(rawKey) ||
    teamColorMap.get(normKey) ||
    "#3b82f6";

  const isQualified = standing?.isTopGroup;
  const matchWins = standing?.matchWins ?? 0;
  const matchLosses = standing?.matchLosses ?? 0;
  const totalMatches = matchWins + matchLosses;
  const ptsDiff = standing?.roundDifference ?? 0;
  const setWins = standing?.setWins ?? 0;
  const winRate =
    totalMatches > 0 ? Math.round((matchWins / totalMatches) * 100) : 0;

  // Form riwayat W/L (maksimal 7 pekan reguler)
  const formList = (standing?.form || []).slice(0, 7);

  const renderDiff = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-semibold">0</span>;
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 bg-card p-3.5 sm:p-4 shadow-xs transition flex flex-col gap-3"
      style={{
        borderColor: `${teamColor}99`,
        background: `linear-gradient(135deg, ${teamColor}22 0%, var(--card) 65%, var(--card) 100%)`,
      }}
    >
      {/* ── BARIS ATAS: Logo Tim, Identitas, Status Lolos & Match Form ── */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Logo Tim */}
          <div className="relative shrink-0">
            <div
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 overflow-hidden bg-background flex items-center justify-center shadow-inner"
              style={{ borderColor: teamColor }}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt={teamName}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <Shield className="h-5 w-5" style={{ color: teamColor }} />
              )}
            </div>
          </div>

          {/* Info Tim & Status */}
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-none">
                {teamName}
              </span>

              {/* Status Lolos / Zona */}
              <span
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 leading-none border ${
                  isQualified
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                }`}
              >
                {isQualified ? "QUALIFIED" : "ROSTER STATS"}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground font-medium truncate mt-1 leading-tight">
              {standing?.groupName || "Team Wars Indonesia"} • {totalRosterCount} Pemain
            </span>
          </div>
        </div>

        {/* ── KANAN: MATCH FORM BOX ── */}
        <div className="shrink-0 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/30 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mb-1 text-muted-foreground">
            MATCH FORM
          </span>
          <div className="flex items-center gap-1">
            {formList.length > 0 ? (
              formList.map((res, i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex items-center justify-center rounded text-[7.5px] sm:text-[8px] font-black leading-none ${
                    res === "W"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
                  }`}
                >
                  {res}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-muted-foreground font-medium px-1">
                -
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BARIS BAWAH: 5 Kolom Stat Tim Simetris ── */}
      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/40 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">MATCH</span>
          <span className="text-xs font-bold text-foreground mt-0.5">
            {matchWins}-{matchLosses}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-emerald-600 dark:text-emerald-400">WIN</span>
          <span className="text-xs font-bold text-emerald-500 mt-0.5">
            {matchWins}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-rose-600 dark:text-rose-400">LOSE</span>
          <span className="text-xs font-bold text-rose-500 mt-0.5">
            {matchLosses}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">PTS DIFF</span>
          <span className="text-xs mt-0.5">{renderDiff(ptsDiff)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-amber-600 dark:text-amber-400">WIN RATE</span>
          <span className="text-xs font-bold text-amber-500 mt-0.5">
            {winRate}%
          </span>
        </div>
      </div>
    </div>
  );
      }
