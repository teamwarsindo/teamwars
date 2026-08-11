"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";
import { Check, Plus } from "lucide-react";
import Swal from "sweetalert2";

export interface PlayerDeckInfo {
  playerName: string;
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
  availableIgnA: string[];
  availableIgnB: string[];
  masterDecks: string[];
  masterSkills: string[];
  onAddMasterItem: (type: "DECK" | "SKILL", newItem: string) => Promise<void>;
}

export function RosterLineupBlock({
  match,
  lineupA,
  setLineupA,
  lineupB,
  setLineupB,
  availableIgnA,
  availableIgnB,
  masterDecks,
  masterSkills,
  onAddMasterItem,
}: RosterLineupBlockProps) {
  const handlePromptAddMaster = async (type: "DECK" | "SKILL") => {
    const { value: text } = await Swal.fire({
      title: `Tambah Master ${type === "DECK" ? "Deck Archetype" : "Skill"} Baru`,
      input: "text",
      inputPlaceholder: `Masukkan nama ${type === "DECK" ? "Deck" : "Skill"}...`,
      showCancelButton: true,
      confirmButtonText: "Simpan Ke KV",
      confirmButtonColor: "#9333ea",
    });

    if (text && text.trim() !== "") {
      await onAddMasterItem(type, text.trim());
    }
  };

  const togglePlayer = (
    ign: string,
    currentLineup: PlayerDeckInfo[],
    setLineup: (v: PlayerDeckInfo[]) => void
  ) => {
    const exists = currentLineup.some((p) => p.playerName === ign);
    if (exists) {
      setLineup(currentLineup.filter((p) => p.playerName !== ign));
    } else {
      if (currentLineup.length >= 5) return;
      setLineup([
        ...currentLineup,
        { playerName: ign, deck1: "", skill1: "", deck2: "", skill2: "" },
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
    const updated = currentLineup.map((p) => {
      if (p.playerName === playerName) {
        // Validation: Jika memilih deck2 yang sama dengan deck1, cegah & berikan peringatan
        if (field === "deck2" && val !== "" && val === p.deck1) {
          Swal.fire("Peringatan", "Deck 2 TIDAK BOLEH SAMA dengan Deck 1!", "warning");
          return p;
        }
        if (field === "deck1" && val !== "" && val === p.deck2) {
          Swal.fire("Peringatan", "Deck 1 TIDAK BOLEH SAMA dengan Deck 2!", "warning");
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
    availableOptions: string[],
    isTeamA: boolean
  ) => {
    const isMax = currentLineup.length >= 5;

    return (
      <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-border/40">
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <div className="flex items-center gap-2 font-black text-xs uppercase">
            <img src={teamLogo} alt="" className="h-5 w-5 object-contain" />
            <span className={isTeamA ? "text-primary" : "text-rose-500"}>{teamName}</span>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
              currentLineup.length === 5
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-500 border-amber-500/30"
            }`}
          >
            {currentLineup.length}/5 Pemain
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
          {availableOptions.map((ign) => {
            const isChecked = currentLineup.some((p) => p.playerName === ign);
            const isDisabled = !isChecked && isMax;

            return (
              <button
                key={ign}
                type="button"
                disabled={isDisabled}
                onClick={() => togglePlayer(ign, currentLineup, setLineup)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isChecked
                    ? isTeamA
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-rose-500/15 border-rose-500 text-rose-500"
                    : isDisabled
                    ? "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
                    : "bg-background/60 border-border text-foreground hover:bg-muted"
                }`}
              >
                <span className="truncate">{ign}</span>
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

        {currentLineup.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-border/40">
            <p className="text-[11px] font-extrabold text-foreground uppercase tracking-wide">
              ⚙️ Pengaturan 2 Deck Berbeda &amp; Skill Pemain
            </p>
            {currentLineup.map((p, idx) => (
              <div
                key={p.playerName}
                className="p-3 bg-background/90 rounded-xl border border-border/60 space-y-2 text-xs"
              >
                <span className="font-extrabold text-foreground flex items-center gap-1">
                  <span className="text-primary">{idx + 1}.</span> {p.playerName}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* DECK 1 */}
                  <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/30">
                    <span className="font-bold text-primary block text-[10px]">DECK 1 &amp; SKILL</span>
                    <select
                      value={p.deck1}
                      onChange={(e) =>
                        updateDeckSkill(p.playerName, "deck1", e.target.value, currentLineup, setLineup)
                      }
                      className="w-full rounded bg-background border border-input p-1 font-semibold text-xs"
                    >
                      <option value="">-- Pilih Deck 1 --</option>
                      {masterDecks.map((d) => (
                        <option key={d} value={d} disabled={d === p.deck2}>
                          {d} {d === p.deck2 ? "(Sudah Dipilih Di Deck 2)" : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      value={p.skill1}
                      onChange={(e) =>
                        updateDeckSkill(p.playerName, "skill1", e.target.value, currentLineup, setLineup)
                      }
                      className="w-full rounded bg-background border border-input p-1 font-semibold text-xs"
                    >
                      <option value="">-- Pilih Skill 1 --</option>
                      {masterSkills.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* DECK 2 */}
                  <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/30">
                    <span className="font-bold text-rose-500 block text-[10px]">DECK 2 &amp; SKILL</span>
                    <select
                      value={p.deck2}
                      onChange={(e) =>
                        updateDeckSkill(p.playerName, "deck2", e.target.value, currentLineup, setLineup)
                      }
                      className="w-full rounded bg-background border border-input p-1 font-semibold text-xs"
                    >
                      <option value="">-- Pilih Deck 2 --</option>
                      {masterDecks.map((d) => (
                        <option key={d} value={d} disabled={d === p.deck1}>
                          {d} {d === p.deck1 ? "(Tidak Boleh Sama Dengan Deck 1)" : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      value={p.skill2}
                      onChange={(e) =>
                        updateDeckSkill(p.playerName, "skill2", e.target.value, currentLineup, setLineup)
                      }
                      className="w-full rounded bg-background border border-input p-1 font-semibold text-xs"
                    >
                      <option value="">-- Pilih Skill 2 --</option>
                      {masterSkills.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
            <h3 className="text-sm font-semibold text-foreground">2. Lineup Bertanding &amp; Register Deck</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Centang 5 pemain aktif. Setiap pemain wajib mendaftarkan 2 deck yang berbeda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePromptAddMaster("DECK")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Deck</span>
          </button>
          <button
            type="button"
            onClick={() => handlePromptAddMaster("SKILL")}
            className="px-2.5 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1 cursor-pointer"
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
          availableIgnA,
          true
        )}
        {renderTeamRosterSection(
          match.teamBName,
          match.teamBLogo,
          lineupB,
          setLineupB,
          availableIgnB,
          false
        )}
      </div>
    </section>
  );
    }
                      
