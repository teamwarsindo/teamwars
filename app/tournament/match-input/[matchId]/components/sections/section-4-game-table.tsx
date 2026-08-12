"use client";

import { MatchScheduleItem, GameDetailLog, WarningLogItem } from "@/lib/types/tournament";

interface Section4GameTableProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  warningLogs?: WarningLogItem[];
  setWarningLogs?: React.Dispatch<React.SetStateAction<WarningLogItem[]>>;
}

export function Section4GameTable({
  match,
  gameLogs,
  setGameLogs,
  warningLogs = [],
  setWarningLogs,
}: Section4GameTableProps) {
  if (gameLogs.length === 0) return null;

  let runningScoreA = 0;
  let runningScoreB = 0;

  // HAPUS BARIS TERAKHIR & SINKRONKAN UNDO WARNING SS
  const handleDeleteLastGame = (targetIndex: number) => {
    const deletedGameNumber = gameLogs[targetIndex]?.gameNumber || targetIndex + 1;
    
    setGameLogs(gameLogs.filter((_, i) => i !== targetIndex));

    if (setWarningLogs) {
      setWarningLogs((prev) => prev.filter((w) => w.gameNumber !== deletedGameNumber));
    }
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider text-center">
        4. Tabel Log Game ({gameLogs.length} Game)
      </h4>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-center border-collapse min-w-[500px]">
          <thead className="bg-muted/60 border-b border-border text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase">
            <tr>
              <th className="p-2 text-center w-6 align-middle">#</th>
              <th className="p-2 text-center w-[20%] align-middle">Players</th>
              <th className="p-2 text-center w-[28%] align-middle leading-tight">
                Archetype
                <br />
                <span className="text-[8px] font-semibold opacity-70">(Skill)</span>
              </th>
              <th className="p-2 text-center w-16 whitespace-nowrap align-middle">Score</th>
              <th className="p-2 text-center w-[28%] align-middle leading-tight">
                Archetype
                <br />
                <span className="text-[8px] font-semibold opacity-70">(Skill)</span>
              </th>
              <th className="p-2 text-center w-[20%] align-middle">Players</th>
              <th className="p-2 text-center w-6 align-middle">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 font-medium text-[10px] sm:text-[11px] align-middle">
            {gameLogs.map((log, idx) => {
              const isLastRow = idx === gameLogs.length - 1;
              const isAWin = log.winnerTeamId === match.teamAId;
              if (isAWin) runningScoreA++;
              else runningScoreB++;

              return (
                <tr key={log.gameNumber || idx} className="hover:bg-muted/20 transition">
                  <td className="p-2 text-center font-black align-middle text-muted-foreground">
                    {idx + 1}
                  </td>

                  {/* PEMAIN TIM A (BADGE TL DI SEBELAH KIRI NAMA) */}
                  <td className="p-2 text-center font-bold leading-tight align-middle break-words text-foreground">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {log.isTLA && (
                        <span className="text-[8px] font-black bg-rose-500 text-white px-1 rounded uppercase shrink-0">
                          TL
                        </span>
                      )}
                      <span className={isAWin ? "text-emerald-500 font-black" : "text-foreground"}>
                        {log.playerAName}
                      </span>
                      {log.isRepeatA && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          R
                        </span>
                      )}
                    </div>
                  </td>

                  {/* DECK TIM A */}
                  <td className="p-2 text-center leading-tight align-middle break-words text-foreground">
                    <div className={isAWin ? "text-emerald-500 font-black" : "font-extrabold"}>
                      {log.deckA}
                    </div>
                    {log.skillA && <div className="text-[9px] opacity-80">({log.skillA})</div>}
                  </td>

                  {/* SKOR AKUMULASI */}
                  <td className="p-2 text-center font-black whitespace-nowrap align-middle">
                    <span className="px-2 py-0.5 rounded bg-background border border-border text-foreground font-black text-[10px] sm:text-[11px] shadow-xs inline-block tracking-wider">
                      {runningScoreA} - {runningScoreB}
                    </span>
                  </td>

                  {/* DECK TIM B */}
                  <td className="p-2 text-center leading-tight align-middle break-words text-foreground">
                    <div className={!isAWin ? "text-emerald-500 font-black" : "font-extrabold"}>
                      {log.deckB}
                    </div>
                    {log.skillB && <div className="text-[9px] opacity-80">({log.skillB})</div>}
                  </td>

                  {/* PEMAIN TIM B (BADGE TL DI SEBELAH KANAN NAMA) */}
                  <td className="p-2 text-center font-bold leading-tight align-middle break-words text-foreground">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {log.isRepeatB && (
                        <span className="text-[8px] font-black bg-amber-500 text-black px-1 rounded uppercase shrink-0">
                          R
                        </span>
                      )}
                      <span className={!isAWin ? "text-emerald-500 font-black" : "text-foreground"}>
                        {log.playerBName}
                      </span>
                      {log.isTLB && (
                        <span className="text-[8px] font-black bg-rose-500 text-white px-1 rounded uppercase shrink-0">
                          TL
                        </span>
                      )}
                    </div>
                  </td>

                  {/* HAPUS HANYA BARIS TERAKHIR */}
                  <td className="p-2 text-center align-middle">
                    {isLastRow ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteLastGame(idx)}
                        className="text-rose-500 hover:text-rose-400 font-black text-xs p-1 cursor-pointer"
                        title="Hapus Game Terakhir"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="text-muted-foreground/30 font-bold text-xs cursor-not-allowed">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CATATAN WARNING HISTORI SS */}
      {warningLogs.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-[10px]">
          <div className="font-extrabold text-amber-500 uppercase tracking-wider flex items-center justify-between">
            <span>⚠️ Catatan Histori Warning Screenshot Tim</span>
            <span className="text-[9px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">
              Total Log: {warningLogs.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-500/20 font-medium">
            {warningLogs.map((w, idx) => (
              <li key={idx} className="py-1 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">Game #{w.gameNumber}</span>: Tim{" "}
                  <span className="font-extrabold text-primary">{w.teamName}</span> menerima{" "}
                  <span className="font-black text-amber-500">Warning #{w.warningNumber}</span> (Lupa SS).
                </div>
                {w.isTechnicalLossTriggered && (
                  <span className="text-[8px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded uppercase">
                    Deck Lose (TL) Triggered
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}