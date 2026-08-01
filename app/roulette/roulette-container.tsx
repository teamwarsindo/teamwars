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
  
  // 🔀 Hanya ada pilihan GROUP_A dan GROUP_B
  const [manualGroup, setManualGroup] = useState<"GROUP_A" | "GROUP_B">("GROUP_A");
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [celebrationWinner, setCelebrationWinner] = useState<TeamItem | null>(null);
  
  const lastProcessedSpinRef = useRef<number | null>(null);
  const [spinStartTimeMs, setSpinStartTimeMs] = useState<number | undefined>(undefined);

  const totalSlots = masterTeams.length;
  const halfQuota = Math.ceil(totalSlots / 2);

  // Otomatis pindahkan target switcher ke Group B jika Group A sudah penuh
  useEffect(() => {
    if (groupA.length >= halfQuota && groupA.length > 0) {
      setManualGroup("GROUP_B");
    }
  }, [groupA.length, halfQuota]);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/roulette-state");
      const data = await res.json();
      
      if (data) {
        setMasterTeams(data.masterTeams || []);
        
        if (!isSpinning) {
          setRemainingTeams(data.remainingTeams || []);
          setGroupA(data.groupA || []);
          setGroupB(data.groupB || []);
        }

        if (!isAdmin) {
          if (!data.celebrationWinner) {
            setCelebrationWinner(null);
          } else if (!isSpinning && data.celebrationWinner) {
            setCelebrationWinner(data.celebrationWinner);
          }
        }

        if (!isAdmin && data.spinEvent && data.spinEvent.startTime !== lastProcessedSpinRef.current) {
          const now = Date.now();
          const elapsed = now - data.spinEvent.startTime;

          if (elapsed < data.spinEvent.durationMs) {
            lastProcessedSpinRef.current = data.spinEvent.startTime;
            setWinningIndex(data.spinEvent.winningIndex);
            
            const localStartMs = performance.now() - elapsed;
            setSpinStartTimeMs(localStartMs);
            setIsSpinning(true);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchState();
    }, 1000);

    return () => clearInterval(interval);
  }, [isSpinning, isAdmin]);

  const saveStateToKV = async (
    newRemaining: TeamItem[],
    newGroupA: TeamItem[],
    newGroupB: TeamItem[],
    winner: TeamItem | null,
    spinEventData: any = null,
    logData: any = null
  ) => {
    await fetch("/api/roulette-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remainingTeams: newRemaining,
        groupA: newGroupA,
        groupB: newGroupB,
        celebrationWinner: winner,
        spinEvent: spinEventData,
        newLog: logData,
      }),
    }).catch(() => null);
  };

  const handleStartSpin = () => {
    if (isSpinning || remainingTeams.length === 0) return;
    
    setCelebrationWinner(null);
    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    const target: "Group A" | "Group B" = manualGroup === "GROUP_A" ? "Group A" : "Group B";

    setWinningIndex(randomIndex);
    setSpinStartTimeMs(performance.now());
    setIsSpinning(true);

    const spinData = {
      winningIndex: randomIndex,
      startTime: Date.now(),
      durationMs: 4000,
      targetGroup: target,
    };

    saveStateToKV(remainingTeams, groupA, groupB, null, spinData, null);
  };

  const handleSpinEnd = () => {
    if (winningIndex === null) return;

    const selectedTeam = remainingTeams[winningIndex];
    if (!selectedTeam) return;

    const newRemaining = remainingTeams.filter((_, idx) => idx !== winningIndex);
    let newGroupA = [...groupA];
    let newGroupB = [...groupB];

    const groupName: "Group A" | "Group B" = manualGroup === "GROUP_A" ? "Group A" : "Group B";
    const slotNum = manualGroup === "GROUP_A" ? newGroupA.length + 1 : newGroupB.length + 1;

    if (manualGroup === "GROUP_A") {
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

    if (isAdmin) {
      const newLogItem = {
        id: `${Date.now()}-${selectedTeam.name.replace(/\s+/g, '')}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
        teamName: selectedTeam.name,
        teamLogo: selectedTeam.logo,
        targetGroup: groupName,
        slotNumber: slotNum,
      };

      saveStateToKV(newRemaining, newGroupA, newGroupB, selectedTeam, null, newLogItem);
    }
  };

  const handleCloseCelebration = () => {
    setCelebrationWinner(null);
    if (isAdmin) {
      saveStateToKV(remainingTeams, groupA, groupB, null, null, null);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "RESET PENGUNDIAN?",
      html: "Apakah kamu yakin ingin mengosongkan hasil Group A & Group B dan membersihkan log di Discord?",
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
    setManualGroup("GROUP_A");

    await fetch("/api/roulette-state", { method: "DELETE" }).catch(() => null);
    setIsLoading(false);

    Swal.fire({
      title: "Berhasil Direset",
      text: "Seluruh tim dikembalikan ke roda dan log di Discord telah dibersihkan.",
      icon: "success",
      background: "#171717",
      color: "#fff",
      confirmButtonColor: "#00F0FF",
    });
  };

  // Label Murni "Group A" atau "Group B"
  const currentTargetLabel = manualGroup === "GROUP_A" ? "Group A" : "Group B";

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
      
      {/* 🎊 MODAL POPUP TIM TERPILIH */}
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
              Berhasil masuk ke slot <span className="font-bold text-primary">{groupA.some(t => t.name === celebrationWinner.name) ? "Group A" : "Group B"}</span>
            </p>
            
            {isAdmin ? (
              <button
                onClick={handleCloseCelebration}
                className="w-full rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer"
              >
                LANJUTKAN DRAW ➔
              </button>
            ) : (
              <div className="rounded-xl bg-muted/40 p-3 text-xs font-medium text-muted-foreground animate-pulse">
                ⏳ Menunggu Admin Melanjutkan Draw...
              </div>
            )}
          </div>
        </div>
      )}

      {/* AREA ROULETTE */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        
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
            startTimeMs={spinStartTimeMs}
            onSpinEnd={handleSpinEnd}
          />
        ) : (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-primary/40 bg-muted/20 text-center p-6">
            <p className="text-sm font-bold text-primary">🎉 PENGUNDIAN GROUP SELESAI!</p>
          </div>
        )}

        {/* KONTROL ADMIN (HANYA SWITCH GROUP A & GROUP B) */}
        {isAdmin ? (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <div className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-1">
              <button
                type="button"
                onClick={() => setManualGroup("GROUP_A")}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
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
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
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
              {isSpinning ? "SPINNING LIVE..." : "🎯 PUTAR ROULETTE"}
            </button>
            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              🔄 RESET DRAW
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>LIVE SIARAN PENGUNDIAN</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isSpinning ? "⚡ Roda sedang diputar oleh Panitia..." : "Menunggu putaran selanjutnya..."}
            </p>
          </div>
        )}
      </div>

      {/* HASIL GROUP A & GROUP B */}
      <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
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
                    
