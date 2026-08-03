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

  const isWinA = match.scoreA > match.scoreB;
  const isWinB = match.scoreB > match.scoreA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl border-2 border-[#0099ff] bg-[#0051a8] p-4 sm:p-6 text-white shadow-[0_0_50px_rgba(0,153,255,0.3)] overflow-y-auto max-h-[95vh] font-sans">
        
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-sky-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-bold z-10"
        >
          ✕
        </button>

        {/* 1. TOP INFO BAR */}
        <div className="grid grid-cols-3 items-center border-b border-[#0088ff] pb-2 text-center text-xs font-semibold text-sky-100">
          <div>
            <div className="font-extrabold text-white text-sm">{match.streamer || "Nousagi"}</div>
            <div className="text-[10px] text-sky-200 opacity-80">{match.streamPlatformUrl || "youtube.com/Nousagi"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-sky-200 tracking-wider">Referee</div>
            <div className="font-extrabold text-white text-sm">{match.referee || "Jazzmine"}</div>
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">Season 16 Week {weekNumber}</div>
            <div className="text-[10px] text-sky-200 opacity-80">
              {new Date(match.matchDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              })}
            </div>
          </div>
        </div>

        {/* TITLE */}
        <h2 className="my-2 text-center text-xl font-black tracking-widest text-[#ff9900] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          Match Report
        </h2>

        {/* 2. MATCHUP HEADER (LOGO & TEAM NAME) */}
        <div className="grid grid-cols-3 items-center bg-[#003c80] p-3 rounded-t-xl border-t border-x border-[#0088ff]">
          <div className="flex items-center gap-3">
            <img src={match.teamALogo} alt="" className="h-14 w-14 object-contain drop-shadow" />
            <h3 className="text-lg font-black text-white">{match.teamAName}</h3>
          </div>

          <div className="flex justify-center">
            <img src="/logo-dc.png" alt="Team Wars" className="h-10 object-contain drop-shadow" />
          </div>

          <div className="flex items-center justify-end gap-3 text-right">
            <h3 className="text-lg font-black text-white">{match.teamBName}</h3>
            <img src={match.teamBLogo} alt="" className="h-14 w-14 object-contain drop-shadow" />
          </div>
        </div>

        {/* 3. ROSTER SECTION */}
        <div className="bg-[#002b5e] border-x border-[#0088ff] text-[11px]">
          <div className="bg-[#00224a] py-0.5 text-center text-[10px] font-bold text-sky-300 uppercase tracking-wider border-y border-[#0088ff]">
            Roster
          </div>
          <div className="grid grid-cols-2 p-2 gap-4 text-center">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-bold text-sky-100">
              {rosterA.length > 0
                ? rosterA.map((p, i) => <span key={i}>{p.playerName}</span>)
                : <span>Venoso, Itami, MacoPin, Hyodo, Naku_10</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-bold text-sky-100">
              {rosterB.length > 0
                ? rosterB.map((p, i) => <span key={i}>{p.playerName}</span>)
                : <span>JInzo, Cajolefa, Ahmed, TacneFrog1, Ree Last</span>}
            </div>
          </div>
        </div>

        {/* 4. GAME LOGS TABLE */}
        <div className="overflow-x-auto border-x border-[#0088ff] bg-[#00448e]">
          {gameLogs.length === 0 ? (
            <p className="py-12 text-center text-xs font-semibold text-sky-200">
              Pertandingan ini belum dimainkan atau laporan log belum di-input.
            </p>
          ) : (
            <table className="w-full text-center text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-[#002b5e] text-[11px] font-bold text-sky-200 border-y border-[#0088ff]">
                  <th className="py-1.5 px-2">Player</th>
                  <th className="py-1.5 px-2">Skill</th>
                  <th className="py-1.5 px-2">Archetype</th>
                  <th className="py-1.5 px-3 text-[#00ffcc]">Gauntlet</th>
                  <th className="py-1.5 px-2">Archetype</th>
                  <th className="py-1.5 px-2">Skill</th>
                  <th className="py-1.5 px-2">Player</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#005bb8]">
                {gameLogs.map((log, idx) => {
                  const isAWin = log.winnerTeamId === match.teamAId;
                  // Efek highlight khusus untuk deck/player tertentu seperti gambar
                  const isHighlightA = log.isHighlightA; 
                  const isHighlightB = log.isHighlightB;

                  return (
                    <tr key={idx} className="hover:bg-[#004d9e] transition font-medium text-[11px]">
                      {/* TEAM A */}
                      <td className={`py-1.5 px-2 ${isHighlightA ? "text-[#ff9900] font-bold" : "text-white"}`}>
                        {log.teamAPlayerName}
                      </td>
                      <td className={`py-1.5 px-2 ${isHighlightA ? "text-[#ff9900]" : "text-sky-100"}`}>
                        {log.teamASkill}
                      </td>
                      <td className={`py-1.5 px-2 ${isHighlightA ? "text-[#ff9900]" : "text-sky-100"}`}>
                        {log.teamADeck}
                      </td>

                      {/* GAUNTLET W / L */}
                      <td className="py-1.5 px-3 font-extrabold text-sm whitespace-nowrap">
                        <span className={isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                          {isAWin ? "W" : "L"}
                        </span>
                        <span className="mx-2 text-sky-300 font-normal"> </span>
                        <span className={!isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                          {!isAWin ? "W" : "L"}
                        </span>
                      </td>

                      {/* TEAM B */}
                      <td className={`py-1.5 px-2 ${isHighlightB ? "text-[#ff9900]" : "text-sky-100"}`}>
                        {log.teamBDeck}
                      </td>
                      <td className={`py-1.5 px-2 ${isHighlightB ? "text-[#ff9900]" : "text-sky-100"}`}>
                        {log.teamBSkill}
                      </td>
                      <td className={`py-1.5 px-2 ${isHighlightB ? "text-[#ff9900] font-bold" : "text-white"}`}>
                        {log.teamBPlayerName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 5. FOOTER RESULT SCORE */}
        <div className="grid grid-cols-3 items-center rounded-b-xl border border-[#0088ff] bg-[#00336e] p-3 text-center">
          <div className="text-3xl font-black text-[#00ff66]">
            {isWinA ? "W" : "L"}
          </div>

          <div className="flex items-center justify-center gap-4 text-[#ff9900]">
            <span className="text-xl font-black text-white">{match.teamAName}</span>
            <span className="text-3xl font-black">{match.scoreA} - {match.scoreB}</span>
            <span className="text-xl font-black text-white">{match.teamBName}</span>
          </div>

          <div className="text-3xl font-black text-[#ff3333]">
            {isWinB ? "W" : "L"}
          </div>
        </div>

      </div>
    </div>
  );
}
