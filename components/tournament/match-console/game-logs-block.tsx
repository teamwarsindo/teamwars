"use client";

import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  scoreA,
  scoreB,
  isReachMaxScore,
  activeListA,
  activeListB,
  onSave,
}: {
  match: MatchScheduleItem | null;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  scoreA: number;
  scoreB: number;
  isReachMaxScore: boolean;
  activeListA: string[];
  activeListB: string[];
  onSave: () => void;
}) {
  const handleAddGame = () => {
    if (isReachMaxScore) return;
    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      teamAPlayerId: activeListA[0],
      teamAPlayerName: activeListA[0],
      teamADeck: "Archetype A",
      teamASkill: "Skill A",
      teamBPlayerId: activeListB[0],
      teamBPlayerName: activeListB[0],
      teamBDeck: "Archetype B",
      teamBSkill: "Skill B",
      winnerTeamId: match?.teamAId || "",
    };
    setGameLogs([...gameLogs, newLog]);
  };

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-[#001738] p-4 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">
            3. Game Logs Pertandingan
          </h3>
          <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-400 border border-amber-500/40">
            Skor: {scoreA} - {scoreB}
          </span>
        </div>

        <button
          onClick={handleAddGame}
          disabled={isReachMaxScore}
          className={`rounded-xl px-3 py-1.5 text-xs font-black text-white transition ${
            isReachMaxScore
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-md"
          }`}
        >
          + Tambah Game Log
        </button>
      </div>

      {gameLogs.length === 0 ? (
        <div className="text-center py-8 text-xs text-sky-300/60 italic">
          Belum ada log game. Gunakan Smart Paste di atas atau klik '+ Tambah Game Log'.
        </div>
      ) : (
        <div className="space-y-3">
          {gameLogs.map((log, idx) => {
            const isAWin = log.winnerTeamId === match?.teamAId;

            return (
              <div key={idx} className="rounded-xl border border-sky-500/20 bg-[#000d21] p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-sky-500/15 pb-1.5">
                  <span className="font-black text-amber-400">GAME #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onSave}
                      className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                    >
                      💾 Save Game #{idx + 1}
                    </button>
                    <button
                      onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-200 font-bold text-xs cursor-pointer ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center text-[11px]">
                  {/* TEAM A */}
                  <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                    <input
                      type="text"
                      value={log.teamAPlayerName}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamAPlayerName = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Player A"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-white font-bold"
                    />
                    <input
                      type="text"
                      value={log.teamASkill}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamASkill = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Skill A"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-sky-100"
                    />
                    <input
                      type="text"
                      value={log.teamADeck}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamADeck = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Deck A"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-sky-100"
                    />
                  </div>

                  {/* TOGGLE WINNER */}
                  <div className="sm:col-span-1 flex items-center justify-center gap-2 font-black py-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...gameLogs];
                        updated[idx].winnerTeamId = match?.teamAId || "";
                        setGameLogs(updated);
                      }}
                      className={`px-2 py-0.5 rounded border ${
                        isAWin
                          ? "bg-emerald-500/20 text-[#00ff66] border-emerald-500"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      W
                    </button>
                    <span className="text-sky-300">-</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...gameLogs];
                        updated[idx].winnerTeamId = match?.teamBId || "";
                        setGameLogs(updated);
                      }}
                      className={`px-2 py-0.5 rounded border ${
                        !isAWin
                          ? "bg-emerald-500/20 text-[#00ff66] border-emerald-500"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      W
                    </button>
                  </div>

                  {/* TEAM B */}
                  <div className="sm:col-span-3 grid grid-cols-3 gap-1">
                    <input
                      type="text"
                      value={log.teamBDeck}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamBDeck = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Deck B"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-sky-100"
                    />
                    <input
                      type="text"
                      value={log.teamBSkill}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamBSkill = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Skill B"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-sky-100"
                    />
                    <input
                      type="text"
                      value={log.teamBPlayerName}
                      onChange={(e) => {
                        const updated = [...gameLogs];
                        updated[idx].teamBPlayerName = e.target.value;
                        setGameLogs(updated);
                      }}
                      placeholder="Player B"
                      className="rounded-lg bg-[#001738] border border-sky-500/30 p-1.5 text-white font-bold"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
