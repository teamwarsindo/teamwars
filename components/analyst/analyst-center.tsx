"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, MatchRosterConfig, GameDetailLog } from "@/lib/types/tournament";
import { calculateDeckBreakdown } from "@/lib/tournament/calculator";
import Swal from "sweetalert2";

export function AnalystCenter({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"MATCH_REPORT" | "DECK_BREAKDOWN" | "META_ANALYSIS" | "POWER_RANKING">("MATCH_REPORT");
  const [schedules, setSchedules] = useState<MatchScheduleItem[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchScheduleItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State Form KOF Game Logger
  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>([]);

  const fetchTournamentData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();
      if (data && data.schedules) {
        setSchedules(data.schedules);
        if (!selectedMatch && data.schedules.length > 0) {
          setSelectedMatch(data.schedules[0]);
          setGameLogs(data.schedules[0].gameLogs || []);
        }
      }
    } catch (err) {
      console.error("Error fetching analyst data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const handleSelectMatch = (match: MatchScheduleItem) => {
    setSelectedMatch(match);
    setGameLogs(match.gameLogs || []);
  };

  // Handler Tambah Log Game KOF (Race to 10)
  const handleAddGameLog = async (logData: Omit<GameDetailLog, "gameNumber">) => {
    if (!selectedMatch) return;

    const scoreA = gameLogs.filter((g) => g.winnerTeamId === selectedMatch.teamAId).length + (logData.winnerTeamId === selectedMatch.teamAId ? 1 : 0);
    const scoreB = gameLogs.filter((g) => g.winnerTeamId === selectedMatch.teamBId).length + (logData.winnerTeamId === selectedMatch.teamBId ? 1 : 0);

    if (scoreA > 10 || scoreB > 10) {
      Swal.fire({ icon: "warning", title: "Match Selesai", text: "Salah satu tim sudah mencapai 10 Kemenangan!" });
      return;
    }

    const newLog: GameDetailLog = {
      ...logData,
      gameNumber: gameLogs.length + 1,
    };

    const updatedLogs = [...gameLogs, newLog];
    setGameLogs(updatedLogs);

    // Save ke Backend API
    await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_ANALYST_REPORT",
        matchId: selectedMatch.id,
        gameLogs: updatedLogs,
      }),
    });

    fetchTournamentData();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs font-bold text-primary animate-pulse">⏳ Memuat Data Analyst...</div>;
  }

  const deckBreakdown = calculateDeckBreakdown(schedules);
  const finishedMatches = schedules.filter((m) => m.isFinished);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6">
      
      {/* 📌 NAVIGATION TAB ANALYST */}
      <div className="flex w-full items-center justify-around rounded-2xl border border-border bg-card/80 p-1.5 backdrop-blur-md">
        {[
          { key: "MATCH_REPORT", label: "Match Report" },
          { key: "DECK_BREAKDOWN", label: "Deck Breakdown" },
          { key: "META_ANALYSIS", label: "Meta Analysis" },
          { key: "POWER_RANKING", label: "Power Ranking" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-wider transition ${
              activeTab === tab.key
                ? "bg-sky-600 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📝 TAB 1: MATCH REPORT (KOF FORMAT) */}
      {activeTab === "MATCH_REPORT" && (
        <div className="flex flex-col gap-6">
          {/* Selector Match */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {schedules.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectMatch(m)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold whitespace-nowrap transition ${
                  selectedMatch?.id === m.id
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>{m.teamAName}</span>
                <span className="text-[10px] text-sky-400">vs</span>
                <span>{m.teamBName}</span>
              </button>
            ))}
          </div>

          {selectedMatch && (
            <div className="flex flex-col rounded-3xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-md">
              {/* Header Match Info */}
              <div className="flex flex-col md:flex-row items-center justify-between border-b border-border pb-4 mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <img src={selectedMatch.teamALogo} alt="" className="h-12 w-12 object-contain" />
                  <div>
                    <h3 className="text-base font-extrabold">{selectedMatch.teamAName}</h3>
                    <p className="text-[10px] text-muted-foreground">Judge: {selectedMatch.referee || "TBA"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <span className="text-3xl font-black text-sky-400">{selectedMatch.scoreA}</span>
                  <span className="text-xs font-extrabold text-muted-foreground">VS</span>
                  <span className="text-3xl font-black text-sky-400">{selectedMatch.scoreB}</span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <h3 className="text-base font-extrabold">{selectedMatch.teamBName}</h3>
                    <p className="text-[10px] text-muted-foreground">Streamer: {selectedMatch.streamer || "TBA"}</p>
                  </div>
                  <img src={selectedMatch.teamBLogo} alt="" className="h-12 w-12 object-contain" />
                </div>
              </div>

              {/* Tabel Log Game KOF */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">{selectedMatch.teamAName} (Player/Deck)</th>
                      <th className="py-2 px-2 text-center">Result</th>
                      <th className="py-2 px-2 text-right">{selectedMatch.teamBName} (Player/Deck)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameLogs.map((log) => {
                      const isTeamAWin = log.winnerTeamId === selectedMatch.teamAId;
                      return (
                        <tr key={log.gameNumber} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="py-2 px-2 font-bold text-muted-foreground">{log.gameNumber}</td>
                          <td className="py-2 px-2">
                            <p className="font-bold">{log.teamAPlayerName}</p>
                            <p className="text-[10px] text-sky-400">{log.teamADeck} ({log.teamASkill})</p>
                          </td>
                          <td className="py-2 px-2 text-center font-black">
                            <span className={isTeamAWin ? "text-emerald-400" : "text-rose-500"}>
                              {isTeamAWin ? "W - L" : "L - W"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <p className="font-bold">{log.teamBPlayerName}</p>
                            <p className="text-[10px] text-sky-400">{log.teamBDeck} ({log.teamBSkill})</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Form Input Game (Khusus Admin / Analyst) */}
              {isAdmin && selectedMatch.scoreA < 10 && selectedMatch.scoreB < 10 && (
                <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-primary">➕ Input Result Game Ke-{gameLogs.length + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Pemain & Deck Tim A:</label>
                      <input id="input-pA" placeholder="Nama Pemain" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                      <input id="input-dA" placeholder="Nama Deck" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                      <input id="input-sA" placeholder="Nama Skill" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Pemain & Deck Tim B:</label>
                      <input id="input-pB" placeholder="Nama Pemain" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                      <input id="input-dB" placeholder="Nama Deck" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                      <input id="input-sB" placeholder="Nama Skill" className="w-full rounded-lg border bg-background p-1.5 mt-1" />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const pA = (document.getElementById("input-pA") as HTMLInputElement).value;
                        const dA = (document.getElementById("input-dA") as HTMLInputElement).value;
                        const sA = (document.getElementById("input-sA") as HTMLInputElement).value;
                        const pB = (document.getElementById("input-pB") as HTMLInputElement).value;
                        const dB = (document.getElementById("input-dB") as HTMLInputElement).value;
                        const sB = (document.getElementById("input-sB") as HTMLInputElement).value;

                        if (!pA || !pB || !dA || !dB) return Swal.fire({ icon: "error", title: "Incomplete Data" });

                        handleAddGameLog({
                          teamAPlayerId: pA,
                          teamAPlayerName: pA,
                          teamADeck: dA,
                          teamASkill: sA || "-",
                          teamBPlayerId: pB,
                          teamBPlayerName: pB,
                          teamBDeck: dB,
                          teamBSkill: sB || "-",
                          winnerTeamId: selectedMatch.teamAId,
                        });
                      }}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      🏆 WIN: {selectedMatch.teamAName}
                    </button>

                    <button
                      onClick={() => {
                        const pA = (document.getElementById("input-pA") as HTMLInputElement).value;
                        const dA = (document.getElementById("input-dA") as HTMLInputElement).value;
                        const sA = (document.getElementById("input-sA") as HTMLInputElement).value;
                        const pB = (document.getElementById("input-pB") as HTMLInputElement).value;
                        const dB = (document.getElementById("input-dB") as HTMLInputElement).value;
                        const sB = (document.getElementById("input-sB") as HTMLInputElement).value;

                        if (!pA || !pB || !dA || !dB) return Swal.fire({ icon: "error", title: "Incomplete Data" });

                        handleAddGameLog({
                          teamAPlayerId: pA,
                          teamAPlayerName: pA,
                          teamADeck: dA,
                          teamASkill: sA || "-",
                          teamBPlayerId: pB,
                          teamBPlayerName: pB,
                          teamBDeck: dB,
                          teamBSkill: sB || "-",
                          winnerTeamId: selectedMatch.teamBId,
                        });
                      }}
                      className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-500"
                    >
                      🏆 WIN: {selectedMatch.teamBName}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📊 TAB 2: DECK BREAKDOWN */}
      {activeTab === "DECK_BREAKDOWN" && (
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-md">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2">
            Deck Breakdown & Win Rate
          </h3>
          <div className="flex flex-col gap-3">
            {deckBreakdown.map((deck) => (
              <div key={deck.deckName} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{deck.deckName}</span>
                  <span className="text-sky-400">{deck.totalCount} Pick ({deck.winRate}% WR)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, deck.winRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚔️ TAB 3: META ANALYSIS MATRIX */}
      {activeTab === "META_ANALYSIS" && (
        <div className="rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-md">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2 mb-4">
            Head-to-Head Deck Matchup Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            Matriks interaksi Deck vs Deck terhitung otomatis berdasarkan akumulasi log game dari setiap Match Report.
          </p>
        </div>
      )}

      {/* 👑 TAB 4: POWER RANKING PLAYER */}
      {activeTab === "POWER_RANKING" && (
        <div className="rounded-3xl border border-border bg-card/80 p-6 backdrop-blur-md">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b border-border pb-2 mb-4">
            Individual Player Power Ranking
          </h3>
          <p className="text-xs text-muted-foreground">
            Peringkat performa individu pemain (P/W/L, WPM & Aggregate) dikalkulasikan otomatis dari setiap match yang dimainkan.
          </p>
        </div>
      )}

    </div>
  );
      }
