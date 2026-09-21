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
  const renderRankChange = (diff: number, played: number) => {
    if (played === 0) {
      return <span className="text-[10px] text-muted-foreground/30 leading-none">—</span>;
    }
    if (diff > 0) {
      return <span className="text-[8.5px] text-emerald-500 font-bold leading-none">▲</span>;
    }
    if (diff < 0) {
      return <span className="text-[8.5px] text-rose-500 font-bold leading-none">▼</span>;
    }
    return <span className="text-[10px] text-muted-foreground/40 leading-none">—</span>;
  };

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-semibold">0</span>;
  };

  const formatWpm = (val: number) => Number(val || 0).toFixed(1);

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col">
        <div className="max-h-[60vh] sm:max-h-[66vh] overflow-y-auto overflow-x-hidden">
          <table className="w-full border-collapse text-left table-fixed">
            <thead className="sticky top-0 z-10 bg-muted/65 backdrop-blur-md border-b border-border text-[10px] uppercase tracking-wider text-foreground/75 font-bold shadow-xs">
              <tr>
                <th className="py-2.5 pl-3.5 sm:pl-4 pr-1 text-center w-12 sm:w-14">RANK</th>
                <th className="py-2.5 pl-2 sm:pl-3 pr-2 text-left">PLAYER</th>
                <th className="py-2.5 px-0.5 text-center w-8 sm:w-10">PLAY</th>
                <th className="py-2.5 px-0.5 text-center w-8 sm:w-10 text-emerald-600 dark:text-emerald-400">WIN</th>
                <th className="py-2.5 px-0.5 text-center w-8 sm:w-10 text-rose-600 dark:text-rose-400">LOSE</th>
                <th className="py-2.5 px-0.5 text-center w-10 sm:w-12">WPM</th>
                <th className="py-2.5 pr-4 sm:pr-5 pl-0.5 text-center w-11 sm:w-13">AGG</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40 text-[11px]">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground italic">
                    Tidak ada data pemain yang cocok.
                  </td>
                </tr>
              ) : (
                players.map((p) => {
                  const logo =
                    p.teamLogo ||
                    teamLogoMap.get(p.teamName.toLowerCase()) ||
                    teamLogoMap.get(p.teamSlug.toLowerCase());

                  const isTripleDigit = p.rank >= 100;
                  const isOut = Boolean(p.isExPlayer);
                  const isAdd = !isOut && Boolean(p.isAdded);

                  return (
                    <tr 
                      key={`${p.name}-${p.teamSlug}`} 
                      className="hover:bg-muted/40 transition-colors duration-150"
                    >
                      {/* Kolom RANK */}
                      <td className="py-2.5 pl-3.5 sm:pl-4 pr-1 text-center">
                        <div className="flex items-center justify-center font-mono">
                          {isTeamView ? (
                            <span className="text-foreground font-bold text-xs min-w-3 text-center">
                              {p.rank}
                            </span>
                          ) : p.isNew ? (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 leading-none">
                              NEW
                            </span>
                          ) : isTripleDigit ? (
                            <span className="text-foreground/90 font-bold text-xs">
                              {p.rank}
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {renderRankChange(p.rankDiff, p.played)}
                              <span className="text-foreground font-bold text-xs min-w-3 text-center">
                                {p.rank}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Kolom PLAYER */}
                      <td className="py-2.5 pl-2 sm:pl-3 pr-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {!isTeamView && logo && (
                            <div
                              className="h-4 w-4 rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted/40"
                              title={p.teamName}
                            >
                              <Image
                                src={logo}
                                alt={p.teamName}
                                width={16}
                                height={16}
                                className="h-full w-full object-cover rounded-full"
                                unoptimized
                              />
                            </div>
                          )}
                          <span
                            className={`font-bold truncate min-w-0 ${
                              isTeamView && isOut
                                ? "text-rose-500 font-bold"
                                : isTeamView && isAdd
                                ? "text-blue-500 font-bold"
                                : "text-foreground font-semibold"
                            }`}
                            title={`${p.name} (${p.teamName})`}
                          >
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Statistik Reguler */}
                      <td className="py-2.5 px-0.5 text-center font-medium text-foreground/80">
                        {p.played}
                      </td>
                      <td className="py-2.5 px-0.5 text-center font-bold text-emerald-500">
                        {p.won}
                      </td>
                      <td className="py-2.5 px-0.5 text-center font-bold text-rose-500">
                        {p.lost}
                      </td>
                      <td className="py-2.5 px-0.5 text-center font-semibold text-foreground/90">
                        {formatWpm(p.wpm)}
                      </td>
                      <td className="py-2.5 pr-4 sm:pr-5 pl-0.5 text-center">
                        {renderAgg(p.agg)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Total Roster */}
            {isTeamView && grandTotal && (
              <tfoot className="sticky bottom-0 bg-muted/90 backdrop-blur-md border-t-2 border-border shadow-xs text-[11px]">
                <tr>
                  <td colSpan={2} className="py-2.5 pl-3.5 sm:pl-4 pr-2 text-foreground font-bold">TOTAL ROSTER</td>
                  <td className="py-2.5 px-0.5 text-center font-bold text-foreground">{grandTotal.played}</td>
                  <td className="py-2.5 px-0.5 text-center font-bold text-emerald-500">{grandTotal.won}</td>
                  <td className="py-2.5 px-0.5 text-center font-bold text-rose-500">{grandTotal.lost}</td>
                  <td className="py-2.5 px-0.5 text-center font-bold text-foreground">{formatWpm(grandTotal.wpm)}</td>
                  <td className="py-2.5 pr-4 sm:pr-5 pl-0.5 text-center">{renderAgg(grandTotal.agg)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Keterangan Label Legend */}
      {isTeamView && (
        <div className="flex items-center justify-end gap-3 px-2 text-[10px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-foreground/70" />
            <span className="text-foreground/80 font-semibold">Original</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-blue-500 font-semibold">Transfer Add</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-rose-500 font-semibold">Transfer Out</span>
          </div>
        </div>
      )}
    </div>
  );
                    }
                
