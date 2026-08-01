"use client";

import { useEffect } from "react";
import { useRouletteSync } from "./useRouletteSync";
import { useRouletteSpin } from "./useRouletteSpin";
import Swal from "sweetalert2";

export function useRoulette(isAdmin: boolean) {
  const spin = useRouletteSpin();
  const sync = useRouletteSync(isAdmin, spin.isSpinning);

  const quotaGroupA = Math.ceil(sync.masterTeams.length / 2);
  const quotaGroupB = sync.masterTeams.length - quotaGroupA;

  const isGroupAFull = sync.groupA.length >= quotaGroupA && quotaGroupA > 0;
  const isGroupBFull = sync.groupB.length >= quotaGroupB && quotaGroupB > 0;
  const isCurrentGroupFull =
    (sync.manualGroup === "GROUP_A" && isGroupAFull) ||
    (sync.manualGroup === "GROUP_B" && isGroupBFull);

  // Auto-switch grup jika salah satu grup penuh
  useEffect(() => {
    if (sync.manualGroup === "GROUP_A" && isGroupAFull && !isGroupBFull) {
      sync.setManualGroup("GROUP_B");
    } else if (sync.manualGroup === "GROUP_B" && isGroupBFull && !isGroupAFull) {
      sync.setManualGroup("GROUP_A");
    }
  }, [sync.groupA.length, sync.groupB.length, isGroupAFull, isGroupBFull, sync.manualGroup]);

  // Sync Interval Polling
  useEffect(() => {
    sync.fetchState(spin.triggerRemoteSpin);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      sync.fetchState(spin.triggerRemoteSpin);
    }, 1000);
    return () => clearInterval(interval);
  }, [spin.isSpinning, isAdmin]);

  const handleStartSpin = () => {
    if (spin.isSpinning || sync.remainingTeams.length === 0 || isCurrentGroupFull) return;

    sync.setCelebrationWinner(null);
    const { randomIndex, exactTargetAngle } = spin.calculateSpin(sync.remainingTeams);

    sync.saveStateToKV(sync.remainingTeams, sync.groupA, sync.groupB, null, {
      winningIndex: randomIndex,
      targetAngle: exactTargetAngle,
      startTime: Date.now(),
      durationMs: 4000,
    });
  };

  const handleSpinEnd = () => {
    if (spin.winningIndex === null) return;
    const selectedTeam = sync.remainingTeams[spin.winningIndex];
    if (!selectedTeam) return;

    const newRemaining = sync.remainingTeams.filter((_, idx) => idx !== spin.winningIndex);
    const newGroupA = sync.manualGroup === "GROUP_A" ? [...sync.groupA, selectedTeam] : sync.groupA;
    const newGroupB = sync.manualGroup === "GROUP_B" ? [...sync.groupB, selectedTeam] : sync.groupB;

    sync.setRemainingTeams(newRemaining);
    sync.setGroupA(newGroupA);
    sync.setGroupB(newGroupB);
    spin.resetSpinState();
    sync.setCelebrationWinner(selectedTeam);

    if (isAdmin) {
      sync.saveStateToKV(newRemaining, newGroupA, newGroupB, selectedTeam, null);
    }
  };

  const closeCelebration = (adminMode: boolean) => {
    sync.setCelebrationWinner(null);
    if (adminMode) {
      sync.saveStateToKV(sync.remainingTeams, sync.groupA, sync.groupB, null);
    }
  };

  const handleReset = async () => {
    const res = await Swal.fire({
      title: "RESET PENGUNDIAN?",
      text: "Kosongkan hasil Group A & Group B?",
      icon: "warning",
      background: "#171717",
      color: "#fff",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3f3f46",
      confirmButtonText: "Ya, Reset",
    });

    if (!res.isConfirmed) return;
    sync.setIsLoading(true);
    await fetch("/api/roulette-state", { method: "DELETE" }).catch(() => null);
    sync.fetchState(spin.triggerRemoteSpin);
  };

  return {
    ...sync,
    ...spin,
    quotaGroupA,
    quotaGroupB,
    isGroupAFull,
    isGroupBFull,
    isCurrentGroupFull,
    handleStartSpin,
    handleSpinEnd,
    closeCelebration,
    handleReset,
  };
}
