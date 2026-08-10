"use client";

import { useState } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import Swal from "sweetalert2";

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  activeListA,
  activeListB,
  masterDecks,
  masterSkills,
  onAddMasterItem,
}: {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  activeListA: string[];
  activeListB: string[];
  masterDecks: string[];
  masterSkills: string[];
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => Promise<void>;
}) {
  // State Form Input Log Baru
  const [playerA, setPlayerA] = useState("");
  const [deckA, setDeckA] = useState("");
  const [skillA, setSkillA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [deckB, setDeckB] = useState("");
  const [skillB, setSkillB] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState("");

  const inputBase =
    "w-full rounded-lg border border-border bg-background/60 p-2 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

  const handlePromptAddMaster = async (type: "DECK" | "SKILL") => {
    const { value: text } = await Swal.fire({
      title: `Tambah Master ${type === "DECK" ? "Deck Archetype" : "Skill"} Baru`,
      input: "text",
      inputPlaceholder: `Masukkan nama ${type === "DECK" ? "Deck" : "Skill"}...`,
      showCancelButton: true,
      confirmButtonText: "Simpan Ke KV",
      confirmButtonColor: "#9333ea",
    });

    if (text) {
      await onAddMasterItem(type, text);
    }
  };

  const handleAddSingleGame = () => {
    if (!playerA || !playerB || !winnerTeamId) {
      Swal.fire("Peringatan", "Pemain A, Pemain B, dan Pemenang Game wajib diisi!", "warning");
      return;
    }

    const newLog: GameDetailLog = {
      gameNumber: gameLogs.length + 1,
      playerAId: playerA,
      playerAName: playerA,
      deckA: deckA || "-",
      skillA: skillA || "-",
      playerBId: playerB,
      playerBName: playerB,
      deckB: deckB || "-",
      skillB: skillB || "-",
      winnerTeamId,
    };

    setGameLogs([...gameLogs, newLog]);

    // Reset Input
    setPlayerA("");
    setDeckA("");
    setSkillA("");
    setPlayerB("");
    setDeckB("");
    setSkillB("");
    setWinnerTeamId("");
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold text-foreground">3. Form Input Log Per-Game</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePromptAddMaster("DECK")}
            className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition cursor-pointer"
          >
            + Master Deck
          </button>
          <button
            type="button"
            onClick={() => handlePromptAddMaster("SKILL")}
            className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition cursor-pointer"
          >
            + Master Skill
          </button>
        </div>
      </div>

      {/* INPUT FORM ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* SIDE TIM A */}
        <div className="space-y-2.5 p-3 bg-muted/20 rounded-xl border border-border/30">
          <p className="font-extrabold text-primary uppercase text-[11px]">{match.teamAName}</p>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Pemain Tim A</label>
            <select value={playerA} onChange={(e) => setPlayerA(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Pemain Lineup --</option>
              {activeListA.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Deck Archetype</label>
            <select value={deckA} onChange={(e) => setDeckA(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Master Deck KV --</option>
              {masterDecks.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Skill</label>
            <select value={skillA} onChange={(e) => setSkillA(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Master Skill KV --</option>
              {masterSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SIDE TIM B */}
        <div className="space-y-2.5 p-3 bg-muted/20 rounded-xl border border-border/30">
          <p className="font-extrabold text-rose-500 uppercase text-[11px]">{match.teamBName}</p>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Pemain Tim B</label>
            <select value={playerB} onChange={(e) => setPlayerB(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Pemain Lineup --</option>
              {activeListB.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Deck Archetype</label>
            <select value={deckB} onChange={(e) => setDeckB(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Master Deck KV --</option>
              {masterDecks.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Skill</label>
            <select value={skillB} onChange={(e) => setSkillB(e.target.value)} className={inputBase}>
              <option value="">-- Pilih Master Skill KV --</option>
              {masterSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* WINNER SELECTOR */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-muted-foreground uppercase">
          PEMENANG GAME #{gameLogs.length + 1}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setWinnerTeamId(match.teamAId)}
            className={`py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
              winnerTeamId === match.teamAId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 border-border text-foreground hover:bg-muted"
            }`}
          >
            🏆 WINNER: {match.teamAName}
          </button>
          <button
            type="button"
            onClick={() => setWinnerTeamId(match.teamBId)}
            className={`py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
              winnerTeamId === match.teamBId
                ? "bg-rose-600 text-white border-rose-500"
                : "bg-muted/30 border-border text-foreground hover:bg-muted"
            }`}
          >
            🏆 WINNER: {match.teamBName}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddSingleGame}
        className="w-full py-3 rounded-xl bg-primary font-bold text-xs text-primary-foreground shadow-md hover:bg-primary/90 transition cursor-pointer"
      >
        ➕ Tambahkan Game #{gameLogs.length + 1}
      </button>

      {/* LOG TABLE PREVIEW */}
      {gameLogs.length > 0 && (
        <div className="pt-3 border-t border-border/40 space-y-2">
          <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            📋 Tabel Log Game ({gameLogs.length} Game Tercatat)
          </h4>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Pemain A</th>
                  <th className="p-2.5">Deck / Skill A</th>
                  <th className="p-2.5 text-center">Pemenang</th>
                  <th className="p-2.5">Deck / Skill B</th>
                  <th className="p-2.5">Pemain B</th>
                  <th className="p-2.5 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium text-[11px]">
                {gameLogs.map((log, idx) => {
                  const isAWin = log.winnerTeamId === match.teamAId;
                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-foreground">{log.playerAName}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {log.deckA} <span className="text-[9px]">({log.skillA})</span>
                      </td>
                      <td className="p-2.5 text-center font-extrabold">
                        <span className={isAWin ? "text-primary" : "text-rose-500"}>
                          {isAWin ? match.teamAName : match.teamBName}
                        </span>
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {log.deckB} <span className="text-[9px]">({log.skillB})</span>
                      </td>
                      <td className="p-2.5 font-bold text-foreground">{log.playerBName}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-400 font-bold text-xs"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}