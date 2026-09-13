"use client";

import {
  PowerRankingPlayer,
  PowerRankingGrandTotal,
} from "../_library/power-ranking";
import { PowerRankingSpotlight } from "./power-ranking-spotlight";
import { PowerRankingRow } from "./power-ranking-row";

interface PowerRankingTableProps {
  players: PowerRankingPlayer[];
  grandTotal?: PowerRankingGrandTotal;
  isTeamView: boolean;
}

export function PowerRankingTable({
  players,
  grandTotal,
  isTeamView,
}: PowerRankingTableProps) {
  // Rank 1 dipisah ke Spotlight jika bukan di filter tim
  const topOnePlayer = !isTeamView && players.length > 0 ? players[0] : null;
  const tablePlayers =
    !isTeamView && players.length > 0 ? players.slice(1) : players;

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      {/* 1. Spotlight Card: Sticky di Global & Divisi */}
      {topOnePlayer && <PowerRankingSpotlight player={topOnePlayer} />}

      {/* 2. Container Tabel Utama */}
      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[340px]">
            <thead className="bg-muted/50 text-[9.5px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider border-b border-border/40">
              <tr>
                <th className="py-2.5 px-1 text-center w-[10%]">Rank</th>
                <th className="py-2.5 pl-2 pr-1 w-[32%]">Player Name</th>
                <th className="py-2.5 px-1 w-[28%]">Team Name</th>
                <th className="py-2.5 px-1 text-center w-[12%]">P / W / L</th>
                <th className="py-2.5 px-1 text-center w-[10%]">WPM</th>
                <th className="py-2.5 pr-2 pl-1 text-center w-[10%]">AGG</th>
              </tr>
            </thead>

            <tbody>
              {tablePlayers.length > 0 ? (
                tablePlayers.map((player) => (
                  <PowerRankingRow
                    key={`${player.teamSlug}-${player.name}`}
                    player={player}
                    isTeamView={isTeamView}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-xs text-muted-foreground"
                  >
                    Tidak ada data pemain pada pekan ini.
                  </td>
                </tr>
              )}
            </tbody>

            {/* 3. Baris Grand Total (Hanya saat filter spesifik tim) */}
            {isTeamView && grandTotal && (
              <tfoot className="bg-muted/70 font-black border-t-2 border-border/80 text-[10px] sm:text-xs">
                <tr>
                  <td colSpan={3} className="py-2.5 pl-3 text-left uppercase text-foreground">
                    Grand Total
                  </td>
                  <td className="py-2.5 px-1 text-center text-foreground">
                    {grandTotal.played} / {grandTotal.won} / {grandTotal.lost}
                  </td>
                  <td className="py-2.5 px-1 text-center text-primary">
                    {grandTotal.wpm.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-2 pl-1 text-center">
                    <span
                      className={
                        grandTotal.agg > 0
                          ? "text-emerald-500"
                          : grandTotal.agg < 0
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      }
                    >
                      {grandTotal.agg > 0 ? `+${grandTotal.agg}` : grandTotal.agg}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
