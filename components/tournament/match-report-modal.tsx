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
  const gameLogs = match.gameLogs || [];
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-2xl border border-sky-500/40 bg-[#0f172a] p-4 sm:p-6 text-white shadow-2xl overflow-y-auto max-h-[95vh] text-xs">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
        >
          ✕
        </button>

        {/* TOP BANNER TITLE */}
        <div className="mb-4 text-center border-b border-sky-500/30 pb-2">
          <h2 className="text-base font-black tracking-widest text-sky-400 uppercase">MATCH REPORT</h2>
          <p className="text-[10px] text-slate-400">{match.groupName} • WEEK {weekNumber}</p>
        </div>

        {/* METADATA BAR (Persis Gambar Referensi) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl bg-slate-900/80 p-2.5 text-[10px] text-center border border-slate-800 mb-4">
          <div>
            <span className="text-slate-400 block">Stream Platform</span>
            <strong className="text-sky-300">{match.streamPlatform || "Youtube"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Streamer</span>
            <strong className="text-slate-200">{match.streamer || "Alroy_Yuan"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Judge</span>
            <strong className="text-slate-200">{match.referee || "vG®D WHY"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Caster</span>
            <strong className="text-slate-200">{match.caster || "Valdo"}</strong>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 block">Date</span>
            <strong className="text-slate-200">
              {new Date(match.matchDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}
            </strong>
          </div>
        </div>

        {/* TEAM HEADER & ROSTER BAR */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* TEAM A */}
          <div className="flex flex-col items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <img src={match.teamALogo} alt="" className="h-10 w-10 object-contain mb-1" />
            <h3 className="font-extrabold text-sm text-sky-400 text-center">{match.teamAName}</h3>
            <div className="mt-2 text-[10px] text-slate-400 text-center">
              <span className="font-bold text-slate-300 block mb-0.5">Roster:</span>
              <p className="line-clamp-2">
                {rosterA.length > 0 ? rosterA.map(p => p.playerName).join(", ") : "Main Players"}
              </p>
            </div>
          </div>

          {/* TEAM B */}
          <div className="flex flex-col items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <img src={match.teamBLogo} alt="" className="h-10 w-10 object-contain mb-1" />
            <h3 className="font-extrabold text-sm text-sky-400 text-center">{match.teamBName}</h3>
            <div className="mt-2 text-[10px] text-slate-400 text-center">
              <span className="font-bold text-slate-300 block mb-0.5">Roster:</span>
              <p className="line-clamp-2">
                {rosterB.length > 0 ? rosterB.map(p => p.playerName).join(", ") : "Main Players"}
              </p>
            </div>
          </div>
        </div>

        {/* GAME LOGS TABLE (FORMAT MATCH REPORT TWI) */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2">
          {gameLogs.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              Pertandingan ini belum dimainkan atau laporan log belum di-input.
            </p>
          ) : (
            <table className="w-full text-left text-[11px] min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-sky-400 uppercase">
                  <th className="py-1.5 px-2">Player A</th>
                  <th className="py-1.5 px-1">Deck</th>
                  <th className="py-1.5 px-1">Skill</th>
                  <th className="py-1.5 px-1 text-center">Result</th>
                  <th className="py-1.5 px-1 text-right">Skill</th>
                  <th className="py-1.5 px-1 text-right">Deck</th>
                  <th className="py-1.5 px-2 text-right">Player B</th>
                </tr>
              </thead>
              <tbody>
                {gameLogs.map((log, idx) => {
                  const isWinA = log.winnerTeamId === match.teamAId;
                  return (
                    <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-900/50">
                      <td className="py-1.5 px-2 font-bold text-slate-200">{log.teamAPlayerName}</td>
                      <td className="py-1.5 px-1 text-slate-400">{log.teamADeck}</td>
                      <td className="py-1.5 px-1 text-slate-400">{log.teamASkill}</td>
                      <td className="py-1.5 px-1 text-center font-black">
                        <span className={isWinA ? "text-emerald-400" : "text-rose-500"}>
                          {isWinA ? "W - L" : "L - W"}
                        </span>
                      </td>
                      <td className="py-1.5 px-1 text-right text-slate-400">{log.teamBSkill}</td>
                      <td className="py-1.5 px-1 text-right text-slate-400">{log.teamBDeck}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-200">{log.teamBPlayerName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FINAL SCORE FOOTER */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 p-3 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-black ${match.scoreA > match.scoreB ? "text-emerald-400" : "text-rose-500"}`}>
              {match.scoreA > match.scoreB ? "WIN" : "LOSE"}
            </span>
            <span className="text-xs font-bold text-slate-300">{match.teamAName}</span>
          </div>

          <div className="text-2xl font-black text-sky-400">
            {match.scoreA} - {match.scoreB}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">{match.teamBName}</span>
            <span className={`text-xl font-black ${match.scoreB > match.scoreA ? "text-emerald-400" : "text-rose-500"}`}>
              {match.scoreB > match.scoreA ? "WIN" : "LOSE"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
          }
