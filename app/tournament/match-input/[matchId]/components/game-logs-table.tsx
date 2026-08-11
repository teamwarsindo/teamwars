"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

interface GameLogsTableProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
}

export function GameLogsTable({ match, gameLogs, setGameLogs }: GameLogsTableProps) {
  if (gameLogs.length === 0) return null;

  // 🟢 HITUNG AKUMULASI SKOR REAL-TIME PER GAME
  let runningScoreA = 0;
  let runningScoreB = 0;

  return (
    <div className="pt-3 border-t border-border/40 space-y-2">
      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
        📋 Tabel Log Game ({gameLogs.length} Game)
      </h4>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-[10px] sm:text-xs">
          <thead className="bg-muted/50 border-b border-border text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
            <tr>
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2">Pemain A</th>
              <th className="p-2">Deck / Skill A</th>
              <th className="p-2 text-center whitespace-nowrap">Skor</th>
              <th className="p-2">Deck / Skill B</th>
              <th className="p-2">Pemain B</th>
              <th className="p-2 text-center w-8">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-semibold">
            {gameLogs.map((log, idx) => {
              const isAWin = log.winnerTeamId === match.teamAId;
              if (isAWin) runningScoreA++;
              else runningScoreB++;

              const isRepeatA = (log as any).isRepeatA;
              const isRepeatB = (log as any).isRepeatB;

              return (
                <tr key={idx} className="hover:bg-muted/20 transition">
                  <td className="p-2 text-center font-black">#{idx + 1}</td>
                  <td className="p-2 font-bold text-foreground truncate max-w-[100px]">
                    {log.playerAName}
                    {isRepeatA && (
                      <span className="ml-1 text-[8px] bg-amber-500 text-black px-1 py-0.2 rounded font-black">
                        ⚡
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground max-w-[120px]">
                    <div className="truncate font-bold text-foreground">{log.deckA}</div>
                    <div className="truncate text-[8px] opacity-75">({log.skillA})</div>
                  </td>
                  <td className="p-2 text-center font-black whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground font-black text-[11px]">
                      {runningScoreA} - {runningScoreB}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground max-w-[120px]">
                    <div className="truncate font-bold text-foreground">{log.deckB}</div>
                    <div className="truncate text-[8px] opacity-75">({log.skillB})</div>
                  </td>
                  <td className="p-2 font-bold text-foreground truncate max-w-[100px]">
                    {log.playerBName}
                    {isRepeatB && (
                      <span className="ml-1 text-[8px] bg-amber-500 text-black px-1 py-0.2 rounded font-black">
                        ⚡
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-400 font-black text-xs cursor-pointer"
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
                  
