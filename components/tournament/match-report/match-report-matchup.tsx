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
      {/* 🟢 MATCHUP HEADER: STRUKTUR SIMETRIS PERSIS SAMA DENGAN FOOTER */}
      <div className="bg-[#003882] p-2 sm:p-4 rounded-t-xl border-t border-x border-[#00a2ff]/40 shadow-inner">
        <div className="grid grid-cols-12 items-center text-center">
          
          {/* SISI KIRI: LOGO TIM A (PINGGIR) + NAMA TIM A (RATA KANAN MENDALAM) */}
          <div className="col-span-5 flex items-center justify-start gap-1.5 sm:gap-3 min-w-0">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-7 w-7 sm:h-12 sm:w-12 object-contain shrink-0 drop-shadow"
            />
            <h3 className="text-[10px] sm:text-base font-black text-white truncate text-left flex-1 pl-1">
              {match.teamAName}
            </h3>
          </div>

          {/* SISI TENGAH: LOGO TWI */}
          <div className="col-span-2 flex justify-center items-center">
            <img
              src="https://www.teamwars.web.id/logo-dc.png"
              alt="TWI"
              className="h-6 sm:h-10 w-auto object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(0,162,255,0.6)]"
            />
          </div>

          {/* SISI KANAN: NAMA TIM B (RATA KIRI MENDALAM) + LOGO TIM B (PINGGIR) */}
          <div className="col-span-5 flex items-center justify-end gap-1.5 sm:gap-3 min-w-0">
            <h3 className="text-[10px] sm:text-base font-black text-white truncate text-right flex-1 pr-1">
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

      {/* ROSTER HORIZONTAL */}
      <div className="bg-[#002863] border-x border-b border-[#00a2ff]/40 p-1 sm:p-2 text-[9px] sm:text-[11px] rounded-b-xl">
        <div className="text-center text-[8px] sm:text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-0.5">
          ROSTER
        </div>
        <div className="grid grid-cols-2 gap-1 text-center font-bold">
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
