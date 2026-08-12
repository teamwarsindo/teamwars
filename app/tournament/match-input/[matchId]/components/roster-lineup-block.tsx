"use client";

import { useState } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { CustomSelect } from "./custom-select";
import { Lock, Unlock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";

export interface PlayerDeckInfo {
  playerName: string;
  duellinksId?: string;
  deck1: string;
  skill1: string;
  deck2: string;
  skill2: string;
}

interface PlayerItem {
  id: string;
  name: string;
  ign?: string;
  duellinksId?: string;
}

interface RosterLineupBlockProps {
  match: MatchScheduleItem;
  lineupA: PlayerDeckInfo[];
  setLineupA: (v: PlayerDeckInfo[]) => void;
  lineupB: PlayerDeckInfo[];
  setLineupB: (v: PlayerDeckInfo[]) => void;
  dbRosterA: PlayerItem[];
  dbRosterB: PlayerItem[];
  masterDecks: string[];
  masterSkills: string[];
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => void;
  onSaveLineupToKV: () => Promise<void>;
  isLineupLocked: boolean;
  setIsLineupLocked: (v: boolean) => void;
  gameLogs: GameDetailLog[];
  setGameLogs: (v: GameDetailLog[]) => void;
}

export function RosterLineupBlock({
  match,
  lineupA,
  setLineupA,
  lineupB,
  setLineupB,
  dbRosterA,
  dbRosterB,
  masterDecks,
  masterSkills,
  onAddMasterItem,
  onSaveLineupToKV,
  isLineupLocked,
  setIsLineupLocked,
  gameLogs,
  setGameLogs,
}: RosterLineupBlockProps) {
  // State expanded per pemain untuk isi Deck & Skill
  const [expandedA, setExpandedA] = useState<Record<string, boolean>>({});
  const [expandedB, setExpandedB] = useState<Record<string, boolean>>({});

  const handleAddNewItemPrompt = async (type: "DECK" | "SKILL") => {
    const { value: name } = await Swal.fire({
      title: `Tambah Master ${type === "DECK" ? "Deck Archetype" : "Skill"} Baru`,
      input: "text",
      inputPlaceholder: `Masukkan nama ${type.toLowerCase()}...`,
      showCancelButton: true,
      confirmButtonText: "Simpan ke Master",
      confirmButtonColor: "#9333ea",
    });

    if (name && name.trim()) {
      onAddMasterItem(type, name.trim());
    }
  };

  // HANDLER CHECK / UNCHECK PEMAIN
  const handleTogglePlayer = (isTeamA: boolean, playerObj: PlayerItem) => {
    if (isLineupLocked) return;

    const currentLineup = isTeamA ? [...lineupA] : [...lineupB];
    const setLineup = isTeamA ? setLineupA : setLineupB;
    const playerName = playerObj.ign || playerObj.name;

    const existsIndex = currentLineup.findIndex((p) => p.playerName === playerName);

    if (existsIndex >= 0) {
      // Uncheck / Hapus
      currentLineup.splice(existsIndex, 1);
    } else {
      // Check / Tambah (Maksimal 5)
      if (currentLineup.length >= 5) {
        Swal.fire("Maksimal Roster", "Satu tim maksimal mendaftarkan 5 pemain!", "warning");
        return;
      }
      currentLineup.push({
        playerName,
        duellinksId: playerObj.duellinksId,
        deck1: "",
        skill1: "",
        deck2: "",
        skill2: "",
      });
    }

    setLineup(currentLineup);
  };

  const handleUpdateDeckSkill = (
    isTeamA: boolean,
    playerName: string,
    field: keyof PlayerDeckInfo,
    val: string
  ) => {
    const currentLineup = isTeamA ? [...lineupA] : [...lineupB];
    const setLineup = isTeamA ? setLineupA : setLineupB;

    const idx = currentLineup.findIndex((p) => p.playerName === playerName);
    if (idx >= 0) {
      currentLineup[idx][field] = val;
      setLineup(currentLineup);
    }
  };

  // KUNCI LINEUP & AUTO-TL PEMAIN KOSONG
  const handleLockLineupValidation = async () => {
    // 1. Validasi Pemain Dicentang Wajib Isi Deck & Skill
    const isIncompleteA = lineupA.some((p) => !p.deck1 || !p.skill1 || !p.deck2 || !p.skill2);
    const isIncompleteB = lineupB.some((p) => !p.deck1 || !p.skill1 || !p.deck2 || !p.skill2);

    if (isIncompleteA || isIncompleteB) {
      Swal.fire({
        icon: "error",
        title: "Deck & Skill Belum Lengkap!",
        text: "Pemain yang dicentang WAJIB melengkapi Deck 1, Skill 1, Deck 2, dan Skill 2. Jika tidak bertanding, uncheck/jangan centang nama pemain tersebut.",
      });
      return;
    }

    // 2. Kalkulasi Slot Kosong (Kurang dari 5)
    const missingA = 5 - lineupA.length;
    const missingB = 5 - lineupB.length;

    if (missingA > 0 || missingB > 0) {
      const confirm = await Swal.fire({
        title: "Konfirmasi Roster Pertandingan",
        html: `
          <div class="text-left text-xs space-y-2">
            <p>Sistem mendeteksi roster kurang dari 5 pemain:</p>
            <ul class="list-disc pl-4 font-bold text-amber-500">
              <li>${match.teamAName}: ${lineupA.length}/5 Pemain (${missingA * 2} Deck Lose)</li>
              <li>${match.teamBName}: ${lineupB.length}/5 Pemain (${missingB * 2} Deck Lose)</li>
            </ul>
            <p class="text-muted-foreground mt-2">
              Slot yang tidak dipilih otomatis di-generate sebagai Technical Loss (TL). Lanjutkan penguncian?
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Kunci Lineup",
        cancelButtonText: "Batal / Lengkapi Pemain",
        confirmButtonColor: "#9333ea",
      });

      if (!confirm.isConfirmed) return;

      // Auto TL Netto
      const autoTLLogs: GameDetailLog[] = [];
      let currentGameNum = gameLogs.length + 1;

      const tlLossesA = missingA * 2;
      const tlLossesB = missingB * 2;

      if (tlLossesB > tlLossesA) {
        const netTL = tlLossesB - tlLossesA;
        for (let i = 0; i < netTL; i++) {
          autoTLLogs.push({
            gameNumber: currentGameNum++,
            playerAId: "BYE Slot", playerAName: "BYE / Slot Kosong", deckA: "TL", skillA: "TL",
            playerBId: "BYE Slot", playerBName: "BYE / Slot Kosong", deckB: "TL", skillB: "TL",
            winnerTeamId: match.teamAId, isTLA: false, isTLB: true,
          } as any);
        }
      } else if (tlLossesA > tlLossesB) {
        const netTL = tlLossesA - tlLossesB;
        for (let i = 0; i < netTL; i++) {
          autoTLLogs.push({
            gameNumber: currentGameNum++,
            playerAId: "BYE Slot", playerAName: "BYE / Slot Kosong", deckA: "TL", skillA: "TL",
            playerBId: "BYE Slot", playerBName: "BYE / Slot Kosong", deckB: "TL", skillB: "TL",
            winnerTeamId: match.teamBId, isTLA: true, isTLB: false,
          } as any);
        }
      }

      if (autoTLLogs.length > 0) {
        setGameLogs([...gameLogs, ...autoTLLogs]);
      }
    }

    try {
      setIsLineupLocked(true);
      await onSaveLineupToKV();
      Swal.fire("Tersimpan!", "Lineup berhasil dikunci & Auto-TL diproses.", "success");
    } catch {
      setIsLineupLocked(false);
      Swal.fire("Gagal", "Gagal menyimpan lineup ke KV", "error");
    }
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      {/* HEADER SECTION 2 */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-primary" />
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
            2. Lineup Bertanding
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddNewItemPrompt("DECK")}
            className="px-2.5 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-extrabold text-foreground border border-border/40 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3 text-primary" /> Deck
          </button>
          <button
            type="button"
            onClick={() => handleAddNewItemPrompt("SKILL")}
            className="px-2.5 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-extrabold text-foreground border border-border/40 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3 text-primary" /> Skill
          </button>
        </div>
      </div>

      {/* DUA KOLOM SIDE-BY-SIDE (TIM A DI KIRI, TIM B DI KANAN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TIM A (KIRI) */}
        <div className="p-3.5 bg-muted/10 rounded-2xl border border-border/40 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border/20">
            <div className="flex items-center gap-2 font-black text-xs text-primary uppercase">
              <img src={match.teamALogo || "/logo.webp"} className="h-4 w-4 object-contain" alt="" />
              <span>{match.teamAName}</span>
            </div>
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {lineupA.length}/5 Pemain
            </span>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {dbRosterA.map((player) => {
              const playerName = player.ign || player.name;
              const selectedObj = lineupA.find((p) => p.playerName === playerName);
              const isChecked = Boolean(selectedObj);
              const isExpanded = expandedA[playerName];

              return (
                <div
                  key={player.id || playerName}
                  className={`rounded-xl border transition-all ${
                    isChecked
                      ? "bg-primary/10 border-primary/50"
                      : "bg-background/40 border-border/30 hover:border-border"
                  } ${isLineupLocked ? "opacity-80 pointer-events-none" : ""}`}
                >
                  <div className="p-2.5 flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePlayer(true, player)}
                        disabled={isLineupLocked}
                        className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <div className="truncate text-xs font-black text-foreground">
                        {playerName}
                        {player.duellinksId && (
                          <span className="text-[9px] font-mono text-muted-foreground ml-1 font-normal">
                            ({player.duellinksId})
                          </span>
                        )}
                      </div>
                    </label>

                    {isChecked && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedA({ ...expandedA, [playerName]: !isExpanded })
                        }
                        className="text-[10px] text-primary font-bold px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Tutup Deck" : "Isi Deck"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {/* EXPANDABLE DECK & SKILL FORM */}
                  {isChecked && isExpanded && (
                    <div className="p-2.5 border-t border-primary/20 bg-background/80 space-y-2 text-xs animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-emerald-500">Deck 1</span>
                        <CustomSelect
                          value={selectedObj?.deck1 || ""}
                          onChange={(v) => handleUpdateDeckSkill(true, playerName, "deck1", v)}
                          options={masterDecks}
                          placeholder="-- Archetype Deck 1 --"
                          disabled={isLineupLocked}
                        />
                        <CustomSelect
                          value={selectedObj?.skill1 || ""}
                          onChange={(v) => handleUpdateDeckSkill(true, playerName, "skill1", v)}
                          options={masterSkills}
                          placeholder="-- Skill Deck 1 --"
                          disabled={isLineupLocked}
                        />
                      </div>

                      <div className="space-y-1 pt-1 border-t border-border/20">
                        <span className="text-[9px] font-black uppercase text-amber-500">Deck 2</span>
                        <CustomSelect
                          value={selectedObj?.deck2 || ""}
                          onChange={(v) => handleUpdateDeckSkill(true, playerName, "deck2", v)}
                          options={masterDecks}
                          placeholder="-- Archetype Deck 2 --"
                          disabled={isLineupLocked}
                        />
                        <CustomSelect
                          value={selectedObj?.skill2 || ""}
                          onChange={(v) => handleUpdateDeckSkill(true, playerName, "skill2", v)}
                          options={masterSkills}
                          placeholder="-- Skill Deck 2 --"
                          disabled={isLineupLocked}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TIM B (KANAN) */}
        <div className="p-3.5 bg-muted/10 rounded-2xl border border-border/40 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border/20">
            <div className="flex items-center gap-2 font-black text-xs text-rose-500 uppercase">
              <img src={match.teamBLogo || "/logo.webp"} className="h-4 w-4 object-contain" alt="" />
              <span>{match.teamBName}</span>
            </div>
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              {lineupB.length}/5 Pemain
            </span>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {dbRosterB.map((player) => {
              const playerName = player.ign || player.name;
              const selectedObj = lineupB.find((p) => p.playerName === playerName);
              const isChecked = Boolean(selectedObj);
              const isExpanded = expandedB[playerName];

              return (
                <div
                  key={player.id || playerName}
                  className={`rounded-xl border transition-all ${
                    isChecked
                      ? "bg-rose-500/10 border-rose-500/50"
                      : "bg-background/40 border-border/30 hover:border-border"
                  } ${isLineupLocked ? "opacity-80 pointer-events-none" : ""}`}
                >
                  <div className="p-2.5 flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePlayer(false, player)}
                        disabled={isLineupLocked}
                        className="h-4 w-4 rounded accent-rose-500 cursor-pointer shrink-0"
                      />
                      <div className="truncate text-xs font-black text-foreground">
                        {playerName}
                        {player.duellinksId && (
                          <span className="text-[9px] font-mono text-muted-foreground ml-1 font-normal">
                            ({player.duellinksId})
                          </span>
                        )}
                      </div>
                    </label>

                    {isChecked && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedB({ ...expandedB, [playerName]: !isExpanded })
                        }
                        className="text-[10px] text-rose-500 font-bold px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Tutup Deck" : "Isi Deck"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {/* EXPANDABLE DECK & SKILL FORM */}
                  {isChecked && isExpanded && (
                    <div className="p-2.5 border-t border-rose-500/20 bg-background/80 space-y-2 text-xs animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-emerald-500">Deck 1</span>
                        <CustomSelect
                          value={selectedObj?.deck1 || ""}
                          onChange={(v) => handleUpdateDeckSkill(false, playerName, "deck1", v)}
                          options={masterDecks}
                          placeholder="-- Archetype Deck 1 --"
                          disabled={isLineupLocked}
                        />
                        <CustomSelect
                          value={selectedObj?.skill1 || ""}
                          onChange={(v) => handleUpdateDeckSkill(false, playerName, "skill1", v)}
                          options={masterSkills}
                          placeholder="-- Skill Deck 1 --"
                          disabled={isLineupLocked}
                        />
                      </div>

                      <div className="space-y-1 pt-1 border-t border-border/20">
                        <span className="text-[9px] font-black uppercase text-amber-500">Deck 2</span>
                        <CustomSelect
                          value={selectedObj?.deck2 || ""}
                          onChange={(v) => handleUpdateDeckSkill(false, playerName, "deck2", v)}
                          options={masterDecks}
                          placeholder="-- Archetype Deck 2 --"
                          disabled={isLineupLocked}
                        />
                        <CustomSelect
                          value={selectedObj?.skill2 || ""}
                          onChange={(v) => handleUpdateDeckSkill(false, playerName, "skill2", v)}
                          options={masterSkills}
                          placeholder="-- Skill Deck 2 --"
                          disabled={isLineupLocked}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOMBOL LOCK LINEUP DI BAGIAN BOWA BANNER PANJANG */}
      <button
        type="button"
        onClick={isLineupLocked ? () => setIsLineupLocked(false) : handleLockLineupValidation}
        className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
          isLineupLocked
            ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 hover:bg-amber-500/30"
            : "bg-emerald-600 hover:bg-emerald-500 text-white"
        }`}
      >
        {isLineupLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <span>{isLineupLocked ? "EDIT LINEUP BERTANDING" : "🔒 LOCK LINEUP BERTANDING"}</span>
      </button>
    </section>
  );
}