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
  // Ambil Roster & pastikan slot 5 posisi terisi/fallback
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  const slotsA = Array.from({ length: 5 }, (_, i) => rosterA[i]?.playerName || `-`);
  const slotsB = Array.from({ length: 5 }, (_, i) => rosterB[i]?.playerName || `-`);

  const isWinA = scoreA > scoreB;
  const isWinB = scoreB > scoreA;

  return (
    <div className="space-y-3 my-3">
      {/* Header Matchup & Skor */}
      <div className="bg-[#003c80] p-3 sm:p-4 rounded-xl border border-sky-400/40 shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0"
            />
            <h3 className="text-xs sm:text-base font-black text-white truncate">{match.teamAName}</h3>
          </div>

          <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-xl bg-black/40 border border-sky-400/40 shrink-0">
            <span className={`text-base sm:text-xl font-black ${isWinA ? "text-emerald-400" : "text-white"}`}>{scoreA}</span>
            <span className="text-sky-300 font-bold text-xs">-</span>
            <span className={`text-base sm:text-xl font-black ${isWinB ? "text-emerald-400" : "text-white"}`}>{scoreB}</span>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0">
            <h3 className="text-xs sm:text-base font-black text-white text-right truncate">{match.teamBName}</h3>
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Roster 5 Posisi */}
      <div className="bg-[#002b5e] rounded-xl border border-sky-400/30 p-2.5 text-[11px]">
        <div className="text-center text-[10px] font-extrabold text-sky-300 uppercase tracking-wider mb-2">
          ROSTER 5 POSISI
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Tim A (5 Posisi) */}
          <div className="space-y-1">
            {slotsA.map((name, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-[#003875] px-2 py-1 text-[10px]">
                <span className="text-sky-400 font-bold">P{i + 1}</span>
                <span className="font-bold text-sky-100 truncate max-w-[100px]">{name}</span>
              </div>
            ))}
          </div>

          {/* Tim B (5 Posisi) */}
          <div className="space-y-1">
            {slotsB.map((name, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-sky-500/20 bg-[#003875] px-2 py-1 text-[10px]">
                <span className="font-bold text-sky-100 truncate max-w-[100px]">{name}</span>
                <span className="text-sky-400 font-bold">P{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
