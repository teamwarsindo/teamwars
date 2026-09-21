"use client";

import Image from "next/image";
import { Shield, Trophy, Users } from "lucide-react";

interface QualificationInfo {
  rankLabel?: string;
  stageLabel?: string;
  isQualified?: boolean;
}

interface TeamStandingProps {
  rank?: number;
  groupRank?: number;
  wildcardRank?: number;
  teamName?: string;
  teamSlug?: string;
  groupName?: string;
  matchWins?: number;
  matchLosses?: number;
  gameWins?: number;
  gameLosses?: number;
  setWins?: number;
  setLosses?: number;
  roundDifference?: number | string;
  rawDiff?: number;
  streak?: Array<"W" | "L">;
  form?: Array<"W" | "L">;
  qualification?: QualificationInfo;
}

interface PowerRankingTeamCardProps {
  teamName: string;
  standing?: TeamStandingProps;
  teamLogoMap: Map<string, string>;
  teamColorMap: Map<string, string>;
  totalRosterCount: number;
  currentWeek: number;
}

export function PowerRankingTeamCard({
  teamName,
  standing,
  teamLogoMap,
  teamColorMap,
  totalRosterCount,
  currentWeek,
}: PowerRankingTeamCardProps) {
  const normKey = teamName.toLowerCase().trim();
  const logo = teamLogoMap.get(normKey);
  const accentColor = teamColorMap.get(normKey) || "#6366f1";

  const matchWins = standing?.matchWins ?? 0;
  const matchLosses = standing?.matchLosses ?? 0;
  const totalMatches = matchWins + matchLosses;
  const winRate = totalMatches > 0 ? Math.round((matchWins / totalMatches) * 100) : 0;

  // Form Riwayat Pertandingan (W / L)
  const matchForm: Array<"W" | "L"> = standing?.form || standing?.streak || [];

  // Data Kualifikasi Resmi
  const qual = standing?.qualification;
  const rankLabel = qual?.rankLabel ?? (standing?.rank ? `#${standing.rank}` : "-");
  const stageLabel = qual?.stageLabel ?? "";
  const isQualified = qual?.isQualified ?? false;

  // Perhitungan Selisih Poin / Round Difference
  const rawDiff =
    standing?.rawDiff ??
    (typeof standing?.roundDifference === "number"
      ? standing.roundDifference
      : Number(String(standing?.roundDifference ?? 0).replace(/^\+/, "")));

  const formattedDiff = rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`;

  const isQuarter = stageLabel.toLowerCase().includes("quarter");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all">
      {/* Background Accent Glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Sisi Kiri: Logo, Nama Tim, Grup, & Roster */}
        <div className="flex items-center gap-3.5">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/60 p-2 shadow-xs"
            style={{ borderColor: `${accentColor}30` }}
          >
            {logo ? (
              <Image
                src={logo}
                alt={teamName}
                width={48}
                height={48}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <Shield className="h-7 w-7 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base sm:text-lg font-black tracking-tight text-foreground">
                {teamName}
              </h2>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {standing?.groupName && (
                <span className="font-medium">{standing.groupName}</span>
              )}
              {standing?.groupName && <span>•</span>}
              <span className="inline-flex items-center gap-1 font-medium">
                <Users className="h-3 w-3" />
                {totalRosterCount} Pemain
              </span>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Status Kualifikasi & Match Form */}
        <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
          {/* Badge Posisi / Status Turnamen */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
              <Trophy className="h-2.5 w-2.5 text-primary" />
              {rankLabel}
            </span>

            {currentWeek >= 7 && stageLabel && (
              <span
                className={`rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider leading-none ${
                  isQuarter
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

          {/* Form Match (W / L) */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
              FORM:
            </span>
            {matchForm.length > 0 ? (
              matchForm.map((result, idx) => (
                <span
                  key={idx}
                  className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-black ${
                    result === "W"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {result}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Statistik Rekor Match & Game */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 border-t border-border/60 pt-3">
        {/* Match Record */}
        <div className="rounded-xl bg-background/50 p-2.5 border border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Match W-L
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {matchWins} - {matchLosses}
          </p>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl bg-background/50 p-2.5 border border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Win Rate
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {winRate}%
          </p>
        </div>

        {/* Sets / Game Score */}
        <div className="rounded-xl bg-background/50 p-2.5 border border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Game W-L
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {standing?.setWins ?? standing?.gameWins ?? 0} -{" "}
            {standing?.setLosses ?? standing?.gameLosses ?? 0}
          </p>
        </div>

        {/* Point Difference */}
        <div className="rounded-xl bg-background/50 p-2.5 border border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pts Diff
          </p>
          <p
            className={`mt-0.5 text-sm font-bold ${
              rawDiff > 0
                ? "text-emerald-500"
                : rawDiff < 0
                ? "text-rose-500"
                : "text-foreground"
            }`}
          >
            {formattedDiff}
          </p>
        </div>
      </div>
    </div>
  );
}
