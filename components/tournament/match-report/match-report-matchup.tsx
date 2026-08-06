"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function MatchReportMatchup({
  match,
}: {
  match: MatchScheduleItem;
}) {
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  return (
    <div className="my-1.5 sm:my-3 space-y-1 sm:space-y-2">
      {/* 🟢 MATCHUP HEADER: NAMA TIM NEMPEL DI SAMPING LOGO TIM (KIRI & KANAN MASING-MASING) */}
      <div className="bg-[#003882] p-2 sm:p-4 rounded-t-xl border-t border-x border-[#00a2ff]/40 shadow-inner">
        <div className="flex items-center justify-between gap-1 sm:gap-4 w-full">
          
          {/* TIM A (SISI KIRI: LOGO + NAMA) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 justify-start">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-7 w-7 sm:h-12 sm:w-12 object-contain shrink-0 drop-shadow"
            />
            <h3 className="text-[10px] sm:text-base font-black text-white truncate text-left">
              {match.teamAName}
            </h3>
          </div>

          {/* LOGO TWI (KHUSUS SISI TENGAH) */}
          <div className="flex justify-center items-center px-1 shrink-0">
            <img
              src="https://www.teamwars.web.id/logo-dc.png"
              alt="TWI"
              className="h-6 sm:h-10 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,162,255,0.6)]"
            />
          </div>

          {/* TIM B (SISI KANAN: NAMA + LOGO) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 justify-end text-right">
            <h3 className="text-[10px] sm:text-base font-black text-white truncate text-right">
              {match.teamBName}
            </h3>
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-7 w-7 sm:h-12 sm:w-12 object-contain shrink-0 drop-shadow"
            />
          </div>

        </div>
      </div>

      {/* ROSTER HORIZONTAL UTAMA */}
      <div className="bg-[#002863] border-x border-b border-[#00a2ff]/40 p-1.5 sm:p-2 text-[9px] sm:text-[11px] rounded-b-xl">
        <div className="text-center text-[9px] sm:text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1">
          ROSTER
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-center font-bold">
          <div className="flex flex-wrap justify-center gap-1 text-sky-100">
            {rosterA.length > 0 ? (
              rosterA.map((p, i) => (
                <span key={i} className="px-1 py-0.5 rounded bg-[#003882] border border-[#00a2ff]/30 text-[8px] sm:text-[10px]">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/50 italic text-[8px] sm:text-[10px]">Roster A</span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1 text-sky-100">
            {rosterB.length > 0 ? (
              rosterB.map((p, i) => (
                <span key={i} className="px-1 py-0.5 rounded bg-[#003882] border border-[#00a2ff]/30 text-[8px] sm:text-[10px]">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/50 italic text-[8px] sm:text-[10px]">Roster B</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
