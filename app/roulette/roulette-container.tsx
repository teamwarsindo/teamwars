"use client";

import { useState } from "react";
import { RouletteWheel } from "./roulette-wheel";

// Tim Terdaftar (Bisa ditarik dari API/Redis)
const INITIAL_TEAMS = [
  "GOD", "CHAM", "STAR", "NEXUS", "VALOR", 
  "ECLIPSE", "PHOENIX", "HYDRA", "TITAN", "APEX"
];

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const [remainingTeams, setRemainingTeams] = useState<string[]>(INITIAL_TEAMS);
  const [groupA, setGroupA] = useState<string[]>([]);
  const [groupB, setGroupB] = useState<string[]>([]);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const totalSlots = INITIAL_TEAMS.length;
  const halfQuota = Math.ceil(totalSlots / 2);

  const handleStartSpin = () => {
    if (isSpinning || remainingTeams.length === 0) return;

    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    setWinningIndex(randomIndex);
    setIsSpinning(true);
  };

  const handleSpinEnd = () => {
    if (winningIndex === null) return;

    const selectedTeam = remainingTeams[winningIndex];
    setLastSelected(selectedTeam);

    const newRemaining = remainingTeams.filter((_, idx) => idx !== winningIndex);
    setRemainingTeams(newRemaining);

    // Setengah awal masuk Group A, sisanya masuk Group B
    if (groupA.length < halfQuota) {
      setGroupA((prev) => [...prev, selectedTeam]);
    } else {
      setGroupB((prev) => [...prev, selectedTeam]);
    }

    setIsSpinning(false);
    setWinningIndex(null);
  };

  const handleReset = () => {
    if (confirm("Reset ulang seluruh hasil pengundian group?")) {
      setRemainingTeams(INITIAL_TEAMS);
      setGroupA([]);
      setGroupB([]);
      setLastSelected(null);
      setIsSpinning(false);
    }
  };

  const targetGroup = groupA.length < halfQuota ? "GROUP A" : "GROUP B";

  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      
      {/* AREA ROULETTE */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Target Slot: <span className={groupA.length < halfQuota ? "text-cyan-400" : "text-amber-400"}>{targetGroup}</span>
          </span>
          {lastSelected && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Tim Terakhir Terpilih: <span className="text-foreground underline">{lastSelected}</span>
            </p>
          )}
        </div>

        {remainingTeams.length > 0 ? (
          <RouletteWheel
            teams={remainingTeams}
            winningIndex={winningIndex}
            isSpinning={isSpinning}
            onSpinEnd={handleSpinEnd}
          />
        ) : (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-primary/40 bg-muted/20 text-center p-6">
            <p className="text-sm font-bold text-primary">🎉 PENGUNDIAN GROUP SELESAI!</p>
          </div>
        )}

        {/* KONTROL ADMIN */}
        {isAdmin ? (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={handleStartSpin}
              disabled={isSpinning || remainingTeams.length === 0}
              className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSpinning ? "SPINNING..." : "🎯 PUTAR ROULETTE"}
            </button>
            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20"
            >
              🔄 RESET DRAW
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-muted/50 px-4 py-2 text-[11px] font-medium text-muted-foreground">
            👁️ Mode Penonton (Live Spectator)
          </div>
        )}
      </div>

      {/* HASIL GROUP A & GROUP B */}
      <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {/* GROUP A */}
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <h3 className="font-extrabold text-cyan-400">GROUP A</h3>
            <span className="text-[10px] font-bold text-muted-foreground">
              {groupA.length} / {halfQuota} TIM
            </span>
          </div>
          <ul className="space-y-2">
            {Array.from({ length: halfQuota }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">Slot #{i + 1}</span>
                <span className="font-bold text-foreground">
                  {groupA[i] || <span className="italic text-muted-foreground/40">Menunggu Draw...</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* GROUP B */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between border-b border-amber-500/20 pb-2">
            <h3 className="font-extrabold text-amber-400">GROUP B</h3>
            <span className="text-[10px] font-bold text-muted-foreground">
              {groupB.length} / {totalSlots - halfQuota} TIM
            </span>
          </div>
          <ul className="space-y-2">
            {Array.from({ length: totalSlots - halfQuota }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">Slot #{i + 1}</span>
                <span className="font-bold text-foreground">
                  {groupB[i] || <span className="italic text-muted-foreground/40">Menunggu Draw...</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}
