"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import {
  DUMMY_MATCH_SCHEDULES,
  DUMMY_ROSTER_A,
  DUMMY_ROSTER_B,
} from "@/lib/constants/tournament-dummy";

export function MatchReportModal({
  match,
  weekNumber,
  onClose,
}: {
  match: MatchScheduleItem;
  weekNumber: number;
  onClose: () => void;
}) {
  // 🟢 1. ROSTER (Murni baca KV, fallback ke nama dummy jika roster belum di-input)
  const rosterA =
    match.rosterA?.mainPlayers?.map((p) => p.playerName) ||
    DUMMY_ROSTER_A.mainPlayers.map((p) => p.playerName);

  const rosterB =
    match.rosterB?.mainPlayers?.map((p) => p.playerName) ||
    DUMMY_ROSTER_B.mainPlayers.map((p) => p.playerName);

  // 🟢 2. GAME LOGS (Dinamis disesuaikan dengan ID tim KV)
  const rawDummyLogs = DUMMY_MATCH_SCHEDULES[0].gameLogs || [];
  
  // Jika KV belum punya gameLogs, ganti dummy winnerTeamId agar cocok dengan match.teamAId / teamBId
  const fallbackLogsWithMatchIds: GameDetailLog[] = rawDummyLogs.map((log) => ({
    ...log,
    winnerTeamId:
      log.winnerTeamId === "team-black-titans" || log.winnerTeamId === "team-a"
        ? match.teamAId
        : match.teamBId,
  }));

  const gameLogs: GameDetailLog[] =
    match.gameLogs && match.gameLogs.length > 0
      ? match.gameLogs
      : fallbackLogsWithMatchIds;

  // 🟢 3. SKOR TERAKHIR (Murni dari KV)
  const isWinA = match.scoreA > match.scoreB;
  const isWinB = match.scoreB > match.scoreA;

  // 🟢 4. FORMAT YOUTUBE STREAM LINK
  const rawStreamLink = match.streamLink || match.streamPlatform || "https://youtube.com";
  const formattedStreamLink = rawStreamLink.startsWith("http")
    ? rawStreamLink
    : `https://${rawStreamLink}`;

  // 🟢 5. FORMAT TANGGAL & WAKTU MURNI DARI JADWAL (KV)
  const matchDateFormatted = new Date(match.matchDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl border-2 border-[#0099ff] bg-[#0051a8] p-4 sm:p-6 text-white shadow-[0_0_50px_rgba(0,153,255,0.4)] overflow-y-auto max-h-[95vh] font-sans">
        
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-sky-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-bold z-10"
        >
          ✕
        </button>

        {/* 1. TOP INFO BAR */}
        <div className="grid grid-cols-3 items-center border-b border-[#0088ff] pb-3 text-center text-xs font-semibold text-sky-100">
          {/* Streamer & Link Youtube */}
          <div>
            <div className="font-extrabold text-white text-sm">
              {match.streamer || "Alroy_Yuan"}
            </div>
            <a
              href={formattedStreamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-sky-200 opacity-90 hover:text-amber-300 underline transition truncate block max-w-[150px] mx-auto"
            >
              {formattedStreamLink.replace(/^https?:\/\//, "")}
            </a>
          </div>

          {/* Referee */}
          <div>
            <div className="text-[10px] uppercase text-sky-200 tracking-wider">
              REFEREE
            </div>
            <div className="font-extrabold text-white text-sm">
              {match.referee || "vG®D WHY"}
            </div>
          </div>

          {/* Season, Week & Tanggal Asli dari KV */}
          <div>
            <div className="font-extrabold text-white text-sm">
              Season 16 Week {weekNumber}
            </div>
            <div className="text-[10px] text-sky-200 opacity-90">
              {matchDateFormatted} • 20.00 WIB
            </div>
          </div>
        </div>

        {/* TITLE */}
        <h2 className="my-2.5 text-center text-xl font-black tracking-widest text-[#ff9900] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          MATCH REPORT
        </h2>

        {/* 2. MATCHUP HEADER (100% NAMA & LOGO DARI JADWAL KV) */}
        <div className="grid grid-cols-3 items-center bg-[#003c80] p-3 rounded-t-xl border-t border-x border-[#0088ff]">
          <div className="flex items-center gap-3">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt={match.teamAName}
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow"
            />
            <h3 className="text-base sm:text-lg font-black text-white truncate">
              {match.teamAName}
            </h3>
          </div>

          <div className="flex justify-center">
            <img
              src="https://www.teamwars.web.id/logo-dc.png"
              alt="Team Wars Indonesia"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,153,255,0.6)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 text-right">
            <h3 className="text-base sm:text-lg font-black text-white truncate">
              {match.teamBName}
            </h3>
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt={match.teamBName}
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow"
            />
          </div>
        </div>

        {/* 3. ROSTER SECTION */}
        <div className="bg-[#002b5e] border-x border-[#0088ff] text-[11px]">
          <div className="bg-[#00224a] py-0.5 text-center text-[10px] font-bold text-sky-300 uppercase tracking-wider border-y border-[#0088ff]">
            ROSTER
          </div>
          <div className="grid grid-cols-2 p-2.5 gap-4">
            <div className="flex flex-wrap justify-center gap-1.5">
              {rosterA.map((pName, i) => (
                <span
                  key={i}
                  className="rounded-md border border-[#0077e6] bg-[#003875] px-2 py-0.5 text-[10px] font-bold text-sky-100 shadow-sm"
                >
                  {pName}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {rosterB.map((pName, i) => (
                <span
                  key={i}
                  className="rounded-md border border-[#0077e6] bg-[#003875] px-2 py-0.5 text-[10px] font-bold text-sky-100 shadow-sm"
                >
                  {pName}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. GAME LOGS TABLE */}
        <div className="overflow-x-auto border-x border-[#0088ff] bg-[#00448e]">
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
              {gameLogs.map((log: GameDetailLog, idx: number) => {
                const isAWin = log.winnerTeamId === match.teamAId;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-[#004d9e] transition font-medium text-[11px]"
                  >
                    <td className="py-1.5 px-2 text-white font-semibold">
                      {log.teamAPlayerName}
                    </td>
                    <td className="py-1.5 px-2 text-sky-100">
                      {log.teamASkill}
                    </td>
                    <td className="py-1.5 px-2 text-sky-100">
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

                    <td className="py-1.5 px-2 text-sky-100">
                      {log.teamBDeck}
                    </td>
                    <td className="py-1.5 px-2 text-sky-100">
                      {log.teamBSkill}
                    </td>
                    <td className="py-1.5 px-2 text-white font-semibold">
                      {log.teamBPlayerName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER RESULT SCORE (DARI JADWAL KV) */}
        <div className="grid grid-cols-3 items-center rounded-b-xl border border-[#0088ff] bg-[#00336e] p-3 text-center">
          <div className="text-3xl font-black text-[#00ff66]">
            {isWinA ? "W" : "L"}
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[#ff9900]">
            <span className="text-base sm:text-xl font-black text-white truncate max-w-[110px] sm:max-w-[180px]">
              {match.teamAName}
            </span>
            <span className="text-2xl sm:text-3xl font-black">
              {match.scoreA} - {match.scoreB}
            </span>
            <span className="text-base sm:text-xl font-black text-white truncate max-w-[110px] sm:max-w-[180px]">
              {match.teamBName}
            </span>
          </div>

          <div className="text-3xl font-black text-[#ff3333]">
            {isWinB ? "W" : "L"}
          </div>
        </div>

      </div>
    </div>
  );
}
