"use client";

import { useState } from "react";
import { MatchScheduleItem } from "@/lib/types/tournament";
import { Check, Plus, Lock, Unlock } from "lucide-react";
import Swal from "sweetalert2";

export interface PlayerDeckInfo {
  playerName: string;
  duellinksId?: string;
  deck1: string;
  skill1: string;
  deck2: string;
  skill2: string;
}

interface RosterLineupBlockProps {
  match: MatchScheduleItem;
  lineupA: PlayerDeckInfo[];
  setLineupA: (v: PlayerDeckInfo[]) => void;
  lineupB: PlayerDeckInfo[];
  setLineupB: (v: PlayerDeckInfo[]) => void;
  dbRosterA: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>;
  dbRosterB: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>;
  masterDecks: string[];
  masterSkills: string[];
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => Promise<void>;
  onSaveLineupToKV: () => Promise<void>;
  isLineupLocked: boolean;
  setIsLineupLocked: (v: boolean) => void;

  // 🟢 DUA BARIS INI YANG WAJIB ADA AGAR VERCEL GAK ERROR:
  gameLogs?: GameDetailLog[];
  setGameLogs?: (v: GameDetailLog[]) => void;
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
  gameLogs = [],
  setGameLogs,
}: RosterLineupBlockProps) {
  const [isSavingLineup, setIsSavingLineup] = useState(false);

  // Validasi: Hanya cek pemain yang DICENTANG apakah Deck 1, Skill 1, Deck 2, Skill 2 sudah lengkap
  const isSelectedPlayersAComplete =
    lineupA.length > 0 && lineupA.every((p) => p.deck1 && p.skill1 && p.deck2 && p.skill2);
  const isSelectedPlayersBComplete =
    lineupB.length > 0 && lineupB.every((p) => p.deck1 && p.skill1 && p.deck2 && p.skill2);

  const isFormValidToSave = isSelectedPlayersAComplete && isSelectedPlayersBComplete;

  const handlePromptAddMaster = async (type: "DECK" | "SKILL") => {
    if (isLineupLocked) return;
    const { value: text } = await Swal.fire({
      title: `Tambah Master ${type === "DECK" ? "Deck" : "Skill"}`,
      input: "text",
      inputPlaceholder: `Nama ${type === "DECK" ? "Deck" : "Skill"}...`,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      confirmButtonColor: "#9333ea",
    });

    if (text && text.trim() !== "") {
      await onAddMasterItem(type, text.trim());
    }
  };

  const handleToggleLockLineup = async () => {
    if (!isLineupLocked) {
      if (!isFormValidToSave) {
        Swal.fire(
          "Peringatan",
          "Setiap pemain yang dicentang WAJIB memilih Deck 1, Skill 1, Deck 2, dan Skill 2 secara lengkap!",
          "warning"
        );
        return;
      }

      setIsSavingLineup(true);
      try {
        await onSaveLineupToKV();
        setIsLineupLocked(true);
        Swal.fire({
          icon: "success",
          title: "Lineup Dikunci",
          text: "Lineup berhasil dikunci! Silakan lanjut ke registrasi Game Log.",
          toast: true,
          position: "top-end",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch {
        Swal.fire("Gagal", "Gagal menyimpan lineup ke server", "error");
      } finally {
        setIsSavingLineup(false);
      }
    } else {
      setIsLineupLocked(false);
    }
  };

  const togglePlayer = (
    playerObj: { ign?: string; name: string; duellinksId?: string },
    currentLineup: PlayerDeckInfo[],
    setLineup: (v: PlayerDeckInfo[]) => void
  ) => {
    if (isLineupLocked) return;
    const ign = playerObj.ign || playerObj.name;
    const dlId = playerObj.duellinksId || "-";

    const exists = currentLineup.some((p) => p.playerName === ign);
    if (exists) {
      // Uncheck & bersihkan data pemain ini
      setLineup(currentLineup.filter((p) => p.playerName !== ign));
    } else {
      if (currentLineup.length >= 5) {
        Swal.fire("Maksimal Roster", "Maksimal mendaftarkan 5 pemain!", "warning");
        return;
      }
      setLineup([
        ...currentLineup,
        { playerName: ign, duellinksId: dlId, deck1: "", skill1: "", deck2: "", skill2: "" },
      ]);
    }
  };

  const updateDeckSkill = (
    playerName: string,
    field: "deck1" | "skill1" | "deck2" | "skill2",
    val: string,
    currentLineup: PlayerDeckInfo[],
    setLineup: (v: PlayerDeckInfo[]) => void
  ) => {
    if (isLineupLocked) return;
    const updated = currentLineup.map((p) => {
      if (p.playerName === playerName) {
        // Validasi Deck 1 & Deck 2 tidak boleh sama
        if (field === "deck2" && val !== "" && val === p.deck1) {
          Swal.fire("Peringatan", "Deck 2 tidak boleh sama dengan Deck 1!", "warning");
          return p;
        }
        if (field === "deck1" && val !== "" && val === p.deck2) {
          Swal.fire("Peringatan", "Deck 1 tidak boleh sama dengan Deck 2!", "warning");
          return p;
        }
        return { ...p, [field]: val };
      }
      return p;
    });
    setLineup(updated);
  };

  const renderTeamRosterSection = (
    teamName: string,
    teamLogo: string,
    currentLineup: PlayerDeckInfo[],
    setLineup: (v: PlayerDeckInfo[]) => void,
    dbRosterList: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>,
    isTeamA: boolean
  ) => {
    const isMax = currentLineup.length >= 5;

    return (
      <div
        className={`space-y-4 p-4 rounded-2xl border transition-all ${
          isLineupLocked ? "bg-muted/10 opacity-90 border-border/20" : "bg-muted/20 border-border/40"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <div className="flex items-center gap-2 font-black text-xs uppercase">
            <img src={teamLogo || "/logo.webp"} alt="" className="h-5 w-5 object-contain" />
            <span className={isTeamA ? "text-primary" : "text-rose-500"}>{teamName}</span>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
              currentLineup.length === 5
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-500 border-amber-500/30"
            }`}
          >
            {currentLineup.length}/5 Pemain
          </span>
        </div>

        {/* LIST ROSTER DENGAN CHECKBOX SELECTION */}
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
          {dbRosterList.map((item) => {
            const ign = item.ign || item.name;
            const dlId = item.duellinksId && item.duellinksId !== "-" ? ` (${item.duellinksId})` : "";
            const displayName = `${ign}${dlId}`;

            const isChecked = currentLineup.some((p) => p.playerName === ign);
            const isDisabled = isLineupLocked || (!isChecked && isMax);

            return (
              <button
                key={item.id || ign}
                type="button"
                disabled={isDisabled}
                onClick={() => togglePlayer(item, currentLineup, setLineup)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition ${
                  isChecked
                    ? isTeamA
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-rose-500/15 border-rose-500 text-rose-500"
                    : isDisabled
                    ? "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
                    : "bg-background/60 border-border text-foreground hover:bg-muted cursor-pointer"
                }`}
              >
                <span className="truncate">{displayName}</span>
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                    isChecked
                      ? isTeamA
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-rose-500 border-rose-500 text-white"
                      : "border-border bg-background"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* ATUR DECK & SKILL (MUNCUL HANYA UNTUK PEMAIN YANG DICENTANG) */}
        {currentLineup.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-border/40">
            <p className="text-[11px] font-extrabold text-foreground uppercase tracking-wide">
              ⚙️ Registrasi Deck &amp; Skill
            </p>
            {currentLineup.map((p, idx) => {
              const dbItem = dbRosterList.find((x) => (x.ign || x.name) === p.playerName);
              const dlIdDisplay =
                p.duellinksId && p.duellinksId !== "-" ? p.duellinksId : dbItem?.duellinksId;

              return (
                <div
                  key={p.playerName}
                  className="p-3 bg-background/90 rounded-xl border border-border/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-foreground">
                      <span className="text-primary">{idx + 1}.</span> {p.playerName}
                    </span>
                    {dlIdDisplay && dlIdDisplay !== "-" && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        ID: {dlIdDisplay}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {/* DECK 1 & SKILL 1 */}
                    <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/30">
                      <span className="font-bold text-primary block text-[10px]">DECK 1</span>
                      <select
                        disabled={isLineupLocked}
                        value={p.deck1}
                        onChange={(e) =>
                          updateDeckSkill(
                            p.playerName,
                            "deck1",
                            e.target.value,
                            currentLineup,
                            setLineup
                          )
                        }
                        className="w-full rounded bg-background border border-input p-1 font-semibold text-xs disabled:opacity-70 cursor-pointer"
                      >
                        <option value="">-- Pilih Deck --</option>
                        {masterDecks.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>

                      <select
                        disabled={isLineupLocked}
                        value={p.skill1}
                        onChange={(e) =>
                          updateDeckSkill(
                            p.playerName,
                            "skill1",
                            e.target.value,
                            currentLineup,
                            setLineup
                          )
                        }
                        className="w-full rounded bg-background border border-input p-1 font-semibold text-xs disabled:opacity-70 cursor-pointer"
                      >
                        <option value="">-- Pilih Skill --</option>
                        {masterSkills.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* DECK 2 & SKILL 2 */}
                    <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/30">
                      <span className="font-bold text-rose-500 block text-[10px]">DECK 2</span>
                      <select
                        disabled={isLineupLocked}
                        value={p.deck2}
                        onChange={(e) =>
                          updateDeckSkill(
                            p.playerName,
                            "deck2",
                            e.target.value,
                            currentLineup,
                            setLineup
                          )
                        }
                        className="w-full rounded bg-background border border-input p-1 font-semibold text-xs disabled:opacity-70 cursor-pointer"
                      >
                        <option value="">-- Pilih Deck --</option>
                        {masterDecks.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>

                      <select
                        disabled={isLineupLocked}
                        value={p.skill2}
                        onChange={(e) =>
                          updateDeckSkill(
                            p.playerName,
                            "skill2",
                            e.target.value,
                            currentLineup,
                            setLineup
                          )
                        }
                        className="w-full rounded bg-background border border-input p-1 font-semibold text-xs disabled:opacity-70 cursor-pointer"
                      >
                        <option value="">-- Pilih Skill --</option>
                        {masterSkills.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-border/40 pb-3 gap-2">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>2. Lineup Bertanding</span>
              {isLineupLocked && (
                <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLineupLocked}
            onClick={() => handlePromptAddMaster("DECK")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Deck</span>
          </button>
          <button
            type="button"
            disabled={isLineupLocked}
            onClick={() => handlePromptAddMaster("SKILL")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Skill</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {renderTeamRosterSection(
          match.teamAName,
          match.teamALogo,
          lineupA,
          setLineupA,
          dbRosterA,
          true
        )}
        {renderTeamRosterSection(
          match.teamBName,
          match.teamBLogo,
          lineupB,
          setLineupB,
          dbRosterB,
          false
        )}
      </div>

      {/* TOMBOL LOCK LINEUP */}
      <button
        type="button"
        disabled={isSavingLineup || (!isLineupLocked && !isFormValidToSave)}
        onClick={handleToggleLockLineup}
        className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          isLineupLocked
            ? "bg-amber-600 hover:bg-amber-500 text-white"
            : "bg-emerald-600 hover:bg-emerald-500 text-white"
        }`}
      >
        {isLineupLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <span>
          {isSavingLineup
            ? "Menyimpan..."
            : isLineupLocked
            ? "✏️ EDIT LINEUP"
            : isFormValidToSave
            ? "🔒 LOCK LINEUP"
            : "🔒 Lengkapi Deck & Skill Pemain Terpilih"}
        </span>
      </button>
    </section>
  );
          }
