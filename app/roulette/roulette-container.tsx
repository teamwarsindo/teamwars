"use client";

import { useState, useEffect, useRef } from "react";
import { RouletteWheel } from "./roulette-wheel";
import { TeamItem } from "@/app/api/roulette-state/route";
import Swal from "sweetalert2";

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const [masterTeams, setMasterTeams] = useState<TeamItem[]>([]);
  const [remainingTeams, setRemainingTeams] = useState<TeamItem[]>([]);
  const [groupA, setGroupA] = useState<TeamItem[]>([]);
  const [groupB, setGroupB] = useState<TeamItem[]>([]);
  
  // 🔀 Mode Target Group Manual (Auto / Group A / Group B)
  const [manualGroup, setManualGroup] = useState<"AUTO" | "GROUP_A" | "GROUP_B">("AUTO");

  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [celebrationWinner, setCelebrationWinner] = useState<TeamItem | null>(null);

  const totalSlots = masterTeams.length;
  const halfQuota = Math.ceil(totalSlots / 2);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/roulette-state");
      const data = await res.json();
      if (data) {
        setMasterTeams(data.masterTeams || []);
        setRemainingTeams(data.remainingTeams || []);
        setGroupA(data.groupA || []);
        setGroupB(data.groupB || []);
      }
    } catch (err) {
      console.error("Error fetching state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Load
  useEffect(() => {
    fetchState();
  }, []);

  // ⚡ 2. LIVE REAL-TIME POLLING DI SISI USER (Setiap 2 Detik saat tidak sedang memutar)
  useEffect(() => {
    if (isSpinning) return; // Jangan refresh state saat animasi roda sedang berputar

    const interval = setInterval(() => {
      fetchState();
    }, 2000); // Polling setiap 2 detik secara halus di background

    return () => clearInterval(interval);
  }, [isSpinning]);

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

    // 🔀 Penentuan Group Berdasarkan Pilihan Admin atau Auto
    let target = manualGroup;
    if (target === "AUTO") {
      target = newGroupA.length < halfQuota ? "GROUP_A" : "GROUP_B";
    }

    if (target === "GROUP_A") {
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
    const result = await Swal.fire({
      title: "RESET PENGUNDIAN?",
      html: "Apakah kamu yakin ingin mengosongkan hasil Group A & Group B serta memuat ulang seluruh tim terdaftar?",
      icon: "warning",
      background: "#171717",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3f3f46",
      confirmButtonText: "Ya, Reset Sekarang",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    setRemainingTeams(masterTeams);
    setGroupA([]);
    setGroupB([]);
    setCelebrationWinner(null);
    setIsSpinning(false);

    await fetch("/api/roulette-state", { method: "DELETE" }).catch(() => null);
    setIsLoading(false);

    Swal.fire({
      title: "Berhasil Direset",
      text: "Data pengundian telah berhasil dibersihkan dari Vercel KV.",
      icon: "success",
      background: "#171717",
      color: "#fff",
      confirmButtonColor: "#00F0FF",
    });
  };

  // Menentukan label target group saat ini
  const currentTargetLabel =
    manualGroup === "GROUP_A"
      ? "GROUP A"
      : manualGroup === "GROUP_B"
      ? "GROUP B"
      : groupA.length < halfQuota
      ? "GROUP A (Auto)"
      : "GROUP B (Auto)";

  if (isLoading) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <p className="animate-pulse text-xs font-semibold text-primary">
          ⏳ Memuat Data Tim dari Vercel KV...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      
      {/* 🎊 MODAL PERAYAAN TIM TERPILIH */}
      {celebrationWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-primary bg-card p-8 text-center shadow-[0_0_80px_rgba(0,255,255,0.4)]">
            <span className="inline-block rounded-full bg-primary/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary mb-4">
              🎉 TIM TERPILIH!
            </span>
            
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-2 shadow-inner">
              {celebrationWinner.logo ? (
                <img
                  src={celebrationWinner.logo}
                  alt={celebrationWinner.name}
                  className="h-full w-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.webp";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-neutral-800 text-xs font-bold text-neutral-400">
                  N/A
                </div>
              )}
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
        
        {/* TARGET SLOT DISPLAY */}
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Target Slot: <span className={currentTargetLabel.includes("A") ? "text-cyan-400" : "text-amber-400"}>{currentTargetLabel}</span>
          </span>
        </div>

        {masterTeams.length === 0 ? (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-destructive/40 bg-muted/20 text-center p-6">
            <p className="text-xs font-bold text-destructive">
              ⚠️ Tidak ada data tim pendaftaran ditemukan di KV.
            </p>
          </div>
        ) : remainingTeams.length > 0 ? (
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

        {/* KONTROL ADMIN & SWITCH GROUP */}
        {isAdmin ? (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            
            {/* 🔀 SWITCHER TARGET GROUP MANUAL */}
            <div className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-1">
              <button
                type="button"
                onClick={() => setManualGroup("AUTO")}
                className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition ${
                  manualGroup === "AUTO"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setManualGroup("GROUP_A")}
                className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_A"
                    ? "bg-cyan-500 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Group A
              </button>
              <button
                type="button"
                onClick={() => setManualGroup("GROUP_B")}
                className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_B"
                    ? "bg-amber-500 text-white shadow"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Group B
              </button>
            </div>

            <button
              onClick={handleStartSpin}
              disabled={isSpinning || remainingTeams.length === 0 || masterTeams.length === 0}
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
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-[11px] font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Spectator Mode (Auto Update)</span>
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
            {Array.from({ length: halfQuota || 1 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">Slot #{i + 1}</span>
                {groupA[i] ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-neutral-950 border border-neutral-800 shrink-0">
                      {groupA[i].logo ? (
                        <img
                          src={groupA[i].logo}
                          alt={groupA[i].name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.webp";
                          }}
                        />
                      ) : (
                        <span className="text-[8px] text-neutral-500">N/A</span>
                      )}
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
            {Array.from({ length: Math.max(totalSlots - halfQuota, 1) }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">Slot #{i + 1}</span>
                {groupB[i] ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-neutral-950 border border-neutral-800 shrink-0">
                      {groupB[i].logo ? (
                        <img
                          src={groupB[i].logo}
                          alt={groupB[i].name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logo.webp";
                          }}
                        />
                      ) : (
                        <span className="text-[8px] text-neutral-500">N/A</span>
                      )}
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
  
