"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

interface GameLogsTableProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
}

export function GameLogsTable({ match, gameLogs, setGameLogs }: GameLogsTableProps) {
  if (gameLogs.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border/40 space-y-2">
      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
        📋 Tabel Log Game ({gameLogs.length} Game Tercatat)
      </h4>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
            <tr>
              <th className="p-2.5 text-center">#</th>
              <th className="p-2.5">Pemain A</th>
              <th className="p-2.5">Deck / Skill A</th>
              <th className="p-2.5 text-center">Hasil</th>
              <th className="p-2.5">Deck / Skill B</th>
              <th className="p-2.5">Pemain B</th>
              <th className="p-2.5 text-center">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-medium text-[11px]">
            {gameLogs.map((log, idx) => {
              const isAWin = log.winnerTeamId === match.teamAId;

              return (
                <tr key={idx} className="hover:bg-muted/20 transition">
                  <td className="p-2.5 text-center font-bold">#{idx + 1}</td>
                  <td className="p-2.5 font-bold text-foreground">{log.playerAName}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {log.deckA} <span className="text-[9px]">({log.skillA})</span>
                  </td>
                  <td className="p-2.5 text-center font-extrabold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        isAWin ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {isAWin ? "1 - 0" : "0 - 1"}
                    </span>
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {log.deckB} <span className="text-[9px]">({log.skillB})</span>
                  </td>
                  <td className="p-2.5 font-bold text-foreground">{log.playerBName}</td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-400 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
              }
                  
