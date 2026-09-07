"use client";

import { useEffect, useState } from "react";
import { MatchScheduleItem } from "@/app/tournament/_library";

interface MatchReportModalProps {
  open?: boolean;
  match: MatchScheduleItem | null;
  weekNumber?: number;
  onClose: () => void;
}

export function MatchReportModal({
  open,
  match,
  weekNumber,
  onClose,
}: MatchReportModalProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (match || open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [match, open]);

  // Fetch report lengkap dari Redis saat modal terbuka
  useEffect(() => {
    if (!open && !match) {
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      if (!match?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/tournament/match-report?matchId=${match.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
        } else {
          setReport(null);
        }
      } catch (err) {
        console.error("Gagal memuat report data:", err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [match?.id, open]);

  if (!match || (open !== undefined && !open)) return null;

  // Prioritaskan data dari reportData KV, fallback ke props match
  const teamAName = report?.teamA?.name || match.teamAName;
  const teamBName = report?.teamB?.name || match.teamBName;
  const teamALogo = report?.teamA?.logo || match.teamALogo || "/logo.webp";
  const teamBLogo = report?.teamB?.logo || match.teamBLogo || "/logo.webp";
  const scoreA = report?.scoreA ?? match.scoreA ?? 0;
  const scoreB = report?.scoreB ?? match.scoreB ?? 0;
  const referee = report?.referee || match.referee || "Kireina";
  const streamer = report?.streamer || match.streamer || "-";
  const caster = report?.caster || "-";
  const dateStr = match.matchDate
    ? new Date(match.matchDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    : "-";

  // Roster Lineup
  const rosterA: string[] =
    report?.teamA?.players ||
    match.rosterA?.mainPlayers?.map((p) => p.playerName) ||
    [];
  const rosterB: string[] =
    report?.teamB?.players ||
    match.rosterB?.mainPlayers?.map((p) => p.playerName) ||
    [];

  // Game Logs
  const games: any[] = report?.games || match.gameLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 text-white shadow-2xl animate-in zoom-in-95">
        
        {/* MODAL CLOSE BAR */}
        <div className="flex items-center justify-between bg-neutral-950 px-4 py-2 border-b border-neutral-800">
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
            Official Sheet View • {match.groupName}
          </span>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            ✕ Tutup
          </button>
        </div>

        {/* CONTAINER TABEL SPREADSHEET (SUPPORT HORIZONTAL SCROLL ON MOBILE) */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4">
          <div className="min-w-[820px] border-4 border-black bg-white text-black font-sans shadow-md">
            
            {/* HEADER 1: TITLE TURNAMEN */}
            <div className="bg-[#ff0000] py-1.5 text-center text-sm sm:text-base font-black tracking-wider text-white uppercase border-b-2 border-black">
              TEAM WARS INDONESIA SEASON 7
            </div>

            {/* HEADER 2: MATCH REPORT & WEEK */}
            <div className="grid grid-cols-2 border-b-2 border-black bg-[#ff0000] text-center text-xs sm:text-sm font-black text-white uppercase">
              <div className="py-1 border-r-2 border-black tracking-wide">MATCH REPORT</div>
              <div className="py-1 tracking-wide">WEEK {weekNumber || 6}</div>
            </div>

            {/* HEADER 3: PETUGAS & TANGGAL */}
            <div className="grid grid-cols-5 border-b-2 border-black bg-[#ff0000] text-center text-[10px] font-bold text-white uppercase">
              <div className="border-r-2 border-black py-1">
                <span className="block text-[8px] opacity-80">Stream Platform</span>
                <span>-</span>
              </div>
              <div className="border-r-2 border-black py-1 truncate px-1">
                <span className="block text-[8px] opacity-80">Streamer</span>
                <span>{streamer}</span>
              </div>
              <div className="border-r-2 border-black py-1 truncate px-1">
                <span className="block text-[8px] opacity-80">Judge</span>
                <span>{referee}</span>
              </div>
              <div className="border-r-2 border-black py-1 truncate px-1">
                <span className="block text-[8px] opacity-80">Caster</span>
                <span>{caster}</span>
              </div>
              <div className="py-1">
                <span className="block text-[8px] opacity-80">Date</span>
                <span>{dateStr}</span>
              </div>
            </div>

            {/* BARIS NAMA TIM & ROSTER HEADER */}
            <div className="grid grid-cols-[1fr_80px_1fr] border-b-2 border-black">
              {/* TIM A */}
              <div className="flex items-center bg-[#ff0000] text-white border-r-2 border-black p-1.5">
                <div className="h-10 w-10 shrink-0 bg-white p-1 rounded flex items-center justify-center mr-2 border border-black">
                  <img src={teamALogo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 truncate">
                  <span className="block text-sm sm:text-base font-black truncate">{teamAName}</span>
                  <div className="text-[9px] text-white/90 truncate">
                    {rosterA.slice(0, 6).join(" • ") || "Lineup belum ada"}
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center font-black text-base italic bg-neutral-100 text-neutral-800 border-r-2 border-black">
                VS
              </div>

              {/* TIM B */}
              <div className="flex items-center justify-end bg-[#ff0000] text-white p-1.5 text-right">
                <div className="flex-1 truncate">
                  <span className="block text-sm sm:text-base font-black truncate">{teamBName}</span>
                  <div className="text-[9px] text-white/90 truncate">
                    {rosterB.slice(0, 6).join(" • ") || "Lineup belum ada"}
                  </div>
                </div>
                <div className="h-10 w-10 shrink-0 bg-white p-1 rounded flex items-center justify-center ml-2 border border-black">
                  <img src={teamBLogo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            </div>

            {/* HEADER KOLOM TABEL GAME */}
            <div className="grid grid-cols-[24px_110px_110px_140px_50px_140px_110px_110px_24px] border-b-2 border-black bg-neutral-200 text-center text-[9px] font-black uppercase text-neutral-800">
              <div className="py-1 border-r border-black">R</div>
              <div className="py-1 border-r border-black">PLAYER</div>
              <div className="py-1 border-r border-black">DECK</div>
              <div className="py-1 border-r-2 border-black">SKILL</div>
              <div className="py-1 border-r-2 border-black bg-neutral-300">RESULT</div>
              <div className="py-1 border-r border-black">SKILL</div>
              <div className="py-1 border-r border-black">DECK</div>
              <div className="py-1 border-r border-black">PLAYER</div>
              <div className="py-1">R</div>
            </div>

            {/* DAFTAR BARIS GAME (1 S/D 18 ATAU SESUAI LOG) */}
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-neutral-500 bg-neutral-50">
                Memuat rincian duel dari server...
              </div>
            ) : games.length === 0 ? (
              <div className="p-8 text-center text-xs italic text-neutral-500 bg-neutral-50">
                Belum ada rincian game yang dipublikasikan.
              </div>
            ) : (
              <div className="divide-y divide-black/40 text-[10px]">
                {games.map((g, idx) => {
                  const isAWin = g.winner === "A" || g.winnerTeamId === match.teamAId;
                  const isRepeatA = !!g.isRepeatA;
                  const isRepeatB = !!g.isRepeatB;

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[24px_110px_110px_140px_50px_140px_110px_110px_24px] text-center hover:bg-red-50/50 transition-colors bg-[#f8d7da]/20"
                    >
                      {/* Repeat A */}
                      <div className="py-1 font-bold border-r border-black/50 bg-neutral-100 flex items-center justify-center">
                        {isRepeatA ? "R" : ""}
                      </div>
                      {/* Player A */}
                      <div className="py-1 px-1 font-bold truncate border-r border-black/50 text-left">
                        {g.playerAName || "-"}
                      </div>
                      {/* Deck A */}
                      <div className="py-1 px-1 truncate border-r border-black/50 text-neutral-700 text-left">
                        {g.deckA || "-"}
                      </div>
                      {/* Skill A */}
                      <div className="py-1 px-1 truncate border-r-2 border-black text-neutral-700 text-left">
                        {g.skillA || "-"}
                      </div>

                      {/* RESULT W / L DI TENGAH */}
                      <div className="flex border-r-2 border-black bg-black font-black text-[10px] text-white">
                        <div className={`w-1/2 flex items-center justify-center ${isAWin ? "text-emerald-400" : "text-neutral-500"}`}>
                          {isAWin ? "W" : "L"}
                        </div>
                        <div className={`w-1/2 flex items-center justify-center border-l border-neutral-700 ${!isAWin ? "text-emerald-400" : "text-neutral-500"}`}>
                          {!isAWin ? "W" : "L"}
                        </div>
                      </div>

                      {/* Skill B */}
                      <div className="py-1 px-1 truncate border-r border-black/50 text-neutral-700 text-right">
                        {g.skillB || "-"}
                      </div>
                      {/* Deck B */}
                      <div className="py-1 px-1 truncate border-r border-black/50 text-neutral-700 text-right">
                        {g.deckB || "-"}
                      </div>
                      {/* Player B */}
                      <div className="py-1 px-1 font-bold truncate border-r border-black/50 text-right">
                        {g.playerBName || "-"}
                      </div>
                      {/* Repeat B */}
                      <div className="py-1 font-bold bg-neutral-100 flex items-center justify-center">
                        {isRepeatB ? "R" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FOOTER SKOR AKHIR */}
            <div className="grid grid-cols-[30px_1fr_90px_1fr_30px] border-t-2 border-black bg-[#ff0000] text-white font-black text-xs sm:text-sm text-center">
              <div className="py-1.5 flex items-center justify-center border-r-2 border-black bg-black text-white">
                {scoreA > scoreB ? "W" : "L"}
              </div>
              <div className="py-1.5 truncate px-2 text-left">{teamAName}</div>
              <div className="py-1.5 flex items-center justify-center bg-white text-black border-x-2 border-black font-black text-sm sm:text-base">
                {scoreA} - {scoreB}
              </div>
              <div className="py-1.5 truncate px-2 text-right">{teamBName}</div>
              <div className="py-1.5 flex items-center justify-center border-l-2 border-black bg-black text-white">
                {scoreB > scoreA ? "W" : "L"}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
              }
