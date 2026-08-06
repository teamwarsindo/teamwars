"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function MatchReportMatchup({
  match,
  scoreA,
  scoreB,
}: {
  match: MatchScheduleItem;
  scoreA: number;
  scoreB: number;
}) {
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  const isWinA = scoreA > scoreB;
  const isWinB = scoreB > scoreA;

  return (
    <div className="space-y-2 my-3">
      <div className="bg-[#003c80] p-3 sm:p-4 rounded-xl border border-sky-400/40 shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-9 w-9 sm:h-14 sm:w-14 object-contain shrink-0"
            />
            <h3 className="text-xs sm:text-lg font-black text-white truncate">{match.teamAName}</h3>
          </div>

          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-sky-400/40 shrink-0">
            <span className={`text-lg sm:text-2xl font-black ${isWinA ? "text-emerald-400" : "text-white"}`}>{scoreA}</span>
            <span className="text-sky-300 font-bold text-xs sm:text-sm">-</span>
            <span className={`text-lg sm:text-2xl font-black ${isWinB ? "text-emerald-400" : "text-white"}`}>{scoreB}</span>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0">
            <h3 className="text-xs sm:text-lg font-black text-white text-right truncate">{match.teamBName}</h3>
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-9 w-9 sm:h-14 sm:w-14 object-contain shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#002b5e] rounded-xl border border-sky-400/30 p-2.5 text-[11px]">
        <div className="text-center text-[10px] font-extrabold text-sky-300 uppercase tracking-wider mb-2">
          ROSTER UTAMA
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-wrap justify-center gap-1">
            {rosterA.length > 0 ? (
              rosterA.map((p, i) => (
                <span key={i} className="rounded-lg border border-sky-500/30 bg-[#003875] px-2 py-0.5 text-[10px] font-bold text-sky-100">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/60 italic text-[10px]">Roster A</span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1">
            {rosterB.length > 0 ? (
              rosterB.map((p, i) => (
                <span key={i} className="rounded-lg border border-sky-500/30 bg-[#003875] px-2 py-0.5 text-[10px] font-bold text-sky-100">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/60 italic text-[10px]">Roster B</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
