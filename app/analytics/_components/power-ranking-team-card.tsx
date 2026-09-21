"use client";

import Image from "next/image";

interface PowerRankingTeamCardProps {
  teamName: string;
  standing?: {
    matchWins?: number;
    matchLosses?: number;
    pointsScored?: number;
    pointsDifference?: number;
    roundDifference?: number | string;
    rawDiff?: number;
    matchForm?: string[];
    qualification?: {
      rankLabel: string;
      stageLabel: string;
      isQualified: boolean;
    };
  };
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
  const norm = teamName.toLowerCase().trim();
  const logo = teamLogoMap.get(norm);
  const color = teamColorMap.get(norm) || "#3b82f6";

  const wins = standing?.matchWins ?? 0;
  const losses = standing?.matchLosses ?? 0;
  const scored = standing?.pointsScored ?? 0;
  const rawDiff = standing?.rawDiff ?? 0;
  const matchForm = standing?.matchForm ?? [];

  const rankLabel = standing?.qualification?.rankLabel ?? "-";
  const stageLabel = standing?.qualification?.stageLabel ?? "";
  const isQualified = standing?.qualification?.isQualified ?? false;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs"
      style={{
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* IDENTITAS TIM */}
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/40">
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
              <div
                className="flex h-full w-full items-center justify-center font-bold text-sm text-white"
                style={{ backgroundColor: color }}
              >
                {teamName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-foreground leading-tight">
              {teamName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {rankLabel}
              </span>
              <span className="text-[9px] text-muted-foreground/40">•</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {totalRosterCount} Pemain
              </span>
            </div>
          </div>
        </div>

        {/* STATISTIK RESMI & MATCH FORM */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
          {/* WIN - LOSE */}
          <div className="text-center px-1.5">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
              W - L
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              <span className="text-emerald-500">{wins}</span>
              <span className="text-muted-foreground/60 mx-0.5">-</span>
              <span className="text-rose-500">{losses}</span>
            </div>
          </div>

          {/* PTS SCORED */}
          <div className="text-center px-1.5">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
              PTS
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">
              {scored}
            </div>
          </div>

          {/* PTS DIFF */}
          <div className="text-center px-1.5">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
              DIFF
            </div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                rawDiff > 0
                  ? "text-emerald-500"
                  : rawDiff < 0
                  ? "text-rose-500"
                  : "text-muted-foreground"
              }`}
            >
              {rawDiff > 0 ? `+${rawDiff}` : rawDiff}
            </div>
          </div>

          {/* BADGE DI ATAS MATCH FORM */}
          <div className="flex flex-col items-center sm:items-end gap-1 pl-1">
            {/* BADGE KUALIFIKASI (MUNCUL HANYA DI WEEK >= 7) */}
            {currentWeek >= 7 && stageLabel && (
              <span
                className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider leading-none border ${
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

            {/* MATCH FORM BULLETS */}
            <div className="flex items-center gap-1">
              {matchForm.length > 0 ? (
                matchForm.map((res, i) => (
                  <span
                    key={i}
                    className={`flex h-4 w-4 items-center justify-center rounded-[3px] text-[8.5px] font-bold text-white shadow-2xs ${
                      res.toUpperCase() === "W" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {res.toUpperCase()}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground/40 italic">
                  Belum tanding
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
          }
