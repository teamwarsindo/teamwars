"use client";

import { PlayerDeckInfo } from "./roster-lineup-block";
import { CustomSelect } from "./custom-select";
import { RotateCcw, Lock, Unlock } from "lucide-react";

interface TeamGameInputProps {
  isTeamA: boolean;
  teamName: string;
  teamLogo: string;
  player: string;
  setPlayer: (val: string) => void;
  availableOptions: string[];
  isLocked: boolean;
  setIsLocked: (val: boolean) => void;
  activePlayerObj?: PlayerDeckInfo;
  selectedDeckSlot: "deck1" | "deck2";
  setSelectedDeckSlot: (val: "deck1" | "deck2") => void;
  skill: string;
  repeatCount: number;
  isRepeat: boolean;
  setIsRepeat: (val: boolean) => void;
  canRepeat: boolean;
  deckLostStats?: { deck1Lost: boolean; deck2Lost: boolean };
}

export function TeamGameInput({
  isTeamA,
  teamName,
  teamLogo,
  player,
  setPlayer,
  availableOptions,
  isLocked,
  setIsLocked,
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
  const activeBg = isTeamA ? "bg-primary/15 border-primary text-primary font-bold" : "bg-rose-500/15 border-rose-500 text-rose-500 font-bold";

  return (
    <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/30">
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
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">
            Pemain Bertanding
          </label>
          {isLocked && (
            <button
              type="button"
              onClick={() => setIsLocked(false)}
              className="text-[9px] font-bold text-amber-500 hover:underline flex items-center gap-0.5"
            >
              <Unlock className="h-2.5 w-2.5" /> Buka Kunci
            </button>
          )}
        </div>
        <div className="relative">
          <CustomSelect
            value={player}
            onChange={setPlayer}
            options={availableOptions}
            placeholder={availableOptions.length === 0 ? "-- Semua Pemain Gugur --" : "-- Pilih Pemain --"}
            disabled={availableOptions.length === 0 || isLocked}
          />
          {isLocked && (
            <span className="absolute right-8 top-2.5 text-[10px] font-extrabold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <Lock className="h-3 w-3" /> Winner Locked
            </span>
          )}
        </div>
      </div>

      {/* DISPLAY STATUS DECK */}
      {activePlayerObj && (
        <div className="space-y-1.5 p-2.5 bg-background rounded-xl border border-border/50">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase">
            Status Deck Pemain
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={deckLostStats?.deck1Lost && !isRepeat}
              onClick={() => setSelectedDeckSlot("deck1")}
              className={`p-2 rounded-lg border text-left transition ${
                selectedDeckSlot === "deck1"
                  ? activeBg
                  : deckLostStats?.deck1Lost
                  ? "bg-muted/50 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground"
              }`}
            >
              <span className="block text-[9px] opacity-70">
                DECK 1 {deckLostStats?.deck1Lost && !isRepeat ? "(KALAH)" : ""}
              </span>
              <span className="block truncate font-extrabold text-[11px]">
                {activePlayerObj.deck1 || "-"}
              </span>
            </button>

            <button
              type="button"
              disabled={isRepeat || (!deckLostStats?.deck1Lost && selectedDeckSlot === "deck1")}
              onClick={() => setSelectedDeckSlot("deck2")}
              className={`p-2 rounded-lg border text-left transition ${
                selectedDeckSlot === "deck2"
                  ? activeBg
                  : isRepeat
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500/50 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground"
              }`}
            >
              <span className="block text-[9px] opacity-70">
                DECK 2 {isRepeat ? "(HANGUS)" : ""}
              </span>
              <span className="block truncate font-extrabold text-[11px]">
                {activePlayerObj.deck2 || "-"}
              </span>
            </button>
          </div>

          <div className="pt-1 text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
            <span>Skill Active:</span>
            <span className="font-bold text-foreground">{skill || "-"}</span>
          </div>
        </div>
      )}

      {/* TOMBOL REPEAT */}
      <button
        type="button"
        disabled={!canRepeat}
        onClick={() => {
          const nextVal = !isRepeat;
          setIsRepeat(nextVal);
          if (nextVal) setSelectedDeckSlot("deck1");
        }}
        className={`w-full py-2 px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
          isRepeat
            ? "bg-amber-500/20 border-amber-500 text-amber-500 font-extrabold"
            : canRepeat
            ? "bg-background border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
            : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
        }`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>
          {isRepeat
            ? "⚡ REPEAT AKTIF (Mengulang Deck 1)"
            : canRepeat
            ? "Gunakan REPEAT"
            : "REPEAT (Belum Memenuhi Syarat)"}
        </span>
      </button>
    </div>
  );
  }
  
