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
      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
        📋 Tabel Log Game ({gameLogs.length} Game)
      </h4>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left border-collapse min-w-[480px]">
          <thead className="bg-muted/60 border-b border-border text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase">
            <tr>
              <th className="p-2 text-center w-6">#</th>
              <th className="p-2 w-28">Players</th>
              <th className="p-2">Archetype (Skill)</th>
              <th className="p-2 text-center w-16 whitespace-nowrap">Score</th>
              <th className="p-2">Archetype (Skill)</th>
              <th className="p-2 w-28">Players</th>
              <th className="p-2 text-center w-7">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 font-medium text-[10px] sm:text-[11px]">
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
                      ? "bg-amber-500/15 dark:bg-amber-500/20 border-l-4 border-l-amber-500 hover:bg-amber-500/25"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <td className="p-2 text-center font-black">{idx + 1}</td>

                  {/* PEMAIN A */}
                  <td className="p-2 font-bold text-foreground leading-tight">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span>{log.playerAName}</span>
                      {isRepeatA && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          ⚡ REPEAT
                        </span>
                      )}
                    </div>
                  </td>

                  {/* ARCHETYPE (SKILL) A */}
                  <td className="p-2 leading-tight">
                    <div className="font-extrabold text-foreground">{log.deckA}</div>
                    <div className="text-[9px] text-muted-foreground font-semibold opacity-85">
                      ({log.skillA})
                    </div>
                  </td>

                  {/* SCORE AKUMULASI (PAS 1 BARIS) */}
                  <td className="p-2 text-center font-black whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-foreground font-black text-[10px] sm:text-[11px] shadow-xs inline-block tracking-wider">
                      {runningScoreA} - {runningScoreB}
                    </span>
                  </td>

                  {/* ARCHETYPE (SKILL) B */}
                  <td className="p-2 leading-tight">
                    <div className="font-extrabold text-foreground">{log.deckB}</div>
                    <div className="text-[9px] text-muted-foreground font-semibold opacity-85">
                      ({log.skillB})
                    </div>
                  </td>

                  {/* PEMAIN B */}
                  <td className="p-2 font-bold text-foreground leading-tight">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span>{log.playerBName}</span>
                      {isRepeatB && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          ⚡ REPEAT
                        </span>
                      )}
                    </div>
                  </td>

                  {/* HAPUS */}
                  <td className="p-2 text-center">
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
