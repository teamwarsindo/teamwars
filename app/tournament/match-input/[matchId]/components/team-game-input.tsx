"use client";

import { PlayerDeckInfo } from "./roster-lineup-block";
import { CustomSelect } from "./custom-select";
import { RotateCcw, Lock } from "lucide-react";

interface TeamGameInputProps {
  isTeamA: boolean;
  teamName: string;
  teamLogo: string;
  player: string;
  setPlayer: (val: string) => void;
  availableOptions: string[];
  isLocked: boolean;
  activePlayerObj?: PlayerDeckInfo;
  selectedDeckSlot: "deck1" | "deck2";
  setSelectedDeckSlot: (val: "deck1" | "deck2") => void;
  skill: string;
  repeatCount: number;
  isRepeat: boolean;
  setIsRepeat: (val: boolean) => void;
  canRepeat: boolean;
  deckLostStats?: {
    deck1Lost: boolean;
    deck2Lost: boolean;
    isDeck1Repeated?: boolean;
  };
}

export function TeamGameInput({
  isTeamA,
  teamName,
  teamLogo,
  player,
  setPlayer,
  availableOptions,
  isLocked,
  activePlayerObj,
  selectedDeckSlot,
  setSelectedDeckSlot,
  skill,
  repeatCount,
  isRepeat,
  setIsRepeat,
  canRepeat,
  deckLostStats,
}: TeamGameInputProps) {
  const textColor = isTeamA ? "text-primary" : "text-rose-500";
  const activeBg = isTeamA
    ? "bg-primary/15 border-primary text-primary font-bold"
    : "bg-rose-500/15 border-rose-500 text-rose-500 font-bold";

  return (
    <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/30">
      <div className="flex items-center justify-between pb-1 border-b border-border/20">
        <div className={`flex items-center gap-1.5 font-black uppercase text-xs truncate max-w-[170px] ${textColor}`}>
          <img src={teamLogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain shrink-0" />
          <span className="truncate">{teamName}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-bold shrink-0">
          Repeat: {repeatCount}/2
        </span>
      </div>

      {/* SELECTOR PEMAIN */}
      <div>
        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
          Pemain Bertanding
        </label>
        <div className="relative">
          <CustomSelect
            value={player}
            onChange={setPlayer}
            options={availableOptions}
            placeholder={availableOptions.length === 0 ? "-- Semua Pemain Gugur --" : "-- Pilih Pemain --"}
            disabled={availableOptions.length === 0 || isLocked}
          />
          {isLocked && (
            <span className="absolute right-8 top-2 text-[10px] font-extrabold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Lock className="h-3 w-3" /> Winner Locked
            </span>
          )}
        </div>
      </div>

      {/* DISPLAY STATUS DECK (NAMA SKILL TIDAK TERPOTONG) */}
      {activePlayerObj && (
        <div
          className={`space-y-1.5 p-2.5 rounded-xl border transition-all ${
            isRepeat
              ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30"
              : "bg-background border-border/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase">
              Pilihan Deck Pemain
            </label>
            {isRepeat && (
              <span className="text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase">
                ⚡ Mode Repeat
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* PILIHAN DECK 1 */}
            <button
              type="button"
              disabled={isLocked || (deckLostStats?.deck1Lost && !isRepeat)}
              onClick={() => setSelectedDeckSlot("deck1")}
              className={`p-2 rounded-lg border text-left transition ${
                selectedDeckSlot === "deck1"
                  ? isRepeat
                    ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                    : activeBg
                  : deckLostStats?.deck1Lost
                  ? "bg-muted/50 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              <div className="font-extrabold text-xs leading-tight whitespace-normal break-words">
                {activePlayerObj.deck1 || "-"}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold whitespace-normal break-words opacity-85 mt-0.5">
                ({activePlayerObj.skill1 || "-"})
              </div>
            </button>

            {/* PILIHAN DECK 2 */}
            <button
              type="button"
              disabled={isLocked || isRepeat || deckLostStats?.deck2Lost}
              onClick={() => setSelectedDeckSlot("deck2")}
              className={`p-2 rounded-lg border text-left transition ${
                selectedDeckSlot === "deck2"
                  ? activeBg
                  : isRepeat
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500/50 line-through cursor-not-allowed"
                  : deckLostStats?.deck2Lost
                  ? "bg-muted/50 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              <div className="font-extrabold text-xs leading-tight whitespace-normal break-words">
                {activePlayerObj.deck2 || "-"}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold whitespace-normal break-words opacity-85 mt-0.5">
                ({activePlayerObj.skill2 || "-"})
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TOMBOL REPEAT (DITULIS CUKUP "R") */}
      <button
        type="button"
        disabled={(!canRepeat && !isRepeat) || isLocked}
        onClick={() => {
          if (isLocked) return;
          const nextVal = !isRepeat;
          setIsRepeat(nextVal);
        }}
        className={`w-full py-2 px-2 rounded-xl border text-[11px] font-black transition flex items-center justify-center gap-1.5 ${
          isRepeat
            ? "bg-amber-500 text-black border-amber-500 shadow-sm cursor-not-allowed opacity-90"
            : canRepeat && !isLocked
            ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
            : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
        }`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>{isRepeat ? "⚡ REPEAT (R) AKTIF" : "Gunakan R (Repeat)"}</span>
      </button>
    </div>
  );
}
