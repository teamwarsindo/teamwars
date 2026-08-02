"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function MatchReportModal({
  match,
  weekNumber,
  onClose,
}: {
  match: MatchScheduleItem;
  weekNumber: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          ✕
        </button>

        {/* Header Match */}
        <div className="flex flex-col gap-3 border-b border-border pb-4 mb-4 text-center">
          <span className="text-xs font-bold text-sky-400 uppercase">
            {match.groupName} • Week {weekNumber}
          </span>
          
          <div className="flex items-center justify-around my-2">
            <div className="flex flex-col items-center gap-1 w-1/3">
              <img src={match.teamALogo} alt="" className="h-12 w-12 object-contain" />
              <span className="font-black text-xs sm:text-sm text-center">{match.teamAName}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-black text-sky-400">
                {match.scoreA} - {match.scoreB}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Race To 10 Wins</span>
            </div>

            <div className="flex flex-col items-center gap-1 w-1/3">
              <img src={match.teamBLogo} alt="" className="h-12 w-12 object-contain" />
              <span className="font-black text-xs sm:text-sm text-center">{match.teamBName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/40">
            <span>Judge: <strong className="text-foreground">{match.referee || "vG®D WHY"}</strong></span>
            <span>Streamer: <strong className="text-foreground">{match.streamer || "Alroy_Yuan"}</strong></span>
          </div>
        </div>

        {/* Game Logs Table */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-black uppercase text-primary border-b border-border/40 pb-1">
            🎮 Game Detail Logs
          </h4>

          {!match.gameLogs || match.gameLogs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Pertandingan ini belum dimainkan atau laporan log belum di-input oleh Analyst.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
                    <th className="py-2 px-1">#</th>
                    <th className="py-2 px-2">{match.teamAName}</th>
                    <th className="py-2 px-1 text-center">Result</th>
                    <th className="py-2 px-2 text-right">{match.teamBName}</th>
                  </tr>
                </thead>
                <tbody>
                  {match.gameLogs.map((log) => {
                    const isWinA = log.winnerTeamId === match.teamAId;
                    return (
                      <tr key={log.gameNumber} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-2 px-1 font-bold text-muted-foreground">{log.gameNumber}</td>
                        <td className="py-2 px-2">
                          <p className="font-bold">{log.teamAPlayerName}</p>
                          <p className="text-[10px] text-sky-400">{log.teamADeck} ({log.teamASkill})</p>
                        </td>
                        <td className="py-2 px-1 text-center font-black">
                          <span className={isWinA ? "text-emerald-400" : "text-rose-500"}>
                            {isWinA ? "W - L" : "L - W"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <p className="font-bold">{log.teamBPlayerName}</p>
                          <p className="text-[10px] text-sky-400">{log.teamBDeck} ({log.teamBSkill})</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
            }
          
