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
    <div className="my-3 space-y-2">
      {/* 🟢 MATCHUP HEADER: NAMA TIM DITARUH DI TENGAH ANTARA LOGO TIM DAN LOGO TWI */}
      <div className="bg-[#003882] p-3 sm:p-4 rounded-t-xl border-t border-x border-[#00a2ff]/40 shadow-inner">
        <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
          {/* Logo Tim A */}
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow"
          />

          {/* Area Tengah: Nama Tim A | Logo TWI | Nama Tim B */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1 text-center min-w-0 px-2">
            <h3 className="text-xs sm:text-lg font-black text-white truncate flex-1 text-right">
              {match.teamAName}
            </h3>

            <img
              src="https://www.teamwars.web.id/logo-dc.png"
              alt="Team Wars Indonesia"
              className="h-8 sm:h-12 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(0,162,255,0.6)]"
            />

            <h3 className="text-xs sm:text-lg font-black text-white truncate flex-1 text-left">
              {match.teamBName}
            </h3>
          </div>

          {/* Logo Tim B */}
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow"
          />
        </div>
      </div>

      {/* ROSTER HORIZONTAL */}
      <div className="bg-[#002863] border-x border-b border-[#00a2ff]/40 p-2 text-[11px] rounded-b-xl">
        <div className="text-center text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1">
          ROSTER
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-bold">
          <div className="flex flex-wrap justify-center gap-1.5 text-sky-100">
            {rosterA.length > 0 ? (
              rosterA.map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-[#003882] border border-[#00a2ff]/30 text-[10px]">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/50 italic text-[10px]">Roster A</span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 text-sky-100">
            {rosterB.length > 0 ? (
              rosterB.map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-[#003882] border border-[#00a2ff]/30 text-[10px]">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/50 italic text-[10px]">Roster B</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
