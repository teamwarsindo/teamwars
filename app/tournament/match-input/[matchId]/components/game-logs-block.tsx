"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { PlayerDeckInfo } from "./roster-lineup-block";
import { CustomSelect } from "./custom-select";
import { RotateCcw } from "lucide-react";
import Swal from "sweetalert2";

interface GameLogsBlockProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  lineupA: PlayerDeckInfo[];
  lineupB: PlayerDeckInfo[];
  masterDecks: string[];
  masterSkills: string[];
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => Promise<void>;
}

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  lineupA,
  lineupB,
  masterDecks,
  masterSkills,
  onAddMasterItem,
}: GameLogsBlockProps) {
  const [playerA, setPlayerA] = useState("");
  const [deckA, setDeckA] = useState("");
  const [skillA, setSkillA] = useState("");

  const [playerB, setPlayerB] = useState("");
  const [deckB, setDeckB] = useState("");
  const [skillB, setSkillB] = useState("");

  // Result Selection: "A" | "B" | "DRAW" (Technical Loss Kedua Pihak)
  const [gameResult, setGameResult] = useState<"A" | "B" | "DRAW">("A");

  // Counter Repeat per Tim (Max 2)
  const repeatCountA = gameLogs.filter((g) => (g as any).isRepeatA).length;
  const repeatCountB = gameLogs.filter((g) => (g as any).isRepeatB).length;

  const [isRepeatA, setIsRepeatA] = useState(false);
  const [isRepeatB, setIsRepeatB] = useState(false);

  // 🟢 AUTO-FILL PEMAIN MENANG DARI GAME SEBELUMNYA
  useEffect(() => {
    if (gameLogs.length === 0) return;
    const lastGame = gameLogs[gameLogs.length - 1];

    if (lastGame.winnerTeamId === match.teamAId) {
      setPlayerA(lastGame.playerAName);
      setDeckA(lastGame.deckA);
      setSkillA(lastGame.skillA);
    } else if (lastGame.winnerTeamId === match.teamBId) {
      setPlayerB(lastGame.playerBName);
      setDeckB(lastGame.deckB);
      setSkillB(lastGame.skillB);
    }
  }, [gameLogs, match.teamAId, match.teamBId]);

  // 🟢 AUTO-FILL DECK & SKILL SAAT PEMAIN DIPILIH
  useEffect(() => {
    if (!playerA) return;
    const p = lineupA.find((x) => x.playerName === playerA);
    if (p) {
      // Cek apakah Deck 1 sudah pernah dipakai & kalah
      const usedDeck1 = gameLogs.some(
        (g) => g.playerAName === playerA && g.deckA === p.deck1 && g.winnerTeamId !== match.teamAId
      );
      if (usedDeck1 && !isRepeatA) {
        setDeckA(p.deck2 || p.deck1);
        setSkillA(p.skill2 || p.skill1);
      } else {
        setDeckA(p.deck1);
        setSkillA(p.skill1);
      }
    }
  }, [playerA, lineupA, gameLogs, match.teamAId, isRepeatA]);

  useEffect(() => {
    if (!playerB) return;
    const p = lineupB.find((x) => x.playerName === playerB);
    if (p) {
      const usedDeck1 = gameLogs.some(
        (g) => g.playerBName === playerB && g.deckB === p.deck1 && g.winnerTeamId !== match.teamBId
      );
      if (usedDeck1 && !isRepeatB) {
        setDeckB(p.deck2 || p.deck1);
        setSkillB(p.skill2 || p.skill1);
      } else {
        setDeckB(p.deck1);
        setSkillB(p.skill1);
      }
    }
  }, [playerB, lineupB, gameLogs, match.teamBId, isRepeatB]);

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
    if (!playerA || !playerB) {
      Swal.fire("Peringatan", "Pemain A dan Pemain B wajib dipilih!", "warning");
      return;
    }

    const winnerTeamId =
      gameResult === "A" ? match.teamAId : gameResult === "B" ? match.teamBId : "DRAW_TECH_LOSS";

    const newLog: GameDetailLog & { isRepeatA?: boolean; isRepeatB?: boolean } = {
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
      isRepeatA,
      isRepeatB,
    };

    setGameLogs([...gameLogs, newLog]);

    // Reset State
    setPlayerA("");
    setDeckA("");
    setSkillA("");
    setPlayerB("");
    setDeckB("");
    setSkillB("");
    setGameResult("A");
    setIsRepeatA(false);
    setIsRepeatB(false);
  };

  const optionsA = lineupA.map((p) => p.playerName);
  const optionsB = lineupB.map((p) => p.playerName);

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold text-foreground">3. Form Input Log Per-Game (Conquest Mode)</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* SIDE TIM A */}
        <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/30">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-primary uppercase text-[11px]">{match.teamAName}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Repeat Digunakan: {repeatCountA}/2</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Pemain Tim A</label>
            <CustomSelect
              value={playerA}
              onChange={setPlayerA}
              options={optionsA}
              placeholder={optionsA.length === 0 ? "-- Pilih Lineup Section 2 Dulu --" : "-- Pilih Pemain Lineup --"}
              disabled={optionsA.length === 0}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-background p-2 rounded-lg border border-border/40">
            <div>
              <span className="block text-[9px] font-bold text-muted-foreground">DECK IN-GAME</span>
              <span className="font-extrabold text-foreground text-xs">{deckA || "-"}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-muted-foreground">SKILL</span>
              <span className="font-extrabold text-foreground text-xs">{skillA || "-"}</span>
            </div>
          </div>

          {/* TOMBOL REPEAT TIM A */}
          <button
            type="button"
            disabled={repeatCountA >= 2}
            onClick={() => setIsRepeatA(!isRepeatA)}
            className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
              isRepeatA
                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-extrabold"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>{isRepeatA ? "⚡ REPEAT AKTIF (Deck 2 Hangus)" : "Gunakan REPEAT (Maks 2x)"}</span>
          </button>
        </div>

        {/* SIDE TIM B */}
        <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/30">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-rose-500 uppercase text-[11px]">{match.teamBName}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Repeat Digunakan: {repeatCountB}/2</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1">Pemain Tim B</label>
            <CustomSelect
              value={playerB}
              onChange={setPlayerB}
              options={optionsB}
              placeholder={optionsB.length === 0 ? "-- Pilih Lineup Section 2 Dulu --" : "-- Pilih Pemain Lineup --"}
              disabled={optionsB.length === 0}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-background p-2 rounded-lg border border-border/40">
            <div>
              <span className="block text-[9px] font-bold text-muted-foreground">DECK IN-GAME</span>
              <span className="font-extrabold text-foreground text-xs">{deckB || "-"}</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-muted-foreground">SKILL</span>
              <span className="font-extrabold text-foreground text-xs">{skillB || "-"}</span>
            </div>
          </div>

          {/* TOMBOL REPEAT TIM B */}
          <button
            type="button"
            disabled={repeatCountB >= 2}
            onClick={() => setIsRepeatB(!isRepeatB)}
            className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
              isRepeatB
                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-extrabold"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>{isRepeatB ? "⚡ REPEAT AKTIF (Deck 2 Hangus)" : "Gunakan REPEAT (Maks 2x)"}</span>
          </button>
        </div>
      </div>

      {/* HASIL GAME & DOUBLE LOSS / TECH LOSS SELECTOR */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-muted-foreground uppercase">
          HASIL / PEMENANG GAME #{gameLogs.length + 1}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setGameResult("A")}
            className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
              gameResult === "A"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 border-border text-foreground hover:bg-muted"
            }`}
          >
            🏆 WIN: {match.teamAName}
          </button>
          <button
            type="button"
            onClick={() => setGameResult("B")}
            className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
              gameResult === "B"
                ? "bg-rose-600 text-white border-rose-500"
                : "bg-muted/30 border-border text-foreground hover:bg-muted"
            }`}
          >
            🏆 WIN: {match.teamBName}
          </button>
          <button
            type="button"
            onClick={() => setGameResult("DRAW")}
            className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
              gameResult === "DRAW"
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-muted/30 border-border text-foreground hover:bg-muted"
            }`}
          >
            ⚠️ DOUBLE LOSS / DRAW
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddSingleGame}
        className="w-full py-3 rounded-xl bg-primary font-bold text-xs text-primary-foreground shadow-md hover:bg-primary/90 transition cursor-pointer"
      >
        ➕ Simpan Log Game #{gameLogs.length + 1}
      </button>

      {/* TABEL LOG GAME */}
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
                  <th className="p-2.5 text-center">Hasil Game</th>
                  <th className="p-2.5">Deck / Skill B</th>
                  <th className="p-2.5">Pemain B</th>
                  <th className="p-2.5 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium text-[11px]">
                {gameLogs.map((log, idx) => {
                  const isAWin = log.winnerTeamId === match.teamAId;
                  const isDraw = log.winnerTeamId === "DRAW_TECH_LOSS";

                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition">
                      <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-foreground">{log.playerAName}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {log.deckA} <span className="text-[9px]">({log.skillA})</span>
                      </td>
                      <td className="p-2.5 text-center font-extrabold">
                        {isDraw ? (
                          <span className="text-amber-500 font-bold">DOUBLE LOSS</span>
                        ) : (
                          <span className={isAWin ? "text-primary" : "text-rose-500"}>
                            {isAWin ? match.teamAName : match.teamBName}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {log.deckB} <span className="text-[9px]">({log.skillB})</span>
                      </td>
                      <td className="p-2.5 font-bold text-foreground">{log.playerBName}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setGameLogs(gameLogs.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-400 font-bold text-xs cursor-pointer"
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
    
