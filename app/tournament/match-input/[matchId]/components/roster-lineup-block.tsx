"use client";

import { useState } from "react";
import { MatchScheduleItem, GameDetailLog } from "@/lib/types/tournament";
import { CustomSelect } from "./custom-select";
import { Users, Lock, Unlock, PlusCircle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");

  // HANDLER ADD MASTER ITEM
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

  // GENERATE AUTO-TL JIKA LINEUP KURANG DARI 5 PEMAIN
  const handleLockLineupWithAutoTL = async () => {
    const missingA = 5 - lineupA.length;
    const missingB = 5 - lineupB.length;

    if (missingA > 0 || missingB > 0) {
      const confirm = await Swal.fire({
        title: "Konfirmasi Lineup Tidak Lengkap",
        html: `
          <div class="text-left text-xs space-y-2">
            <p>Sistem mendeteksi roster tidak lengkap 5 pemain:</p>
            <ul class="list-disc pl-4 font-bold text-amber-500">
              <li>${match.teamAName}: ${lineupA.length}/5 Pemain (${missingA * 2} Deck Lose)</li>
              <li>${match.teamBName}: ${lineupB.length}/5 Pemain (${missingB * 2} Deck Lose)</li>
            </ul>
            <p class="text-muted-foreground mt-2">
              Sistem akan otomatis meng-generate log Technical Loss (TL) untuk slot yang kosong. Lanjutkan penguncian?
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Kunci & Generate Auto TL",
        cancelButtonText: "Batal / Lengkapi Pemain",
        confirmButtonColor: "#9333ea",
      });

      if (!confirm.isConfirmed) return;

      // Kalkulasi Auto TL
      const autoTLLogs: GameDetailLog[] = [];
      let currentGameNum = gameLogs.length + 1;

      // Setiap pemain yang kurang = 2 Deck Lose (TL)
      const tlLossesA = missingA * 2;
      const tlLossesB = missingB * 2;

      // Saling meniadakan (netto)
      if (tlLossesB > tlLossesA) {
        const netTLForA = tlLossesB - tlLossesA;
        for (let i = 0; i < netTLForA; i++) {
          autoTLLogs.push({
            gameNumber: currentGameNum++,
            playerAId: "BYE / TL Slot",
            playerAName: "BYE / Slot Kosong",
            deckA: "Technical Loss",
            skillA: "TL",
            playerBId: "BYE / TL Slot",
            playerBName: "BYE / Slot Kosong",
            deckB: "Technical Loss",
            skillB: "TL",
            winnerTeamId: match.teamAId,
            isTLA: false,
            isTLB: true,
          } as any);
        }
      } else if (tlLossesA > tlLossesB) {
        const netTLForB = tlLossesA - tlLossesB;
        for (let i = 0; i < netTLForB; i++) {
          autoTLLogs.push({
            gameNumber: currentGameNum++,
            playerAId: "BYE / TL Slot",
            playerAName: "BYE / Slot Kosong",
            deckA: "Technical Loss",
            skillA: "TL",
            playerBId: "BYE / TL Slot",
            playerBName: "BYE / Slot Kosong",
            deckB: "Technical Loss",
            skillB: "TL",
            winnerTeamId: match.teamBId,
            isTLA: true,
            isTLB: false,
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

  const handleUpdateLineupItem = (
    isTeamA: boolean,
    index: number,
    field: keyof PlayerDeckInfo,
    value: string
  ) => {
    const targetLineup = isTeamA ? [...lineupA] : [...lineupB];
    const setTargetLineup = isTeamA ? setLineupA : setLineupB;

    if (!targetLineup[index]) {
      targetLineup[index] = {
        playerName: "",
        deck1: "",
        skill1: "",
        deck2: "",
        skill2: "",
      };
    }

    targetLineup[index][field] = value;

    // Auto-fill IGN/ID Duel Links jika memilih nama dari Roster DB
    if (field === "playerName") {
      const dbRoster = isTeamA ? dbRosterA : dbRosterB;
      const pObj = dbRoster.find((x) => x.name === value || x.ign === value);
      if (pObj?.duellinksId) {
        targetLineup[index].duellinksId = pObj.duellinksId;
      }
    }

    setTargetLineup(targetLineup);
  };

  const currentLineup = activeTab === "A" ? lineupA : lineupB;
  const currentDbRoster = activeTab === "A" ? dbRosterA : dbRosterB;
  const currentTeamName = activeTab === "A" ? match.teamAName : match.teamBName;

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wide">
            2. Registrasi Lineup &amp; Roster (5 Pemain - 10 Deck)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddNewItemPrompt("DECK")}
            className="px-2 py-1 rounded-lg bg-muted text-[10px] font-bold hover:bg-muted/80 flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="h-3 w-3 text-primary" /> + Deck
          </button>
          <button
            type="button"
            onClick={() => handleAddNewItemPrompt("SKILL")}
            className="px-2 py-1 rounded-lg bg-muted text-[10px] font-bold hover:bg-muted/80 flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="h-3 w-3 text-primary" /> + Skill
          </button>

          <button
            type="button"
            onClick={
              isLineupLocked ? () => setIsLineupLocked(false) : handleLockLineupWithAutoTL
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
              isLineupLocked
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            }`}
          >
            {isLineupLocked ? (
              <>
                <Unlock className="h-3.5 w-3.5" /> ✏️ EDIT LINEUP
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" /> 🔒 LOCK LINEUP
              </>
            )}
          </button>
        </div>
      </div>

      {/* TAB SWITCH TIM A / TIM B */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-border/30 max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab("A")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === "A"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {match.teamAName} ({lineupA.length}/5)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("B")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
            activeTab === "B"
              ? "bg-rose-500 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {match.teamBName} ({lineupB.length}/5)
        </button>
      </div>

      {/* FORM CARDS 5 SLOT PEMAIN */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((idx) => {
          const item = currentLineup[idx] || {
            playerName: "",
            deck1: "",
            skill1: "",
            deck2: "",
            skill2: "",
          };

          const rosterOptions = currentDbRoster.map(
            (r) => `${r.ign || r.name}${r.duellinksId ? ` (${r.duellinksId})` : ""}`
          );

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border bg-background/50 space-y-2 transition ${
                isLineupLocked ? "opacity-75 pointer-events-none" : "border-border/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-primary">
                  Pemain #{idx + 1} - {currentTeamName}
                </span>
                {item.duellinksId && (
                  <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    ID: {item.duellinksId}
                  </span>
                )}
              </div>

              {/* SELECT PEMAIN */}
              <CustomSelect
                value={
                  item.playerName
                    ? `${item.playerName}${
                        item.duellinksId ? ` (${item.duellinksId})` : ""
                      }`
                    : ""
                }
                onChange={(v) =>
                  handleUpdateLineupItem(
                    activeTab === "A",
                    idx,
                    "playerName",
                    v.replace(/\s*\([^)]*\)/g, "").trim()
                  )
                }
                options={rosterOptions}
                placeholder={`-- Pilih Pemain #${idx + 1} --`}
                disabled={isLineupLocked}
              />

              {/* INPUT DECK 1 & DECK 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {/* DECK 1 */}
                <div className="p-2 bg-muted/20 rounded-lg border border-border/20 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-emerald-500">
                    Deck 1
                  </span>
                  <CustomSelect
                    value={item.deck1}
                    onChange={(v) =>
                      handleUpdateLineupItem(activeTab === "A", idx, "deck1", v)
                    }
                    options={masterDecks}
                    placeholder="-- Archetype Deck 1 --"
                    disabled={isLineupLocked}
                  />
                  <CustomSelect
                    value={item.skill1}
                    onChange={(v) =>
                      handleUpdateLineupItem(activeTab === "A", idx, "skill1", v)
                    }
                    options={masterSkills}
                    placeholder="-- Skill Deck 1 --"
                    disabled={isLineupLocked}
                  />
                </div>

                {/* DECK 2 */}
                <div className="p-2 bg-muted/20 rounded-lg border border-border/20 space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-amber-500">
                    Deck 2
                  </span>
                  <CustomSelect
                    value={item.deck2}
                    onChange={(v) =>
                      handleUpdateLineupItem(activeTab === "A", idx, "deck2", v)
                    }
                    options={masterDecks}
                    placeholder="-- Archetype Deck 2 --"
                    disabled={isLineupLocked}
                  />
                  <CustomSelect
                    value={item.skill2}
                    onChange={(v) =>
                      handleUpdateLineupItem(activeTab === "A", idx, "skill2", v)
                    }
                    options={masterSkills}
                    placeholder="-- Skill Deck 2 --"
                    disabled={isLineupLocked}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}