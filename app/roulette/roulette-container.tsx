"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { RouletteWheel } from "./roulette-wheel";
import { TeamItem } from "@/app/api/roulette-state/route";

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const [masterTeams, setMasterTeams] = useState<TeamItem[]>([]);
  const [remainingTeams, setRemainingTeams] = useState<TeamItem[]>([]);
  const [groupA, setGroupA] = useState<TeamItem[]>([]);
  const [groupB, setGroupB] = useState<TeamItem[]>([]);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [celebrationWinner, setCelebrationWinner] = useState<TeamItem | null>(null);

  const totalSlots = masterTeams.length || 10;
  const halfQuota = Math.ceil(totalSlots / 2);

  // Ambil Data dari Vercel KV saat halaman dibuka
  useEffect(() => {
    fetch("/api/roulette-state")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setMasterTeams(data.masterTeams || []);
          setRemainingTeams(data.remainingTeams || []);
          setGroupA(data.groupA || []);
          setGroupB(data.groupB || []);
        }
      })
      .catch(() => null);
  }, []);

  // Simpan Perubahan ke Vercel KV
  const saveToKV = async (newRemaining: TeamItem[], newGroupA: TeamItem[], newGroupB: TeamItem[]) => {
    await fetch("/api/roulette-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remainingTeams: newRemaining, groupA: newGroupA, groupB: newGroupB }),
    }).catch(() => null);
  };

  const handleStartSpin = () => {
    if (isSpinning || remainingTeams.length === 0) return;
    setCelebrationWinner(null);
    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    setWinningIndex(randomIndex);
    setIsSpinning(true);
  };

  const handleSpinEnd = () => {
    if (winningIndex === null) return;

    const selectedTeam = remainingTeams[winningIndex];
    const newRemaining = remainingTeams.filter((_, idx) => idx !== winningIndex);
    
    let newGroupA = [...groupA];
    let newGroupB = [...groupB];

    if (newGroupA.length < halfQuota) {
      newGroupA.push(selectedTeam);
    } else {
      newGroupB.push(selectedTeam);
    }

    setRemainingTeams(newRemaining);
    setGroupA(newGroupA);
    setGroupB(newGroupB);
    
    setIsSpinning(false);
    setWinningIndex(null);
    setCelebrationWinner(selectedTeam);

    saveToKV(newRemaining, newGroupA, newGroupB);
  };

  const handleReset = async () => {
    if (confirm("Reset ulang hasil pengundian dan hapus data di Vercel KV?")) {
      setRemainingTeams(masterTeams);
      setGroupA([]);
      setGroupB([]);
      setCelebrationWinner(null);
      setIsSpinning(false);

      await fetch("/api/roulette-state", { method: "DELETE" }).catch(() => null);
    }
  };

  const targetGroup = groupA.length < halfQuota ? "GROUP A" : "GROUP B";

  return (
    <div className="relative flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      
      {/* 🎊 MODAL PERAYAAN TIM TERPILIH */}
      {celebrationWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-primary bg-card p-8 text-center shadow-[0_0_80px_rgba(0,255,255,0.4)]">
            <span className="inline-block rounded-full bg-primary/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary mb-4">
              🎉 TIM TERPILIH!
            </span>
            
            {/* Logo Tim Besar */}
            <div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-2xl border border-primary/40 bg-muted/30 p-2">
              <Image
                src={celebrationWinner.logo}
                alt={celebrationWinner.name}
                fill
                className="object-contain"
              />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-2">
              {celebrationWinner.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Berhasil masuk ke slot <span className="font-bold text-primary">{groupA.some(t => t.name === celebrationWinner.name) ? "GROUP A" : "GROUP B"}</span>
            </p>
            
            <button
              onClick={() => setCelebrationWinner(null)}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer"
            >
              LANJUTKAN DRAW ➔
            </button>
          </div>
        </div>
      )}

      {/* AREA ROULETTE */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Target Slot: <span className={groupA.length < halfQuota ? "text-cyan-400" : "text-amber-400"}>{targetGroup}</span>
          </span>
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
              className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isSpinning ? "SPINNING..." : "🎯 PUTAR ROULETTE"}
            </button>
            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              🔄 RESET DRAW (HAPUS DB KV)
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
                {groupA[i] ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-5 w-5 overflow-hidden rounded-full border border-primary/20">
                      <Image src={groupA[i].logo} alt={groupA[i].name} fill className="object-cover" />
                    </div>
                    <span className="font-bold text-foreground">{groupA[i].name}</span>
                  </div>
                ) : (
                  <span className="italic text-muted-foreground/40">Menunggu Draw...</span>
                )}
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
                {groupB[i] ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-5 w-5 overflow-hidden rounded-full border border-primary/20">
                      <Image src={groupB[i].logo} alt={groupB[i].name} fill className="object-cover" />
                    </div>
                    <span className="font-bold text-foreground">{groupB[i].name}</span>
                  </div>
                ) : (
                  <span className="italic text-muted-foreground/40">Menunggu Draw...</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
      }
