"use client";

import Image from "next/image";
import { PowerRankingPlayer, PowerRankingGrandTotal } from "../_library/power-ranking";

export interface RankedPlayerWithDiff extends PowerRankingPlayer {
  rankDiff: number;
  isNew: boolean;
}

interface PowerRankingTableProps {
  players: RankedPlayerWithDiff[];
  isTeamView: boolean;
  grandTotal?: PowerRankingGrandTotal;
  teamLogoMap: Map<string, string>;
}

export function PowerRankingTable({
  players,
  isTeamView,
  grandTotal,
  teamLogoMap,
}: PowerRankingTableProps) {
  const renderRankChange = (diff: number, isNew: boolean, played: number) => {
    if (played === 0) {
      return <span className="text-[9px] text-muted-foreground/30 shrink-0">—</span>;
    }
    if (isNew) {
      return <span className="text-[9px] text-amber-500 font-semibold shrink-0">NEW</span>;
    }
    if (diff > 0) {
      return (
        <span className="text-[9px] text-emerald-500 font-semibold shrink-0">
          ▲{diff}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="text-[9px] text-rose-500 font-semibold shrink-0">
          ▼{Math.abs(diff)}
        </span>
      );
    }
    return <span className="text-[9px] text-muted-foreground/40 shrink-0">—</span>;
  };

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500">+{val}</span>;
    if (val < 0) return <span className="text-rose-500">{val}</span>;
    return <span className="text-muted-foreground">0</span>;
  };

  const formatWpm = (val: number) => Number(val || 0).toFixed(1);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
      <div className="max-h-[58vh] sm:max-h-[64vh] overflow-y-auto overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border/80 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2.5 pl-3 pr-1 text-center w-12 sm:w-14">RANK</th>
              <th className="py-2.5 px-2 text-left">PLAYER</th>
              <th className="py-2.5 px-2 text-center w-12 sm:w-14">PLAY</th>
              <th className="py-2.5 px-2 text-center w-12 sm:w-14 text-emerald-600 dark:text-emerald-400">WIN</th>
              <th className="py-2.5 px-2 text-center w-12 sm:w-14 text-rose-600 dark:text-rose-400">LOSE</th>
              <th className="py-2.5 px-2 text-center w-14 sm:w-16">WPM</th>
              <th className="py-2.5 px-2 text-center w-14 sm:w-16">AGG</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
            {players.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-xs text-muted-foreground italic">
                  Tidak ada data pemain yang cocok.
                </td>
              </tr>
            ) : (
              players.map((p) => {
                const logo =
                  p.teamLogo ||
                  teamLogoMap.get(p.teamName.toLowerCase()) ||
                  teamLogoMap.get(p.teamSlug.toLowerCase());

                return (
                  <tr key={`${p.name}-${p.teamSlug}`} className="hover:bg-muted/30 transition-colors">
                    {/* Rank */}
                    <td className="py-2.5 pl-3 pr-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {renderRankChange(p.rankDiff, p.isNew, p.played)}
                        <span className="text-foreground text-xs">{p.rank}</span>
                      </div>
                    </td>

                    {/* Kolom PLAYER */}
                    <td className="py-2.5 px-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground text-xs truncate max-w-[130px] sm:max-w-[200px]">
                          {p.name}
                        </span>
                        {p.isExPlayer && (
                          <span className="px-1 py-0.2 rounded text-[8px] bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                            EX
                          </span>
                        )}
                      </div>

                      {/* Tampilkan Logo dan Nama Tim HANYA jika bukan filter tim */}
                      {!isTeamView && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate mt-0.5">
                          {logo && (
                            <div className="h-3.5 w-3.5 rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted/30">
                              <Image
                                src={logo}
                                alt={p.teamName}
                                width={14}
                                height={14}
                                className="h-full w-full object-cover rounded-full"
                                unoptimized
                              />
                            </div>
                          )}
                          <span className="truncate">{p.teamName}</span>
                        </div>
                      )}
                    </td>

                    {/* Stats */}
                    <td className="py-2.5 px-2 text-center text-[11px] text-foreground/85">
                      {p.played}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[11px] text-emerald-500">
                      {p.won}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[11px] text-rose-500">
                      {p.lost}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[11px] text-foreground/85">
                      {formatWpm(p.wpm)}
                    </td>
                    {/* AGG Center */}
                    <td className="py-2.5 px-2 text-center text-[11px]">
                      {renderAgg(p.agg)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Total Roster */}
          {isTeamView && grandTotal && (
            <tfoot className="sticky bottom-0 bg-card border-t-2 border-border shadow-xs">
              <tr className="text-[11px]">
                <td colSpan={2} className="py-2.5 pl-3 px-2 text-foreground font-semibold">TOTAL ROSTER</td>
                <td className="py-2.5 px-2 text-center text-foreground">{grandTotal.played}</td>
                <td className="py-2.5 px-2 text-center text-emerald-500">{grandTotal.won}</td>
                <td className="py-2.5 px-2 text-center text-rose-500">{grandTotal.lost}</td>
                <td className="py-2.5 px-2 text-center text-foreground">{formatWpm(grandTotal.wpm)}</td>
                <td className="py-2.5 px-2 text-center">{renderAgg(grandTotal.agg)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
