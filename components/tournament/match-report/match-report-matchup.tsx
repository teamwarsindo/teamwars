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
      {/* MATCHUP HEADER DENGAN LOGO TWI DI TENGAH */}
      <div className="grid grid-cols-3 items-center bg-[#003c80] p-3 rounded-t-xl border-t border-x border-sky-400/40">
        {/* Tim A */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img
            src={match.teamALogo || "/logo.webp"}
            alt=""
            className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow"
          />
          <h3 className="text-xs sm:text-lg font-black text-white truncate">{match.teamAName}</h3>
        </div>

        {/* Logo TWI di Tengah */}
        <div className="flex justify-center">
          <img
            src="https://www.teamwars.web.id/logo-dc.png"
            alt="Team Wars Indonesia"
            className="h-9 sm:h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,153,255,0.6)]"
          />
        </div>

        {/* Tim B */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 text-right">
          <h3 className="text-xs sm:text-lg font-black text-white truncate">{match.teamBName}</h3>
          <img
            src={match.teamBLogo || "/logo.webp"}
            alt=""
            className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow"
          />
        </div>
      </div>

      {/* ROSTER HORIZONTAL SEJAJAR PERSIS REFERENSI */}
      <div className="bg-[#002b5e] border-x border-b border-sky-400/40 p-2 text-[11px] rounded-b-xl">
        <div className="text-center text-[10px] font-bold text-sky-300 uppercase tracking-wider mb-1">
          ROSTER
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-bold">
          {/* Roster Tim A */}
          <div className="flex flex-wrap justify-center gap-1.5 text-sky-100">
            {rosterA.length > 0 ? (
              rosterA.map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-[#003875] border border-sky-400/30 text-[10px]">
                  {p.playerName}
                </span>
              ))
            ) : (
              <span className="text-sky-300/50 italic text-[10px]">Roster A</span>
            )}
          </div>

          {/* Roster Tim B */}
          <div className="flex flex-wrap justify-center gap-1.5 text-sky-100">
            {rosterB.length > 0 ? (
              rosterB.map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-[#003875] border border-sky-400/30 text-[10px]">
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
