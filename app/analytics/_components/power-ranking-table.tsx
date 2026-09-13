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
  hasPodium: boolean;
}

export function PowerRankingTable({
  players,
  isTeamView,
  grandTotal,
  teamLogoMap,
  hasPodium,
}: PowerRankingTableProps) {
  const renderRankChange = (diff: number, isNew: boolean) => {
    if (isNew) {
      return <span className="text-[8px] font-bold text-amber-500 shrink-0">NEW</span>;
    }
    if (diff > 0) {
      return (
        <span className="text-[8px] font-bold text-emerald-500 shrink-0">
          ▲{diff}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="text-[8px] font-bold text-rose-500 shrink-0">
          ▼{Math.abs(diff)}
        </span>
      );
    }
    return <span className="text-[9px] text-muted-foreground/50 shrink-0">—</span>;
  };

  const renderAgg = (val: number) => {
    if (val > 0) return <span className="text-emerald-500 font-bold">+{val}</span>;
    if (val < 0) return <span className="text-rose-500 font-bold">{val}</span>;
    return <span className="text-muted-foreground font-medium">0</span>;
  };

  // Hitung offset sticky tabel jika ada podium di atasnya
  const stickyHeaderTop = hasPodium
    ? "top-[230px] sm:top-[242px]"
    : "top-[60px] sm:top-[66px]";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[340px]">
          {/* ── STICKY TABLE HEADER ── */}
          <thead className={`sticky ${stickyHeaderTop} z-10 bg-card/95 backdrop-blur-md shadow-xs border-b border-border/80`}>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 pl-2 pr-1 text-center w-14">Rank</th>
              <th className="py-2.5 px-2">Player</th>
              <th className="py-2.5 px-1.5 text-center font-mono w-11 sm:w-14">Played</th>
              <th className="py-2.5 px-1.5 text-center font-mono w-10 sm:w-12 text-emerald-600 dark:text-emerald-400">Win</th>
              <th className="py-2.5 px-1.5 text-center font-mono w-10 sm:w-12 text-rose-600 dark:text-rose-400">Lose</th>
              <th className="py-2.5 px-2 text-center font-mono w-11 sm:w-14">WPM</th>
              <th className="py-2.5 pr-3 pl-2 text-right font-mono w-11 sm:w-14">Agg</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
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

                return (
                  <tr key={`${p.name}-${p.teamSlug}`} className="hover:bg-muted/30 transition-colors">
                    {/* Rank digabung dengan indikator di kiri */}
                    <td className="py-2.5 pl-2 pr-1 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono">
                        {renderRankChange(p.rankDiff, p.isNew)}
                        <span className="font-bold text-foreground text-xs">{p.rank}</span>
                      </div>
                    </td>

                    {/* Player + Circle Team Logo */}
                    <td className="py-2.5 px-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground truncate max-w-[115px] sm:max-w-[180px]">
                          {p.name}
                        </span>
                        {p.isExPlayer && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                            EX
                          </span>
                        )}
                      </div>
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
                    </td>

                    {/* Played, Win, Lose, WPM, Agg */}
                    <td className="py-2.5 px-1.5 text-center font-mono text-[11px] text-foreground/80">
                      {p.played}
                    </td>
                    <td className="py-2.5 px-1.5 text-center font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {p.won}
                    </td>
                    <td className="py-2.5 px-1.5 text-center font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      {p.lost}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-foreground/80">
                      {p.wpm}
                    </td>
                    <td className="py-2.5 pr-3 pl-2 text-right font-mono text-xs">
                      {renderAgg(p.agg)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Total Footer Khusus View Tim */}
          {isTeamView && grandTotal && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50 font-bold text-[11px]">
                <td colSpan={2} className="py-2.5 pl-3 px-2 text-foreground">TOTAL ROSTER</td>
                <td className="py-2.5 px-1.5 text-center font-mono">{grandTotal.played}</td>
                <td className="py-2.5 px-1.5 text-center font-mono text-emerald-600 dark:text-emerald-400">
                  {grandTotal.won}
                </td>
                <td className="py-2.5 px-1.5 text-center font-mono text-rose-600 dark:text-rose-400">
                  {grandTotal.lost}
                </td>
                <td className="py-2.5 px-2 text-center font-mono text-foreground/80">{grandTotal.wpm}</td>
                <td className="py-2.5 pr-3 pl-2 text-right font-mono">{renderAgg(grandTotal.agg)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
