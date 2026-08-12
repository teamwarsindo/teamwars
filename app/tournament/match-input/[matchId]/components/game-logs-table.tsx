"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

interface GameLogsTableProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
}

export function GameLogsTable({ match, gameLogs, setGameLogs }: GameLogsTableProps) {
  if (gameLogs.length === 0) return null;

  let runningScoreA = 0;
  let runningScoreB = 0;

  return (
    <div className="pt-3 border-t border-border/40 space-y-2">
      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider text-center">
        📋 Tabel Log Game ({gameLogs.length} Game)
      </h4>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-center border-collapse min-w-[540px]">
          <thead className="bg-muted/60 border-b border-border text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase">
            <tr>
              <th className="p-2 text-center w-6 align-middle">#</th>
              <th className="p-2 text-center w-[20%] align-middle">Players</th>
              <th className="p-2 text-center w-[28%] align-middle">Archetype (Skill)</th>
              <th className="p-2 text-center w-16 whitespace-nowrap align-middle">Score</th>
              <th className="p-2 text-center w-[28%] align-middle">Archetype (Skill)</th>
              <th className="p-2 text-center w-[20%] align-middle">Players</th>
              <th className="p-2 text-center w-6 align-middle">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 font-medium text-[10px] sm:text-[11px] align-middle">
            {gameLogs.map((log, idx) => {
              const isAWin = log.winnerTeamId === match.teamAId;
              if (isAWin) runningScoreA++;
              else runningScoreB++;

              const isRepeatA = (log as any).isRepeatA;
              const isRepeatB = (log as any).isRepeatB;
              const isAnyRepeat = isRepeatA || isRepeatB;

              return (
                <tr
                  key={idx}
                  className={`transition ${
                    isAnyRepeat
                      ? "bg-amber-500/20 dark:bg-amber-500/25 border-l-4 border-l-amber-500 hover:bg-amber-500/30"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <td className="p-2 text-center font-black align-middle">{idx + 1}</td>

                  {/* 🟢 FIX 4: HIGHLIGHT PEMAIN & DECK TIM A KETIKA WIN */}
                  <td
                    className={`p-2 text-center font-bold leading-tight align-middle break-words ${
                      isAWin
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border-y border-emerald-500/30"
                        : "opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <span>{log.playerAName}</span>
                      {isRepeatA && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          R
                        </span>
                      )}
                    </div>
                  </td>

                  <td
                    className={`p-2 text-center leading-tight align-middle break-words ${
                      isAWin
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border-y border-emerald-500/30"
                        : "opacity-75"
                    }`}
                  >
                    <div className="font-extrabold">{log.deckA}</div>
                    <div className="text-[9px] opacity-80">({log.skillA})</div>
                  </td>

                  {/* SCORE AKUMULASI PAS 1 BARIS */}
                  <td className="p-2 text-center font-black whitespace-nowrap align-middle">
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-foreground font-black text-[10px] sm:text-[11px] shadow-xs inline-block tracking-wider">
                      {runningScoreA} - {runningScoreB}
                    </span>
                  </td>

                  {/* 🟢 FIX 4: HIGHLIGHT PEMAIN & DECK TIM B KETIKA WIN */}
                  <td
                    className={`p-2 text-center leading-tight align-middle break-words ${
                      !isAWin
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border-y border-emerald-500/30"
                        : "opacity-75"
                    }`}
                  >
                    <div className="font-extrabold">{log.deckB}</div>
                    <div className="text-[9px] opacity-80">({log.skillB})</div>
                  </td>

                  <td
                    className={`p-2 text-center font-bold leading-tight align-middle break-words ${
                      !isAWin
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black border-y border-emerald-500/30"
                        : "opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <span>{log.playerBName}</span>
                      {isRepeatB && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          R
                        </span>
                      )}
                    </div>
                  </td>

                  {/* HAPUS */}
                  <td className="p-2 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-400 font-black text-xs p-1 cursor-pointer"
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
