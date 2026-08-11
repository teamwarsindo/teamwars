"use client";

import { useState, useEffect } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { PlayerDeckInfo } from "./roster-lineup-block";
import { CustomSelect } from "./custom-select";
import { RotateCcw, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";

interface GameLogsBlockProps {
  match: MatchScheduleItem;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
  lineupA: PlayerDeckInfo[];
  lineupB: PlayerDeckInfo[];
}

export function GameLogsBlock({
  match,
  gameLogs,
  setGameLogs,
  lineupA,
  lineupB,
}: GameLogsBlockProps) {
  const [playerA, setPlayerA] = useState("");
  const [selectedDeckSlotA, setSelectedDeckSlotA] = useState<"deck1" | "deck2">("deck1");
  const [deckA, setDeckA] = useState("");
  const [skillA, setSkillA] = useState("");

  const [playerB, setPlayerB] = useState("");
  const [selectedDeckSlotB, setSelectedDeckSlotB] = useState<"deck1" | "deck2">("deck1");
  const [deckB, setDeckB] = useState("");
  const [skillB, setSkillB] = useState("");

  // Pemenang Game: "A" | "B" | "DRAW" | ""
  const [gameResult, setGameResult] = useState<"A" | "B" | "DRAW" | "">("");

  const [isRepeatA, setIsRepeatA] = useState(false);
  const [isRepeatB, setIsRepeatB] = useState(false);

  // Counter Hitung Repeat Digunakan
  const repeatCountA = gameLogs.filter((g) => (g as any).isRepeatA).length;
  const repeatCountB = gameLogs.filter((g) => (g as any).isRepeatB).length;

  // 🟢 CEK apakah pemain A/B berhak mendapatkan REPEAT
  const canRepeatA = (() => {
    if (!playerA || repeatCountA >= 2) return false;
    const playerGames = gameLogs.filter((g) => g.playerAName === playerA);
    const hasWonAny = playerGames.some((g) => g.winnerTeamId === match.teamAId);
    if (hasWonAny) return false; // Pernah menang -> Tidak bisa repeat
    const hasLostOnce = playerGames.some((g) => g.winnerTeamId !== match.teamAId);
    return hasLostOnce && playerGames.length === 1; // Baru 1x main & kalah
  })();

  const canRepeatB = (() => {
    if (!playerB || repeatCountB >= 2) return false;
    const playerGames = gameLogs.filter((g) => g.playerBName === playerB);
    const hasWonAny = playerGames.some((g) => g.winnerTeamId === match.teamBId);
    if (hasWonAny) return false;
    const hasLostOnce = playerGames.some((g) => g.winnerTeamId !== match.teamBId);
    return hasLostOnce && playerGames.length === 1;
  })();

  // 🟢 AUTO FILL PEMAIN MENANG DARI GAME SEBELUMNYA & RESET PEMAIN KALAH
  useEffect(() => {
    if (gameLogs.length === 0) return;
    const lastGame = gameLogs[gameLogs.length - 1];

    if (lastGame.winnerTeamId === match.teamAId) {
      setPlayerA(lastGame.playerAName);
      setPlayerB(""); // Reset Tim B yang kalah
    } else if (lastGame.winnerTeamId === match.teamBId) {
      setPlayerB(lastGame.playerBName);
      setPlayerA(""); // Reset Tim A yang kalah
    } else {
      // Double Loss -> Reset Kedua Pihak
      setPlayerA("");
      setPlayerB("");
    }
  }, [gameLogs, match.teamAId, match.teamBId]);

  // 🟢 SINKRONISASI DECK KETIKA PEMAIN & SLOT DECK DIPILIH (TIM A)
  useEffect(() => {
    if (!playerA) {
      setDeckA("");
      setSkillA("");
      return;
    }
    const p = lineupA.find((x) => x.playerName === playerA);
    if (p) {
      if (selectedDeckSlotA === "deck1") {
        setDeckA(p.deck1);
        setSkillA(p.skill1);
      } else {
        setDeckA(p.deck2);
        setSkillA(p.skill2);
      }
    }
  }, [playerA, selectedDeckSlotA, lineupA]);

  // 🟢 SINKRONISASI DECK KETIKA PEMAIN & SLOT DECK DIPILIH (TIM B)
  useEffect(() => {
    if (!playerB) {
      setDeckB("");
      setSkillB("");
      return;
    }
    const p = lineupB.find((x) => x.playerName === playerB);
    if (p) {
      if (selectedDeckSlotB === "deck1") {
        setDeckB(p.deck1);
        setSkillB(p.skill1);
      } else {
        setDeckB(p.deck2);
        setSkillB(p.skill2);
      }
    }
  }, [playerB, selectedDeckSlotB, lineupB]);

  const handleAddSingleGame = () => {
    if (!playerA || !playerB || !gameResult) return;

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

    // Reset Pilihan Kemenangan
    setGameResult("");
    setIsRepeatA(false);
    setIsRepeatB(false);
  };

  const isFormReady = Boolean(playerA && playerB && deckA && deckB);
  const isWinnerSelected = Boolean(gameResult !== "");

  const optionsA = lineupA.map((p) => p.playerName);
  const optionsB = lineupB.map((p) => p.playerName);

  const activePlayerObjA = lineupA.find((p) => p.playerName === playerA);
  const activePlayerObjB = lineupB.find((p) => p.playerName === playerB);

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          3. Form Input Log Game #{gameLogs.length + 1}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* SIDE TIM A */}
        <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/30">
          <div className="flex items-center justify-between pb-1 border-b border-border/20">
            <div className="flex items-center gap-1.5 font-black text-primary uppercase text-xs">
              <img src={match.teamALogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain" />
              <span>{match.teamAName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-bold">Repeat: {repeatCountA}/2</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">
              Pemain Bertanding
            </label>
            <CustomSelect
              value={playerA}
              onChange={setPlayerA}
              options={optionsA}
              placeholder={optionsA.length === 0 ? "-- Register Lineup Dulu --" : "-- Pilih Pemain --"}
              disabled={optionsA.length === 0}
            />
          </div>

          {/* PILIHAN DECK 1 ATAU DECK 2 UNTUK EQUINOX DKK */}
          {activePlayerObjA && (
            <div className="space-y-1.5 p-2.5 bg-background rounded-xl border border-border/50">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                Pilih Deck Digunakan
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDeckSlotA("deck1")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    selectedDeckSlotA === "deck1"
                      ? "bg-primary/15 border-primary text-primary font-bold"
                      : "bg-muted/30 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block text-[9px] opacity-70">DECK 1</span>
                  <span className="block truncate font-extrabold text-[11px]">
                    {activePlayerObjA.deck1 || "-"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDeckSlotA("deck2")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    selectedDeckSlotA === "deck2"
                      ? "bg-primary/15 border-primary text-primary font-bold"
                      : "bg-muted/30 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block text-[9px] opacity-70">DECK 2</span>
                  <span className="block truncate font-extrabold text-[11px]">
                    {activePlayerObjA.deck2 || "-"}
                  </span>
                </button>
              </div>

              <div className="pt-1 text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Skill Active:</span>
                <span className="font-bold text-foreground">{skillA || "-"}</span>
              </div>
            </div>
          )}

          {/* TOMBOL REPEAT TIM A */}
          <button
            type="button"
            disabled={!canRepeatA}
            onClick={() => setIsRepeatA(!isRepeatA)}
            className={`w-full py-2 px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isRepeatA
                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-extrabold"
                : canRepeatA
                ? "bg-background border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>
              {isRepeatA
                ? "⚡ REPEAT AKTIF (Deck 2 Hangus)"
                : canRepeatA
                ? "Gunakan REPEAT"
                : "REPEAT (Belum Memenuhi Syarat)"}
            </span>
          </button>
        </div>

        {/* SIDE TIM B */}
        <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/30">
          <div className="flex items-center justify-between pb-1 border-b border-border/20">
            <div className="flex items-center gap-1.5 font-black text-rose-500 uppercase text-xs">
              <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain" />
              <span>{match.teamBName}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-bold">Repeat: {repeatCountB}/2</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">
              Pemain Bertanding
            </label>
            <CustomSelect
              value={playerB}
              onChange={setPlayerB}
              options={optionsB}
              placeholder={optionsB.length === 0 ? "-- Register Lineup Dulu --" : "-- Pilih Pemain --"}
              disabled={optionsB.length === 0}
            />
          </div>

          {/* PILIHAN DECK 1 ATAU DECK 2 TIM B */}
          {activePlayerObjB && (
            <div className="space-y-1.5 p-2.5 bg-background rounded-xl border border-border/50">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                Pilih Deck Digunakan
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDeckSlotB("deck1")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    selectedDeckSlotB === "deck1"
                      ? "bg-rose-500/15 border-rose-500 text-rose-500 font-bold"
                      : "bg-muted/30 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block text-[9px] opacity-70">DECK 1</span>
                  <span className="block truncate font-extrabold text-[11px]">
                    {activePlayerObjB.deck1 || "-"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDeckSlotB("deck2")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    selectedDeckSlotB === "deck2"
                      ? "bg-rose-500/15 border-rose-500 text-rose-500 font-bold"
                      : "bg-muted/30 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="block text-[9px] opacity-70">DECK 2</span>
                  <span className="block truncate font-extrabold text-[11px]">
                    {activePlayerObjB.deck2 || "-"}
                  </span>
                </button>
              </div>

              <div className="pt-1 text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
                <span>Skill Active:</span>
                <span className="font-bold text-foreground">{skillB || "-"}</span>
              </div>
            </div>
          )}

          {/* TOMBOL REPEAT TIM B */}
          <button
            type="button"
            disabled={!canRepeatB}
            onClick={() => setIsRepeatB(!isRepeatB)}
            className={`w-full py-2 px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isRepeatB
                ? "bg-amber-500/20 border-amber-500 text-amber-500 font-extrabold"
                : canRepeatB
                ? "bg-background border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>
              {isRepeatB
                ? "⚡ REPEAT AKTIF (Deck 2 Hangus)"
                : canRepeatB
                ? "Gunakan REPEAT"
                : "REPEAT (Belum Memenuhi Syarat)"}
            </span>
          </button>
        </div>
      </div>

      {/* HASIL KEMENANGAN GAME BERSIH DENGAN LOGO TIM */}
      <div className="space-y-2">
        <label className="block text-[10px] font-bold text-muted-foreground uppercase">
          PEMENANG GAME #{gameLogs.length + 1}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* WINNER TIM A */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("A")}
            className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
              gameResult === "A"
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamALogo || "/logo.webp"} alt="" className="h-6 w-6 object-contain" />
            <span className="font-black text-[11px] truncate w-full text-center">
              {match.teamAName}
            </span>
          </button>

          {/* WINNER TIM B */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("B")}
            className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
              gameResult === "B"
                ? "bg-rose-600 text-white border-rose-500 shadow-md scale-[1.02]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <img src={match.teamBLogo || "/logo.webp"} alt="" className="h-6 w-6 object-contain" />
            <span className="font-black text-[11px] truncate w-full text-center">
              {match.teamBName}
            </span>
          </button>

          {/* DOUBLE LOSS */}
          <button
            type="button"
            disabled={!isFormReady}
            onClick={() => setGameResult("DRAW")}
            className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
              gameResult === "DRAW"
                ? "bg-amber-600 text-white border-amber-500 shadow-md scale-[1.02]"
                : isFormReady
                ? "bg-background border-border hover:bg-muted text-foreground"
                : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            <span className="font-black text-[10px] leading-tight text-center">
              DOUBLE LOSS
            </span>
          </button>
        </div>
      </div>

      {/* TOMBOL SIMPAN LOG GAME (AKTIF KETIKA WINNER DIPILIH) */}
      <button
        type="button"
        disabled={!isWinnerSelected}
        onClick={handleAddSingleGame}
        className="w-full py-3.5 rounded-2xl bg-primary font-extrabold text-xs text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        ➕ Simpan Log Game #{gameLogs.length + 1}
      </button>

      {/* TABEL PREVIEW LOG GAME */}
      {gameLogs.length > 0 && (
        <div className="pt-3 border-t border-border/40 space-y-2">
          <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            📋 Tabel Log Game ({gameLogs.length} Game Tercatat)
          </h4>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="p-2.5 text-center">Game</th>
                  <th className="p-2.5">Pemain A</th>
                  <th className="p-2.5">Deck / Skill A</th>
                  <th className="p-2.5 text-center">Hasil</th>
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
                      <td className="p-2.5 text-center font-bold">#{idx + 1}</td>
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