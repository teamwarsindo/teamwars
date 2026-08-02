"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

export function AnalystCenter({
  isAdmin,
  selectedGroupFilter,
  selectedDateFilter,
}: {
  isAdmin: boolean;
  selectedGroupFilter: "ALL" | "Group A" | "Group B";
  selectedDateFilter: string;
}) {
  const [activeTab, setActiveTab] = useState<"MATCH_REPORT" | "DECK_BREAKDOWN" | "POWER_RANKING">("MATCH_REPORT");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);
  
  // Power Ranking Pagination State
  const [powerRankingPage, setPowerRankingPage] = useState(1);

  useEffect(() => {
    fetch("/api/tournament")
      .then((res) => res.json())
      .then((data) => {
        if (data?.schedules) {
          setSchedules(data.schedules);
          if (data.schedules.length > 0) setSelectedMatch(data.schedules[0]);
        }
      });
  }, []);

  // Filter Match Sesuai Filter Utama
  const filteredSchedules = schedules.filter((m) => {
    const matchGroup = selectedGroupFilter === "ALL" || m.groupName === selectedGroupFilter;
    if (!selectedDateFilter) return matchGroup;
    const mDate = new Date(m.matchDate).toLocaleDateString("sv-SE");
    return matchGroup && mDate === selectedDateFilter;
  });

  // Dummy Power Ranking Roster KV Data
  const mockPlayers = Array.from({ length: 35 }).map((_, i) => ({
    rank: i + 1,
    name: `Player_${i + 1}`,
    team: `Team_${(i % 8) + 1}`,
    played: 9,
    wins: 27 - (i % 5),
    losses: 18 + (i % 3),
    wpm: (3.5 - i * 0.05).toFixed(1),
    aggregate: 15 - (i % 4),
  }));

  const itemsPerPage = 10;
  const totalPages = Math.ceil(mockPlayers.length / itemsPerPage);
  const paginatedPlayers = mockPlayers.slice((powerRankingPage - 1) * itemsPerPage, powerRankingPage * itemsPerPage);

  return (
    <div className="w-full flex flex-col gap-5">
      
      {/* 🔲 KOTAK TAB ANALYST */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {[
          { key: "MATCH_REPORT", label: "Match Report" },
          { key: "DECK_BREAKDOWN", label: "Deck Breakdown" },
          { key: "POWER_RANKING", label: "Power Ranking" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl py-3 px-2 text-center text-xs font-extrabold uppercase border transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-sky-600 text-white border-sky-600 shadow-md"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📝 MATCH REPORT (FORMAT GAMBAR REFERENSI MATCH REPORT) */}
      {activeTab === "MATCH_REPORT" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {filteredSchedules.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${
                  selectedMatch?.id === m.id ? "bg-sky-600 text-white border-sky-600" : "bg-card text-muted-foreground border-border"
                }`}
              >
                {m.teamAName} vs {m.teamBName}
              </button>
            ))}
          </div>

          {selectedMatch && (
            <div className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-xl">
              {/* Header Match Report Persis Gambar Referensi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-center border-b border-border pb-4 mb-4">
                <div>Streamer: <span className="font-bold text-sky-400">{selectedMatch.streamer || "Alroy_Yuan"}</span></div>
                <div>Judge: <span className="font-bold text-sky-400">{selectedMatch.referee || "vG®D WHY"}</span></div>
                <div>Date: <span className="font-bold text-sky-400">{new Date(selectedMatch.matchDate).toLocaleDateString("id-ID")}</span></div>
                <div>Format: <span className="font-bold text-amber-400">KOF Race to 10</span></div>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-between my-4">
                <div className="flex items-center gap-3">
                  <img src={selectedMatch.teamALogo} alt="" className="h-10 w-10 object-contain" />
                  <span className="font-black text-sm">{selectedMatch.teamAName}</span>
                </div>
                <div className="text-2xl font-black text-sky-400">
                  {selectedMatch.scoreA} - {selectedMatch.scoreB}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm">{selectedMatch.teamBName}</span>
                  <img src={selectedMatch.teamBLogo} alt="" className="h-10 w-10 object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 👑 POWER RANKING (PAGINATION 10 PER HALAMAN) */}
      {activeTab === "POWER_RANKING" && (
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
          <h3 className="text-xs font-black uppercase text-primary border-b border-border pb-2">
            👑 Player Power Ranking (10 Per Page)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
                  <th className="py-2 px-1">Rank</th>
                  <th className="py-2 px-2">Player Name</th>
                  <th className="py-2 px-2">Team</th>
                  <th className="py-2 px-1 text-center">P/W/L</th>
                  <th className="py-2 px-1 text-center">WPM</th>
                  <th className="py-2 px-1 text-center font-bold text-sky-400">Agg</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((p) => (
                  <tr key={p.rank} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2.5 px-1 font-extrabold">{p.rank}</td>
                    <td className="py-2.5 px-2 font-bold text-sky-400">{p.name}</td>
                    <td className="py-2.5 px-2 text-muted-foreground">{p.team}</td>
                    <td className="py-2.5 px-1 text-center font-semibold">{p.played}/{p.wins}/{p.losses}</td>
                    <td className="py-2.5 px-1 text-center">{p.wpm}</td>
                    <td className="py-2.5 px-1 text-center font-black text-amber-400">{p.aggregate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controls Pagination 10 Per Page */}
          <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">Halaman {powerRankingPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={powerRankingPage === 1}
                onClick={() => setPowerRankingPage((prev) => prev - 1)}
                className="rounded-lg border border-border px-3 py-1 font-bold disabled:opacity-30"
              >
                Sebelumnya
              </button>
              <button
                disabled={powerRankingPage === totalPages}
                onClick={() => setPowerRankingPage((prev) => prev + 1)}
                className="rounded-lg bg-primary px-3 py-1 font-bold text-white disabled:opacity-30"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
