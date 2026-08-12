"use client";

import { Check } from "lucide-react";
import { PlayerDeckInfo } from "@/lib/types/tournament";
import { TOURNAMENT_CONFIG } from "../../constants/tournament";

interface TeamRosterColumnProps {
  teamName: string;
  teamLogo?: string;
  lineup: PlayerDeckInfo[];
  setLineup: (v: PlayerDeckInfo[]) => void;
  dbRoster: Array<{ id: string; name: string; ign?: string; duellinksId?: string }>;
  masterDecks: string[];
  masterSkills: string[];
  isLocked: boolean;
  maxSelectablePlayers?: number;
}

export function TeamRosterColumn({
  teamName,
  teamLogo,
  lineup,
  setLineup,
  dbRoster,
  masterDecks,
  masterSkills,
  isLocked,
  maxSelectablePlayers = TOURNAMENT_CONFIG.MAX_ROSTER_SIZE,
}: TeamRosterColumnProps) {
  const togglePlayer = (item: { name: string; ign?: string; duellinksId?: string }) => {
    if (isLocked) return;
    const ign = item.ign || item.name;
    const exists = lineup.some((p) => p.playerName === ign);

    if (exists) {
      setLineup(lineup.filter((p) => p.playerName !== ign));
    } else {
      if (lineup.length >= maxSelectablePlayers) return;
      setLineup([
        ...lineup,
        {
          playerName: ign,
          duellinksId: item.duellinksId || "-",
          deck1: "",
          skill1: "",
          deck2: "",
          skill2: "",
        },
      ]);
    }
  };

  const updateDeckSkill = (
    playerName: string,
    field: "deck1" | "skill1" | "deck2" | "skill2",
    val: string
  ) => {
    if (isLocked) return;

    setLineup(
      lineup.map((p) => {
        if (p.playerName !== playerName) return p;

        // Reset Deck 2 jika sama dengan Deck 1
        if (field === "deck1" && p.deck2 === val) {
          return { ...p, deck1: val, deck2: "" };
        }
        return { ...p, [field]: val };
      })
    );
  };

  return (
    <div
      className={`space-y-4 p-4 rounded-2xl border transition-all ${
        isLocked ? "bg-muted/10 opacity-90 border-border/20" : "bg-muted/20 border-border/40"
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/30">
        <div className="flex items-center gap-2 font-black text-xs uppercase text-foreground">
          <img src={teamLogo || "/logo.webp"} alt="" className="h-5 w-5 object-contain" />
          <span>{teamName}</span>
        </div>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-500">
          {lineup.length}/{maxSelectablePlayers} Pemain
        </span>
      </div>

      {/* CHECKBOX ROSTER LIST */}
      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
        {dbRoster.map((item) => {
          const ign = item.ign || item.name;
          const isChecked = lineup.some((p) => p.playerName === ign);
          const isDisabled = isLocked || (!isChecked && lineup.length >= maxSelectablePlayers);

          return (
            <button
              key={item.id || ign}
              type="button"
              disabled={isDisabled}
              onClick={() => togglePlayer(item)}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition ${
                isChecked
                  ? "bg-primary/15 border-primary text-primary"
                  : isDisabled
                  ? "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
                  : "bg-background/60 border-border text-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              <span className="truncate">
                {ign}
                {item.duellinksId && item.duellinksId !== "-" ? ` (${item.duellinksId})` : ""}
              </span>
              <div
                className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                  isChecked
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border bg-background"
                }`}
              >
                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* FORM ATUR DECK & SKILL */}
      {lineup.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border/40">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
            ⚙️ Registrasi Deck &amp; Skill
          </p>
          {lineup.map((p, idx) => (
            <div
              key={p.playerName}
              className="p-3 bg-background/90 rounded-xl border border-border/60 space-y-2 text-xs"
            >
              <span className="font-extrabold text-foreground">
                <span className="text-primary">{idx + 1}.</span> {p.playerName}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* DECK 1 */}
                <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/20">
                  <span className="font-bold text-primary block text-[10px]">DECK 1</span>
                  <select
                    disabled={isLocked}
                    value={p.deck1}
                    onChange={(e) => updateDeckSkill(p.playerName, "deck1", e.target.value)}
                    className="w-full rounded bg-background border border-input p-1 text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Deck --</option>
                    {masterDecks.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={isLocked}
                    value={p.skill1}
                    onChange={(e) => updateDeckSkill(p.playerName, "skill1", e.target.value)}
                    className="w-full rounded bg-background border border-input p-1 text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Skill --</option>
                    {masterSkills.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DECK 2 (STRICT UNIQUE: DECK 1 DI-DISABLE) */}
                <div className="space-y-1 p-2 bg-muted/30 rounded-lg border border-border/20">
                  <span className="font-bold text-primary block text-[10px]">DECK 2</span>
                  <select
                    disabled={isLocked}
                    value={p.deck2}
                    onChange={(e) => updateDeckSkill(p.playerName, "deck2", e.target.value)}
                    className="w-full rounded bg-background border border-input p-1 text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- Pilih Deck --</option>
                    {masterDecks.map((d) => (
                      <option key={d} value={d} disabled={d === p.deck1}>
                        {d} {d === p.deck1 ? "(Sudah Dipilih di Deck 1)" : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={isLocked}
                    value={p.skill2}
                    onChange={(e) => updateDeckSkill(p.playerName, "skill2", e.target.value)}
                    className="w-full rounded bg-background border border-input p-1 text-xs font-semibold cursor-pointer"
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
          ))}
        </div>
      )}
    </div>
  );
}