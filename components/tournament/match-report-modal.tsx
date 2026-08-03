"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";

export function MatchReportModal({
  match,
  weekNumber,
  onClose,
  onSaveMatch,
}: {
  match: MatchScheduleItem;
  weekNumber: number;
  onClose: () => void;
  onSaveMatch?: (updatedMatch: MatchScheduleItem) => Promise<void>;
}) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [gameLogs, setGameLogs] = useState<GameDetailLog[]>(match.gameLogs || []);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Lock Scroll Body saat Modal Terbuka & Deteksi Akses Admin
  useEffect(() => {
    document.body.style.overflow = "hidden";

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("admin") === "tsaqif") {
        setIsAdminMode(true);
      }
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Sync gameLogs jika props match dari KV diperbarui
  useEffect(() => {
    setGameLogs(match.gameLogs || []);
  }, [match.gameLogs]);

  // 2. Roster Pemain
  const rosterA = match.rosterA?.mainPlayers || [];
  const rosterB = match.rosterB?.mainPlayers || [];

  const playerNamesA = rosterA.map((p) => p.playerName);
  const playerNamesB = rosterB.map((p) => p.playerName);

  // 3. Skor Otomatis Berdasarkan Log
  const calculatedScoreA = gameLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
  const calculatedScoreB = gameLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

  const displayScoreA = gameLogs.length > 0 ? calculatedScoreA : match.scoreA;
  const displayScoreB = gameLogs.length > 0 ? calculatedScoreB : match.scoreB;

  const isWinA = displayScoreA > displayScoreB;
  const isWinB = displayScoreB > displayScoreA;

  // 4. Tambah Baris Pertandingan Baru
  const handleAddLogRow = () => {
    const defaultPlayerA = playerNamesA[0] || "Player A";
    const defaultPlayerB = playerNamesB[0] || "Player B";

    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      teamAPlayerId: defaultPlayerA,
      teamAPlayerName: defaultPlayerA,
      teamADeck: "Archetype A",
      teamASkill: "Skill A",
      teamBPlayerId: defaultPlayerB,
      teamBPlayerName: defaultPlayerB,
      teamBDeck: "Archetype B",
      teamBSkill: "Skill B",
      winnerTeamId: match.teamAId,
    };

    const newLogs = [...gameLogs, newLog];
    setGameLogs(newLogs);
    setEditingRowIndex(newLogs.length - 1); // Langsung edit baris baru
  };

  // 5. Update Field Log
  const handleUpdateLogField = (index: number, field: keyof GameDetailLog, value: any) => {
    const updated = [...gameLogs];
    updated[index] = { ...updated[index], [field]: value };
    setGameLogs(updated);
  };

  // 6. Toggle Centang Winner
  const handleToggleWinner = (index: number, winnerTeamId: string) => {
    const updated = [...gameLogs];
    updated[index].winnerTeamId = winnerTeamId;
    setGameLogs(updated);
  };

  // 7. Hapus Baris Log
  const handleRemoveLogRow = async (index: number) => {
    const updatedLogs = gameLogs.filter((_, i) => i !== index);
    setGameLogs(updatedLogs);
    if (editingRowIndex === index) setEditingRowIndex(null);

    // Otomatis Sync & Save ke KV saat hapus
    await saveLogsToKV(updatedLogs);
  };

  // 8. SIMPAN OTOMATIS KE KV SAAT KLIK TOMBOL DISK 💾
  const handleSaveRow = async () => {
    setEditingRowIndex(null);
    await saveLogsToKV(gameLogs);
  };

  const saveLogsToKV = async (currentLogs: GameDetailLog[]) => {
    if (!onSaveMatch) return;
    setIsSaving(true);

    const newScoreA = currentLogs.filter((g) => g.winnerTeamId === match.teamAId).length;
    const newScoreB = currentLogs.filter((g) => g.winnerTeamId === match.teamBId).length;

    const updatedMatch: MatchScheduleItem = {
      ...match,
      scoreA: newScoreA,
      scoreB: newScoreB,
      isFinished: newScoreA >= 10 || newScoreB >= 10,
      gameLogs: currentLogs,
    };

    await onSaveMatch(updatedMatch);
    setIsSaving(false);
  };

  const formattedDate = new Date(match.matchDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md">
      <div className="relative w-full max-w-6xl rounded-2xl border-2 border-[#0099ff] bg-[#0051a8] p-4 sm:p-6 text-white shadow-[0_0_60px_rgba(0,153,255,0.4)] overflow-y-auto max-h-[92vh] font-sans">
        
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-sky-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-bold z-10"
        >
          ✕
        </button>

        {/* 1. TOP INFO BAR */}
        <div className="grid grid-cols-3 items-center border-b border-[#0088ff] pb-3 text-center text-xs font-semibold text-sky-100">
          <div>
            <div className="font-extrabold text-white text-sm">{match.streamer || "Alroy_Yuan"}</div>
            <a
              href={match.streamLink || "https://youtube.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-sky-200 opacity-90 hover:text-amber-300 underline transition truncate block max-w-[180px] mx-auto"
            >
              {match.streamLink ? match.streamLink.replace(/^https?:\/\//, "") : "youtube.com"}
            </a>
          </div>

          <div>
            <div className="text-[10px] uppercase text-sky-200 tracking-wider">REFEREE</div>
            <div className="font-extrabold text-white text-sm">{match.referee || "vG®D WHY"}</div>
          </div>

          <div>
            <div className="font-extrabold text-white text-sm">Season 16 Week {weekNumber}</div>
            <div className="text-[10px] text-sky-200 opacity-90">
              {formattedDate} • 20.00 WIB
            </div>
          </div>
        </div>

        {/* TITLE */}
        <h2 className="my-3 text-center text-xl sm:text-2xl font-black tracking-widest text-[#ff9900] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          MATCH REPORT {isSaving && <span className="text-xs text-emerald-400 font-bold ml-2 animate-pulse">(Saving...)</span>}
        </h2>

        {/* 2. MATCHUP HEADER */}
        <div className="grid grid-cols-3 items-center bg-[#003c80] p-3 sm:p-4 rounded-t-xl border-t border-x border-[#0088ff]">
          <div className="flex items-center gap-3">
            <img
              src={match.teamALogo || "/logo.webp"}
              alt=""
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain drop-shadow"
            />
            <h3 className="text-base sm:text-xl font-black text-white">{match.teamAName}</h3>
          </div>

          <div className="flex justify-center">
            <img
              src="https://www.teamwars.web.id/logo-dc.png"
              alt="Team Wars Indonesia"
              className="h-10 sm:h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,153,255,0.6)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 text-right">
            <h3 className="text-base sm:text-xl font-black text-white">{match.teamBName}</h3>
            <img
              src={match.teamBLogo || "/logo.webp"}
              alt=""
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain drop-shadow"
            />
          </div>
        </div>

        {/* 3. ROSTER SECTION */}
        <div className="bg-[#002b5e] border-x border-[#0088ff] text-[11px]">
          <div className="bg-[#00224a] py-1 text-center text-[10px] font-bold text-sky-300 uppercase tracking-wider border-y border-[#0088ff]">
            ROSTER
          </div>
          <div className="grid grid-cols-2 p-3 gap-4">
            <div className="flex flex-wrap justify-center gap-1.5">
              {playerNamesA.length > 0 ? (
                playerNamesA.map((pName, i) => (
                  <span key={i} className="rounded-md border border-[#0077e6] bg-[#003875] px-2.5 py-1 text-[11px] font-bold text-sky-100 shadow-sm">
                    {pName}
                  </span>
                ))
              ) : (
                <span className="text-sky-300 italic">Main Players</span>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {playerNamesB.length > 0 ? (
                playerNamesB.map((pName, i) => (
                  <span key={i} className="rounded-md border border-[#0077e6] bg-[#003875] px-2.5 py-1 text-[11px] font-bold text-sky-100 shadow-sm">
                    {pName}
                  </span>
                ))
              ) : (
                <span className="text-sky-300 italic">Main Players</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. GAME LOGS TABLE */}
        <div className="overflow-x-auto border-x border-[#0088ff] bg-[#00448e]">
          <table className="w-full text-center text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#002b5e] text-[11px] font-bold text-sky-200 border-y border-[#0088ff]">
                <th className="py-2 px-2 w-12">
                  {isAdminMode && (
                    <button
                      onClick={handleAddLogRow}
                      title="Tambah Baris Game Log"
                      className="rounded bg-emerald-600 px-2 py-0.5 text-white hover:bg-emerald-500 cursor-pointer font-bold text-xs"
                    >
                      + Log
                    </button>
                  )}
                </th>
                <th className="py-2 px-2">Player</th>
                <th className="py-2 px-2">Skill</th>
                <th className="py-2 px-2">Archetype</th>
                <th className="py-2 px-3 text-[#00ffcc]">Gauntlet</th>
                <th className="py-2 px-2">Archetype</th>
                <th className="py-2 px-2">Skill</th>
                <th className="py-2 px-2">Player</th>
                <th className="py-2 px-2 w-12">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#005bb8]">
              {gameLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs font-semibold text-sky-200/70 italic">
                    Belum ada log pertandingan. {isAdminMode ? "Klik tombol '+ Log' untuk mulai menginput." : ""}
                  </td>
                </tr>
              ) : (
                gameLogs.map((log, idx) => {
                  const isEditingThisRow = editingRowIndex === idx;
                  const isAWin = log.winnerTeamId === match.teamAId;

                  return (
                    <tr key={idx} className="hover:bg-[#004d9e] transition font-medium text-[11px]">
                      {/* IKON EDIT (✏️) BERUBAH JADI SIMPAN (💾) */}
                      <td className="py-1.5 px-1">
                        {isAdminMode && (
                          isEditingThisRow ? (
                            <button
                              onClick={handleSaveRow}
                              disabled={isSaving}
                              className="p-1 rounded bg-emerald-500 text-white font-bold cursor-pointer hover:bg-emerald-400 transition"
                              title="Simpan Baris Ini ke KV"
                            >
                              💾
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingRowIndex(idx)}
                              className="p-1 rounded text-sky-300 hover:text-white font-bold cursor-pointer transition"
                              title="Edit Baris Ini"
                            >
                              ✏️
                            </button>
                          )
                        )}
                      </td>

                      {/* TEAM A PLAYER */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <select
                            value={log.teamAPlayerName}
                            onChange={(e) => {
                              handleUpdateLogField(idx, "teamAPlayerName", e.target.value);
                              handleUpdateLogField(idx, "teamAPlayerId", e.target.value);
                            }}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white font-bold"
                          >
                            {playerNamesA.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-white font-semibold">{log.teamAPlayerName}</span>
                        )}
                      </td>

                      {/* TEAM A SKILL */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={log.teamASkill}
                            onChange={(e) => handleUpdateLogField(idx, "teamASkill", e.target.value)}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white text-center"
                          />
                        ) : (
                          <span className="text-sky-100">{log.teamASkill}</span>
                        )}
                      </td>

                      {/* TEAM A DECK */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={log.teamADeck}
                            onChange={(e) => handleUpdateLogField(idx, "teamADeck", e.target.value)}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white text-center"
                          />
                        ) : (
                          <span className="text-sky-100">{log.teamADeck}</span>
                        )}
                      </td>

                      {/* GAUNTLET W / L */}
                      <td className="py-1.5 px-3 font-extrabold text-sm whitespace-nowrap">
                        {isEditingThisRow ? (
                          <div className="flex items-center justify-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAWin}
                                onChange={() => handleToggleWinner(idx, match.teamAId)}
                                className="accent-emerald-400 h-4 w-4"
                              />
                              <span className={isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>W</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!isAWin}
                                onChange={() => handleToggleWinner(idx, match.teamBId)}
                                className="accent-rose-500 h-4 w-4"
                              />
                              <span className={!isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>L</span>
                            </label>
                          </div>
                        ) : (
                          <>
                            <span className={isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                              {isAWin ? "W" : "L"}
                            </span>
                            <span className="mx-2 text-sky-300 font-normal"> </span>
                            <span className={!isAWin ? "text-[#00ff66]" : "text-[#ff3333]"}>
                              {!isAWin ? "W" : "L"}
                            </span>
                          </>
                        )}
                      </td>

                      {/* TEAM B DECK */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={log.teamBDeck}
                            onChange={(e) => handleUpdateLogField(idx, "teamBDeck", e.target.value)}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white text-center"
                          />
                        ) : (
                          <span className="text-sky-100">{log.teamBDeck}</span>
                        )}
                      </td>

                      {/* TEAM B SKILL */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <input
                            type="text"
                            value={log.teamBSkill}
                            onChange={(e) => handleUpdateLogField(idx, "teamBSkill", e.target.value)}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white text-center"
                          />
                        ) : (
                          <span className="text-sky-100">{log.teamBSkill}</span>
                        )}
                      </td>

                      {/* TEAM B PLAYER */}
                      <td className="py-1.5 px-2">
                        {isEditingThisRow ? (
                          <select
                            value={log.teamBPlayerName}
                            onChange={(e) => {
                              handleUpdateLogField(idx, "teamBPlayerName", e.target.value);
                              handleUpdateLogField(idx, "teamBPlayerId", e.target.value);
                            }}
                            className="w-full rounded bg-[#002b5e] border border-sky-400 px-1 py-0.5 text-white font-bold"
                          >
                            {playerNamesB.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-white font-semibold">{log.teamBPlayerName}</span>
                        )}
                      </td>

                      {/* AKSI HAPUS SISI KANAN */}
                      <td className="py-1.5 px-1">
                        {isAdminMode && (
                          <button
                            onClick={() => handleRemoveLogRow(idx)}
                            className="text-rose-400 hover:text-rose-200 font-bold px-1.5 cursor-pointer"
                            title="Hapus Baris Ini"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER RESULT SCORE */}
        <div className="grid grid-cols-12 items-center rounded-b-xl border border-[#0088ff] bg-[#00336e] p-3 text-center">
          <div className="col-span-2 text-3xl font-black text-[#00ff66]">
            {isWinA ? "W" : "L"}
          </div>

          <div className="col-span-8 flex items-center justify-center gap-3 sm:gap-6 text-[#ff9900]">
            <span className="text-sm sm:text-lg font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {match.teamAName}
            </span>
            <span className="text-2xl sm:text-4xl font-black shrink-0">
              {displayScoreA} - {displayScoreB}
            </span>
            <span className="text-sm sm:text-lg font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {match.teamBName}
            </span>
          </div>

          <div className="col-span-2 text-3xl font-black text-[#ff3333]">
            {isWinB ? "W" : "L"}
          </div>
        </div>

      </div>
    </div>
  );
}