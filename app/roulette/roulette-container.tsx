"use client";

import { useState, useEffect, useRef } from "react";
import { RouletteWheel } from "./roulette-wheel";
import { TeamItem } from "@/app/api/roulette-state/route";
import { GroupCard } from "./components/group-card";
import { WinnerModal } from "./components/winner-modal";
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

  const quotaGroupA = Math.ceil(masterTeams.length / 2);
  const quotaGroupB = masterTeams.length - quotaGroupA;

  const isGroupAFull = groupA.length >= quotaGroupA && quotaGroupA > 0;
  const isGroupBFull = groupB.length >= quotaGroupB && quotaGroupB > 0;
  const isCurrentGroupFull = (manualGroup === "GROUP_A" && isGroupAFull) || (manualGroup === "GROUP_B" && isGroupBFull);

  // Auto-switch grup jika salah satu grup penuh
  useEffect(() => {
    if (manualGroup === "GROUP_A" && isGroupAFull && !isGroupBFull) setManualGroup("GROUP_B");
    else if (manualGroup === "GROUP_B" && isGroupBFull && !isGroupAFull) setManualGroup("GROUP_A");
  }, [groupA.length, groupB.length, isGroupAFull, isGroupBFull, manualGroup]);

  // Sync state dari Vercel KV Redis
  const fetchState = async () => {
    try {
      const res = await fetch("/api/roulette-state");
      const data = await res.json();
      if (!data) return;

      setMasterTeams(data.masterTeams || []);
      if (!isAdmin && data.selectedTargetGroup) setManualGroup(data.selectedTargetGroup);

      if (!isSpinning) {
        const allocatedNames = new Set([...(data.groupA || []).map((t: TeamItem) => t.name), ...(data.groupB || []).map((t: TeamItem) => t.name)]);
        const syncedRemaining = (data.remainingTeams || []).filter((t: TeamItem) => !allocatedNames.has(t.name));
        
        setRemainingTeams(syncedRemaining);
        setGroupA(data.groupA || []);
        setGroupB(data.groupB || []);
        if (!isAdmin) setCelebrationWinner(data.celebrationWinner || null);
      }

      if (!isAdmin && data.spinEvent && data.spinEvent.startTime !== lastSpinTimeRef.current) {
        const elapsed = Date.now() - data.spinEvent.startTime;
        if (elapsed < data.spinEvent.durationMs) {
          lastSpinTimeRef.current = data.spinEvent.startTime;
          setWinningIndex(data.spinEvent.winningIndex);
          setServerTargetAngle(data.spinEvent.targetAngle);
          setCelebrationWinner(null);
          setSpinStartTimeMs(performance.now() - elapsed);
          setIsSpinning(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchState(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [isSpinning, isAdmin]);

  const saveStateToKV = async (newRemaining: TeamItem[], newGroupA: TeamItem[], newGroupB: TeamItem[], winner: TeamItem | null, spinData: any = null) => {
    await fetch("/api/roulette-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remainingTeams: newRemaining,
        groupA: newGroupA,
        groupB: newGroupB,
        selectedTargetGroup: manualGroup,
        celebrationWinner: winner,
        spinEvent: spinData,
      }),
    }).catch(() => null);
  };

  const handleStartSpin = () => {
    if (isSpinning || remainingTeams.length === 0 || isCurrentGroupFull) return;

    setCelebrationWinner(null);
    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    const exactTargetAngle = 10 * Math.PI - (randomIndex + 0.5) * ((2 * Math.PI) / remainingTeams.length);

    setWinningIndex(randomIndex);
    setServerTargetAngle(exactTargetAngle);
    setSpinStartTimeMs(performance.now());
    setIsSpinning(true);

    saveStateToKV(remainingTeams, groupA, groupB, null, {
      winningIndex: randomIndex,
      targetAngle: exactTargetAngle,
      startTime: Date.now(),
      durationMs: 4000,
    });
  };

  const handleSpinEnd = () => {
    if (winningIndex === null) return;
    const selectedTeam = remainingTeams[winningIndex];
    if (!selectedTeam) return;

    const newRemaining = remainingTeams.filter((_, idx) => idx !== winningIndex);
    const newGroupA = manualGroup === "GROUP_A" ? [...groupA, selectedTeam] : groupA;
    const newGroupB = manualGroup === "GROUP_B" ? [...groupB, selectedTeam] : groupB;

    setRemainingTeams(newRemaining);
    setGroupA(newGroupA);
    setGroupB(newGroupB);
    setIsSpinning(false);
    setWinningIndex(null);
    setCelebrationWinner(selectedTeam);

    if (isAdmin) saveStateToKV(newRemaining, newGroupA, newGroupB, selectedTeam, null);
  };

  const handleReset = async () => {
    const res = await Swal.fire({
      title: "RESET PENGUNDIAN?",
      text: "Kosongkan hasil Group A & Group B?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Reset",
    });

    if (!res.isConfirmed) return;
    setIsLoading(true);
    await fetch("/api/roulette-state", { method: "DELETE" }).catch(() => null);
    fetchState();
  };

  if (isLoading) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-card/50">
        <p className="animate-pulse text-xs font-semibold text-primary">⏳ Memuat Data Pengundian...</p>
      </div>
    );
  }

  const currentLabel = manualGroup === "GROUP_A" ? "Group A" : "Group B";

  return (
    <div className="relative flex w-full max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
      
      {celebrationWinner && (
        <WinnerModal
          winner={celebrationWinner}
          targetGroup={groupA.some((t) => t.name === celebrationWinner.name) ? "Group A" : "Group B"}
          isAdmin={isAdmin}
          onClose={() => {
            setCelebrationWinner(null);
            if (isAdmin) saveStateToKV(remainingTeams, groupA, groupB, null);
          }}
        />
      )}

      {/* Box Utama Roda */}
      <div className="flex flex-1 flex-col items-center rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md">
        <div className="mb-4 text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Alokasi Grup: <span className={currentLabel.includes("A") ? "text-sky-400" : "text-amber-400"}>{currentLabel}</span>
          </span>
        </div>

        {remainingTeams.length > 0 && !(isGroupAFull && isGroupBFull) ? (
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

        {isAdmin && (
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-1">
              <button
                disabled={isGroupAFull}
                onClick={() => setManualGroup("GROUP_A")}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_A" ? "bg-sky-600 text-white" : "text-muted-foreground"
                } ${isGroupAFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Group A {isGroupAFull ? "(Full)" : ""}
              </button>
              <button
                disabled={isGroupBFull}
                onClick={() => setManualGroup("GROUP_B")}
                className={`flex-1 rounded-lg py-2 text-[10px] font-bold uppercase transition ${
                  manualGroup === "GROUP_B" ? "bg-amber-600 text-white" : "text-muted-foreground"
                } ${isGroupBFull ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Group B {isGroupBFull ? "(Full)" : ""}
              </button>
            </div>

            <button
              onClick={handleStartSpin}
              disabled={isSpinning || remainingTeams.length === 0 || isCurrentGroupFull}
              className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold uppercase tracking-widest text-primary-foreground shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isSpinning ? "MEMUTAR..." : isCurrentGroupFull ? `${currentLabel.toUpperCase()} FULL` : "🎯 MULAI PENGUNDIAN"}
            </button>

            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-[10px] font-bold text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              🔄 RESET PENGUNDIAN
            </button>
          </div>
        )}
      </div>

      {/* Komponen Tabel Group A & Group B */}
      <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <GroupCard title="GROUP A" colorTheme="sky" teams={groupA} quota={quotaGroupA} />
        <GroupCard title="GROUP B" colorTheme="amber" teams={groupB} quota={quotaGroupB} />
      </div>

    </div>
  );
}
