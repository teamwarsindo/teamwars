"use client";

import { useState, useEffect, useRef } from "react";
import { RouletteWheel } from "./roulette-wheel";
import { RouletteCelebrationModal } from "./roulette-celebration-modal";
import { RouletteGroupList } from "./roulette-group-list";
import { TeamItem } from "@/app/api/roulette-state/route";
import Swal from "sweetalert2";

export function RouletteContainer({ isAdmin }: { isAdmin: boolean }) {
  const [masterTeams, setMasterTeams] = useState<TeamItem[]>([]);
  const [remainingTeams, setRemainingTeams] = useState<TeamItem[]>([]);
  const [groupA, setGroupA] = useState<TeamItem[]>([]);
  const [groupB, setGroupB] = useState<TeamItem[]>([]);
  
  const [manualGroup, setManualGroup] = useState<"GROUP_A" | "GROUP_B">("GROUP_A");
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [serverTargetAngle, setServerTargetAngle] = useState<number | null>(null);
  const [celebrationWinner, setCelebrationWinner] = useState<TeamItem | null>(null);
  
  const lastSpinTimeRef = useRef<number | null>(null);
  const [spinStartTimeMs, setSpinStartTimeMs] = useState<number | undefined>(undefined);

  const totalSlots = masterTeams.length;
  const quotaA = Math.ceil(totalSlots / 2);
  const quotaB = totalSlots - quotaA;

  const isGroupAFull = groupA.length >= quotaA;
  const isGroupBFull = groupB.length >= quotaB;
  const isDrawFinished = remainingTeams.length === 0 && masterTeams.length > 0;

  useEffect(() => {
    if (celebrationWinner) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [celebrationWinner]);

  useEffect(() => {
    if (isGroupAFull && !isGroupBFull) {
      setManualGroup("GROUP_B");
    } else if (isGroupBFull && !isGroupAFull) {
      setManualGroup("GROUP_A");
    }
  }, [groupA.length, groupB.length, quotaA, quotaB, isGroupAFull, isGroupBFull]);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/roulette-state");
      const data = await res.json();
      
      if (data) {
        const fetchedMaster: TeamItem[] = data.masterTeams || [];
        const fetchedGroupA: TeamItem[] = data.groupA || [];
        const fetchedGroupB: TeamItem[] = data.groupB || [];

        setMasterTeams(fetchedMaster);
        
        if (!isAdmin && data.selectedTargetGroup) {
          setManualGroup(data.selectedTargetGroup);
        }

        if (!isSpinning) {
          const allocatedNames = new Set([
            ...fetchedGroupA.map((t) => t.name),
            ...fetchedGroupB.map((t) => t.name),
          ]);

          const syncedRemaining = (data.remainingTeams && data.remainingTeams.length > 0)
            ? data.remainingTeams.filter((t: TeamItem) => !allocatedNames.has(t.name))
            : fetchedMaster.filter((t: TeamItem) => !allocatedNames.has(t.name));

          setRemainingTeams(syncedRemaining);
          setGroupA(fetchedGroupA);
          setGroupB(fetchedGroupB);
        }

        if (!isAdmin && !isSpinning) {
          setCelebrationWinner(data.celebrationWinner || null);
        }

        if (!isAdmin && data.spinEvent) {
          const spinId = data.spinEvent.startTime;

          if (spinId !== lastSpinTimeRef.current) {
            const now = Date.now();
            const elapsed = now - data.spinEvent.startTime;

            if (elapsed < data.spinEvent.durationMs) {
              lastSpinTimeRef.current = spinId;
              setWinningIndex(data.spinEvent.winningIndex);
              setServerTargetAngle(data.spinEvent.targetAngle);
              setCelebrationWinner(null);

              const localStartMs = performance.now() - elapsed;
              setSpinStartTimeMs(localStartMs);
              setIsSpinning(true);
            }
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
    logData: any = null,
    currentGroupSelection: "GROUP_A" | "GROUP_B" = manualGroup
  ) => {
    await fetch("/api/roulette-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remainingTeams: newRemaining,
        groupA: newGroupA,
        groupB: newGroupB,
        selectedTargetGroup: currentGroupSelection,
        celebrationWinner: winner,
        spinEvent: spinEventData,
        newLog: logData,
      }),
    }).catch(() => null);
  };

  const handleSwitchGroup = (group: "GROUP_A" | "GROUP_B") => {
    if (isSpinning || isDrawFinished) return;
    if (group === "GROUP_A" && isGroupAFull) return;
    if (group === "GROUP_B" && isGroupBFull) return;

    setManualGroup(group);
    saveStateToKV(remainingTeams, groupA, groupB, celebrationWinner, null, null, group);
  };

  const handleStartSpin = () => {
    if (isSpinning || remainingTeams.length === 0) return;

    let activeGroup = manualGroup;
    if (activeGroup === "GROUP_A" && isGroupAFull) {
      if (isGroupBFull) {
        Swal.fire({ icon: "error", title: "Kuota Penuh", text: "Seluruh grup A dan B sudah penuh!" });
        return;
      }
      activeGroup = "GROUP_B";
      setManualGroup("GROUP_B");
    } else if (activeGroup === "GROUP_B" && isGroupBFull) {
      if (isGroupAFull) {
        Swal.fire({ icon: "error", title: "Kuota Penuh", text: "Seluruh grup A dan B sudah penuh!" });
        return;
      }
      activeGroup = "GROUP_A";
      setManualGroup("GROUP_A");
    }
    
    setCelebrationWinner(null);
    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    const target: "Group A" | "Group B" = activeGroup === "GROUP_A" ? "Group A" : "Group B";

    const numSlices = remainingTeams.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const sliceMiddle = (randomIndex + 0.5) * sliceAngle;
    const exactTargetAngle = 10 * Math.PI - sliceMiddle;

    setWinningIndex(randomIndex);
    setServerTargetAngle(exactTargetAngle);
    setSpinStartTimeMs(performance.now());
    setIsSpinning(true);

    const spinData = {
      winningIndex: randomIndex,
      targetAngle: exactTargetAngle,
      startTime: Date.now(),
      durationMs: 4000,
      targetGroup: target,
    };

    saveStateToKV(remainingTeams, groupA, groupB, null, spinData, null, activeGroup);
  };

  const handleSpinEnd = () => {
    if (winningIndex === null) return;

    const selectedTeam = remainingTeams[winningIndex];
    if (!selectedTeam) return;

    const newRemaining = remainingTeams.filter((_, idx) => idx !== winningIndex);
    let newGroupA = [...groupA];
    let newGroupB = [...groupB];

    const activeGroup = manualGroup;
    const groupName: "Group A" | "Group B" = activeGroup === "GROUP_A" ? "Group A" : "Group B";

    if (activeGroup === "GROUP_A") {
      newGroupA.push(selectedTeam);
    } else {
      newGroupB.push(selectedTeam);
    }

    const slotNum = activeGroup === "GROUP_A" ? newGroupA.length : newGroupB.length;

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

      saveStateToKV(newRemaining, newGroupA, newGroupB, selectedTeam, null, newLogItem, activeGroup);
    }
  };

  const handleCloseCelebration = () => {
    setCelebrationWinner(null);
    if (isAdmin) {
      saveStateToKV(remainingTeams, groupA, groupB, null, null, null, manualGroup);
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

  const currentTargetLabel = manualGroup === "GROUP_A" ? "Group A" : "Group B";

  if (isLoading) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <p className="animate-pulse text-xs font-semibold text-primary">
          ⏳ Memuat Data Pengundian dari Server...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      
      {celebrationWinner && (
        <RouletteCelebrationModal
          celebrationWinner={celebrationWinner}
          groupA={groupA}
          isAdmin={isAdmin}
          onClose={handleCloseCelebration}
        />
      )}

      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Alokasi Grup: <span className={currentTargetLabel.includes("A") ? "text-sky-400" : "text-amber-400"}>{currentTargetLabel}</span>
          </span>
        </div>

        {masterTeams.length === 0 ? (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-destructive/40 bg-muted/20 text-center p-6">
            <p className="text-xs font-bold text-destructive">
              ⚠️ Tidak ada data tim terdaftar.
            </p>
          </div>
        ) : remainingTeams.length > 0 ? (
          <RouletteWheel
            teams={remainingTeams}
            winningIndex={winningIndex}
            isSpinning={isSpinning}
            targetAngleServer={serverTargetAngle}
            startTimeMs={spinStartTimeMs}
            onSpinEnd={handleSpinEnd}
          />
        ) : (
          <div className="flex h-[360px] w-[360px] items-center justify-center rounded-full border border-dashed border-primary/40 bg-muted/20 text-center p-6">
            <p className="text-sm font-bold text-primary">🎉 PENGUNDIAN GRUP SELESAI!</p>
          </div>
        )}

        {isAdmin ? (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => handleSwitchGroup("GROUP_A")}
                disabled={isSpinning || isGroupAFull || isDrawFinished}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition disabled:opacity-30 disabled:cursor-not-allowed ${
                  manualGroup === "GROUP_A"
                    ? "bg-sky-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group A {isGroupAFull ? "(Full)" : ""}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchGroup("GROUP_B")}
                disabled={isSpinning || isGroupBFull || isDrawFinished}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition disabled:opacity-30 disabled:cursor-not-allowed ${
                  manualGroup === "GROUP_B"
                    ? "bg-amber-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Group B {isGroupBFull ? "(Full)" : ""}
              </button>
            </div>

            <button
              onClick={handleStartSpin}
              disabled={isSpinning || isDrawFinished || masterTeams.length === 0}
              className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isSpinning ? "MEMUTAR PENGUNDIAN..." : isDrawFinished ? "PENGUNDIAN SELESAI" : "🎯 MULAI PENGUNDIAN"}
            </button>
            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/20 cursor-pointer disabled:opacity-50"
            >
              🔄 RESET PENGUNDIAN
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-xs font-bold text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>SIARAN PENGUNDIAN LANGSUNG</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isSpinning ? "⚡ Pengundian sedang berjalan oleh Panitia..." : "Menunggu pengundian selanjutnya..."}
            </p>
          </div>
        )}
      </div>

      <RouletteGroupList
        groupA={groupA}
        groupB={groupB}
        quotaA={quotaA}
        quotaB={quotaB}
      />

    </div>
  );
            }
