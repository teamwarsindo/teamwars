"use client";

import { PowerRankingPlayer } from "../_library/power-ranking";

interface PowerRankingRowProps {
  player: PowerRankingPlayer;
  isTeamView: boolean;
}

export function PowerRankingRow({ player, isTeamView }: PowerRankingRowProps) {
  const isZeroPlayed = player.played === 0;

  return (
    <tr
      className={`hover:bg-muted/20 transition-colors border-b border-border/20 ${
        isZeroPlayed ? "opacity-45" : ""
      }`}
    >
      {/* RANK (10%) */}
      <td className="py-2.5 px-1 text-center font-bold text-[11px] sm:text-xs">
        {player.rank}
      </td>

      {/* PLAYER NAME (32%) */}
      <td className="py-2.5 pl-2 pr-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-[11px] sm:text-xs md:text-sm truncate text-foreground">
            {player.name}
          </span>
          {player.isExPlayer && (
            <span className="text-[7.5px] sm:text-[8px] font-black uppercase px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 shrink-0">
              EX
            </span>
          )}
        </div>
      </td>

      {/* TEAM NAME (28%) - Di hide atau tampil polos tanpa logo jika isTeamView */}
      <td className="py-2.5 px-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isTeamView && (
            <img
              src={player.teamLogo || "/logo.webp"}
              alt=""
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 object-contain"
            />
          )}
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate uppercase">
            {player.teamName}
          </span>
        </div>
      </td>

      {/* P / W / L (12%) */}
      <td className="py-2.5 px-1 text-center font-semibold text-foreground text-[10px] sm:text-xs">
        {player.played} / {player.won} / {player.lost}
      </td>

      {/* WPM (10%) */}
      <td className="py-2.5 px-1 text-center font-bold text-primary text-[10px] sm:text-xs">
        {player.wpm.toFixed(2)}
      </td>

      {/* AGG (10%) */}
      <td className="py-2.5 pr-2 pl-1 text-center font-bold text-[10px] sm:text-xs">
        <span
          className={
            player.agg > 0
              ? "text-emerald-500"
              : player.agg < 0
              ? "text-rose-500"
              : "text-muted-foreground"
          }
        >
          {player.agg > 0 ? `+${player.agg}` : player.agg}
        </span>
      </td>
    </tr>
  );
              }
