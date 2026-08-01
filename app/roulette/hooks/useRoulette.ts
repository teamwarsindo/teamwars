"use client";

import { useState, useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";
import Swal from "sweetalert2";

export function useRoulette(isAdmin: boolean) {
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

  // Auto switch grup jika salah satu grup penuh
  useEffect(() => {
    if (manualGroup === "GROUP_A" && isGroupAFull && !isGroupBFull) setManualGroup("GROUP_B");
    else if (manualGroup === "GROUP_B" && isGroupBFull && !isGroupAFull) setManualGroup("GROUP_A");
  }, [groupA.length, groupB.length, isGroupAFull, isGroupBFull, manualGroup]);

  // Sync state dari Vercel KV
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

  return {
    masterTeams, remainingTeams, groupA, groupB, manualGroup, setManualGroup,
    isLoading, isSpinning, winningIndex, serverTargetAngle, spinStartTimeMs,
    celebrationWinner, setCelebrationWinner, quotaGroupA, quotaGroupB,
    isGroupAFull, isGroupBFull, isCurrentGroupFull,
    handleStartSpin, handleSpinEnd, handleReset, saveStateToKV
  };
    }
      
