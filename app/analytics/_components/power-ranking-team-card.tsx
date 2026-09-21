"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import {
  ExtendedStandingItem,
  TeamComparisonStats,
} from "@/app/tournament/_library/calculator";

interface PowerRankingTeamCardProps {
  teamName: string;
  standing?: ExtendedStandingItem | TeamComparisonStats | any;
  teamLogoMap: Map<string, string>;
  teamColorMap: Map<string, string>;
  totalRosterCount?: number;
  currentWeek?: number;
}

const normalize = (str?: string) =>
  (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

export function PowerRankingTeamCard({
  teamName,
  standing,
  teamLogoMap,
  teamColorMap,
  currentWeek = 1,
}: PowerRankingTeamCardProps) {
  const rawKey = teamName.toLowerCase();
  const normKey = normalize(teamName);

  const logo =
    standing?.teamLogo ||
    standing?.logo ||
    teamLogoMap.get(rawKey) ||
    teamLogoMap.get(normKey) ||
    "";

  // Warna aksen tim resmi
  const teamColor =
    teamColorMap.get(rawKey) ||
    teamColorMap.get(normKey) ||
    "#3b82f6";

  const matchWins = standing?.matchWins ?? 0;
  const matchLosses = standing?.matchLosses ?? 0;
  const totalMatches = matchWins + matchLosses;

  // Bersihkan tanda '+' atau '-' bawaan string agar tidak terjadi duplikasi "++"
  const rawDiffNum = Number(
    String(
      standing?.roundDifference ??
      standing?.rawDiff ??
      standing?.pointsDifference ??
      0
    ).replace(/^\+/, "")
  );

  const ptsScored = standing?.setWins ?? standing?.pointsScored ?? 0;
  const winRate =
    standing?.winRate !== undefined
      ? Math.round(standing.winRate)
      : totalMatches > 0
      ? Math.round((matchWins / totalMatches) * 100)
      : 0;

  const formList = (standing?.streak || standing?.form || []).slice(0, 7);

  // Label Peringkat (#1 Wildcard / #2 Group)
  const rankLabel =
    standing?.qualification?.rankLabel ||
    (standing?.rank ? `#${standing.rank} Group` : "Peringkat Klasemen");

  // Badge Status Playoff (Quarter Finals, Play-Ins, Tereliminasi)
  const stageLabel = standing?.qualification?.stageLabel;
  const isQualified = Boolean(standing?.qualification?.isQualified);

  const renderDiff = (val: number) => {
    if (isNaN(val) || val === 0) {
      return <span className="text-muted-foreground font-semibold">0</span>;
    }
    if (val > 0) {
      return <span className="text-emerald-500 font-bold">+{val}</span>;
    }
    return <span className="text-rose-500 font-bold">{val}</span>;
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 bg-card p-3.5 sm:p-4 shadow-xs transition flex flex-col gap-3"
      style={{
        borderColor: `${teamColor}99`,
        background: `linear-gradient(135deg, ${teamColor}22 0%, var(--card) 65%, var(--card) 100%)`,
      }}
    >
      {/* ── BARIS ATAS: Logo Tim, Identitas & Form ── */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Logo Tim */}
          <div className="relative shrink-0">
            <div
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 overflow-hidden bg-background flex items-center justify-center shadow-inner"
              style={{ borderColor: teamColor }}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt={teamName}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <Shield className="h-5 w-5" style={{ color: teamColor }} />
              )}
            </div>
          </div>

          {/* Info Tim, Grup & Badge Status */}
          <div className="min-w-0 flex flex-col justify-center">
            {/* Baris 1: Nama Tim */}
            <span className="font-extrabold text-xs sm:text-sm text-foreground truncate leading-tight">
              {standing?.teamName || teamName}
            </span>

            {/* Baris 2: Divisi Grup */}
            <span className="text-[10px] text-muted-foreground font-semibold truncate leading-tight mt-0.5">
              {standing?.groupName || "Team Wars Indonesia"}
            </span>

            {/* Baris 3: Peringkat & Badge Playoff (Week >= 7) */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[9.5px] font-bold text-foreground/80 truncate leading-tight">
                {rankLabel}
              </span>

              {currentWeek >= 7 && stageLabel && (
                <span
                  className={`rounded border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider leading-none ${
                    stageLabel.includes("QUARTER")
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : isQualified
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {stageLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── KANAN: MATCH FORM BOX ── */}
        <div className="shrink-0 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/30 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-[7.5px] font-bold uppercase tracking-wider leading-none mb-1 text-muted-foreground">
            MATCH FORM
          </span>
          <div className="flex items-center gap-1">
            {formList.length > 0 ? (
              formList.map((res: string, i: number) => {
                const isWin = res.toUpperCase() === "W";
                return (
                  <span
                    key={i}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex items-center justify-center rounded text-[7.5px] sm:text-[8px] font-black leading-none ${
                      isWin
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
                    }`}
                  >
                    {res.toUpperCase()}
                  </span>
                );
              })
            ) : (
              <span className="text-[9px] text-muted-foreground font-medium px-1">
                -
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BARIS BAWAH: 5 Kolom Stat Simetris ── */}
      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/40 text-center">
        {/* 1. WIN */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-emerald-600 dark:text-emerald-400">WIN</span>
          <span className="text-xs font-bold text-emerald-500 mt-0.5">
            {matchWins}
          </span>
        </div>

        {/* 2. LOSE */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-rose-600 dark:text-rose-400">LOSE</span>
          <span className="text-xs font-bold text-rose-500 mt-0.5">
            {matchLosses}
          </span>
        </div>

        {/* 3. PTS DIFF */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">PTS DIFF</span>
          <span className="text-xs mt-0.5">{renderDiff(rawDiffNum)}</span>
        </div>

        {/* 4. PTS SCORED */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">PTS SCORED</span>
          <span className="text-xs font-bold text-foreground mt-0.5">
            {ptsScored}
          </span>
        </div>

        {/* 5. WIN RATE */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold uppercase text-muted-foreground">WIN RATE</span>
          <span
            className={`text-xs font-bold mt-0.5 ${
              winRate >= 50 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {winRate}%
          </span>
        </div>
      </div>
    </div>
  );
    }
          
