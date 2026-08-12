"use client";

import { PlayerDeckInfo } from "./roster-lineup-block";
import { CustomSelect } from "./custom-select";
import { RotateCcw, Lock, Play, Pause, RefreshCw, AlertTriangle } from "lucide-react";

interface TeamGameInputProps {
  isTeamA: boolean;
  teamName: string;
  teamLogo: string;
  player: string;
  setPlayer: (val: string) => void;
  availableOptions: string[];
  isLocked: boolean;
  isLineupLocked: boolean;
  activePlayerObj?: PlayerDeckInfo;
  selectedDeckSlot: "deck1" | "deck2";
  setSelectedDeckSlot: (val: "deck1" | "deck2") => void;
  repeatCount: number;
  isRepeat: boolean;
  setIsRepeat: (val: boolean) => void;
  canRepeat: boolean;
  deckLostStats?: {
    deck1Lost: boolean;
    deck2Lost: boolean;
  };
  warningCount: number;
  isTechnicalLoss: boolean;
  setIsTechnicalLoss: (val: boolean) => void;
  // Timer Props
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
}

export function TeamGameInput({
  isTeamA,
  teamName,
  teamLogo,
  player,
  setPlayer,
  availableOptions,
  isLocked,
  isLineupLocked,
  activePlayerObj,
  selectedDeckSlot,
  setSelectedDeckSlot,
  repeatCount,
  isRepeat,
  setIsRepeat,
  canRepeat,
  deckLostStats,
  warningCount,
  isTechnicalLoss,
  setIsTechnicalLoss,
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
}: TeamGameInputProps) {
  const textColor = isTeamA ? "text-primary" : "text-rose-500";
  const activeBg = isTeamA
    ? "bg-primary/15 border-primary text-primary font-bold"
    : "bg-rose-500/15 border-rose-500 text-rose-500 font-bold";

  const placeholderText = !isLineupLocked
    ? "-- Kunci Lineup Dulu --"
    : availableOptions.length === 0
    ? "-- Semua Pemain Gugur --"
    : "-- Pilih Pemain --";

  // Format Waktu MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/30">
      {/* HEADER TIM & STATUS WARNING */}
      <div className="flex items-center justify-between pb-1 border-b border-border/20">
        <div className={`flex items-center gap-1.5 font-black uppercase text-xs truncate max-w-[150px] ${textColor}`}>
          <img src={teamLogo || "/logo.webp"} alt="" className="h-4 w-4 object-contain shrink-0" />
          <span className="truncate">{teamName}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          {warningCount > 0 && (
            <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black">
              <AlertTriangle className="h-2.5 w-2.5" /> W:{warningCount}
            </span>
          )}
          <span className="text-muted-foreground shrink-0">
            Repeat: {repeatCount}/2
          </span>
        </div>
      </div>

      {/* ⏱️ WIDGET TIMER KONTROL TIM (15 MINS / OVERTIME 3 MINS) */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-background border border-border/40 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Timer:</span>
          <span className={`font-mono text-sm font-black tracking-wider ${timerSeconds <= 60 ? "text-rose-500 animate-pulse" : timerSeconds <= 300 ? "text-amber-500" : "text-foreground"}`}>
            {formatTime(timerSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleTimer}
            className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
              isTimerRunning
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isTimerRunning ? "Pause" : "Start"}</span>
          </button>
          <button
            type="button"
            onClick={onResetTimer}
            className="p-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition cursor-pointer"
            title="Reset Timer ke Waktu Awal"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
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
            placeholder={placeholderText}
            disabled={!isLineupLocked || availableOptions.length === 0 || isLocked}
          />
          {isLocked && (
            <span className="absolute right-8 top-2 text-[10px] font-extrabold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Lock className="h-3 w-3" /> Sedang Bertanding
            </span>
          )}
        </div>
      </div>

      {/* DISPLAY DECK PEMAIN */}
      {activePlayerObj && (
        <div className="space-y-1.5 p-2.5 rounded-xl border bg-background border-border/50">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase">
              Pilihan Deck Pemain
            </label>
            <div className="flex items-center gap-1">
              {isTechnicalLoss && (
                <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">
                  TL (Technical Loss)
                </span>
              )}
              {isRepeat && (
                <span className="text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase">
                  ⚡ Mode Repeat
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* DECK 1 */}
            <button
              type="button"
              disabled={isLocked || (deckLostStats?.deck1Lost && !isRepeat)}
              onClick={() => setSelectedDeckSlot("deck1")}
              className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                selectedDeckSlot === "deck1"
                  ? isRepeat
                    ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                    : activeBg
                  : deckLostStats?.deck1Lost
                  ? "bg-muted/50 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs leading-tight whitespace-normal break-words">
                  {activePlayerObj.deck1 || "-"}
                </div>
                <div className="text-[9px] text-muted-foreground font-semibold whitespace-normal break-words opacity-85 mt-0.5">
                  ({activePlayerObj.skill1 || "-"})
                </div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-border/20">
                {selectedDeckSlot === "deck1" && (
                  <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded inline-block">
                    🟢 Digunakan
                  </span>
                )}
                {deckLostStats?.deck1Lost && !isRepeat && (
                  <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded inline-block">
                    ❌ Kalah
                  </span>
                )}
              </div>
            </button>

            {/* DECK 2 */}
            <button
              type="button"
              disabled={isLocked || isRepeat || deckLostStats?.deck2Lost}
              onClick={() => setSelectedDeckSlot("deck2")}
              className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                selectedDeckSlot === "deck2"
                  ? activeBg
                  : isRepeat
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500/50 line-through cursor-not-allowed"
                  : deckLostStats?.deck2Lost
                  ? "bg-muted/50 border-border/30 text-muted-foreground/40 line-through cursor-not-allowed"
                  : "bg-muted/30 border-border text-foreground hover:bg-muted cursor-pointer"
              }`}
            >
              <div>
                <div className="font-extrabold text-xs leading-tight whitespace-normal break-words">
                  {activePlayerObj.deck2 || "-"}
                </div>
                <div className="text-[9px] text-muted-foreground font-semibold whitespace-normal break-words opacity-85 mt-0.5">
                  ({activePlayerObj.skill2 || "-"})
                </div>
              </div>

              <div className="mt-1.5 pt-1 border-t border-border/20">
                {selectedDeckSlot === "deck2" && !isRepeat && (
                  <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded inline-block">
                    🟢 Digunakan
                  </span>
                )}
                {isRepeat && (
                  <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded inline-block">
                    Hangus
                  </span>
                )}
                {deckLostStats?.deck2Lost && (
                  <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded inline-block">
                    ❌ Kalah
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TOMBOL REPEAT & TECHNICAL LOSS */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!canRepeat && !isRepeat}
          onClick={() => {
            const nextVal = !isRepeat;
            setIsRepeat(nextVal);
            if (nextVal) setSelectedDeckSlot("deck1");
          }}
          className={`py-2 px-2 rounded-xl border text-[10px] font-black transition flex items-center justify-center gap-1 ${
            isRepeat
              ? "bg-amber-500 text-black border-amber-500 shadow-sm cursor-pointer"
              : canRepeat
              ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
              : "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="h-3 w-3" />
          <span>{isRepeat ? "⚡ R (AKTIF)" : "R"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTechnicalLoss(!isTechnicalLoss)}
          className={`py-2 px-2 rounded-xl border text-[10px] font-black transition flex items-center justify-center gap-1 ${
            isTechnicalLoss
              ? "bg-rose-500 text-white border-rose-500 shadow-sm cursor-pointer"
              : "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{isTechnicalLoss ? "TL (AKTIF)" : "TL"}</span>
        </button>
      </div>
    </div>
  );
}