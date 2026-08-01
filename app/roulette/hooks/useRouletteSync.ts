"use client";

import { useState, useEffect, useRef } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

export function useRouletteSync(isAdmin: boolean, isSpinning: boolean) {
  const [masterTeams, setMasterTeams] = useState<TeamItem[]>([]);
  const [remainingTeams, setRemainingTeams] = useState<TeamItem[]>([]);
  const [groupA, setGroupA] = useState<TeamItem[]>([]);
  const [groupB, setGroupB] = useState<TeamItem[]>([]);
  const [manualGroup, setManualGroup] = useState<"GROUP_A" | "GROUP_B">("GROUP_A");
  const [isLoading, setIsLoading] = useState(true);
  const [celebrationWinner, setCelebrationWinner] = useState<TeamItem | null>(null);

  const lastSpinTimeRef = useRef<number | null>(null);

  const fetchState = async (onRemoteSpin?: (spinData: any) => void) => {
    try {
      const res = await fetch("/api/roulette-state");
      const data = await res.json();
      if (!data) return;

      const fetchedMaster = data.masterTeams || [];
      setMasterTeams(fetchedMaster);

      if (!isAdmin && data.selectedTargetGroup) {
        setManualGroup(data.selectedTargetGroup);
      }

      if (!isSpinning) {
        const fetchedGroupA = data.groupA || [];
        const fetchedGroupB = data.groupB || [];

        // Jika groupA & groupB kosong (setelah reset), kembalikan sisa tim = masterTeams
        if (fetchedGroupA.length === 0 && fetchedGroupB.length === 0) {
          setRemainingTeams(data.remainingTeams || fetchedMaster);
        } else {
          const allocatedNames = new Set([
            ...fetchedGroupA.map((t: TeamItem) => t.name),
            ...fetchedGroupB.map((t: TeamItem) => t.name),
          ]);
          const syncedRemaining = (data.remainingTeams || []).filter(
            (t: TeamItem) => !allocatedNames.has(t.name)
          );
          setRemainingTeams(syncedRemaining);
        }

        setGroupA(fetchedGroupA);
        setGroupB(fetchedGroupB);
        if (!isAdmin) setCelebrationWinner(data.celebrationWinner || null);
      }

      if (!isAdmin && data.spinEvent && data.spinEvent.startTime !== lastSpinTimeRef.current) {
        const elapsed = Date.now() - data.spinEvent.startTime;
        if (elapsed < data.spinEvent.durationMs && onRemoteSpin) {
          lastSpinTimeRef.current = data.spinEvent.startTime;
          onRemoteSpin(data.spinEvent);
        }
      }
    } catch (e) {
      console.error("Gagal sync state:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStateToKV = async (
    newRemaining: TeamItem[],
    newGroupA: TeamItem[],
    newGroupB: TeamItem[],
    winner: TeamItem | null,
    spinData: any = null
  ) => {
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

  return {
    masterTeams,
    remainingTeams, setRemainingTeams,
    groupA, setGroupA,
    groupB, setGroupB,
    manualGroup, setManualGroup,
    isLoading, setIsLoading,
    celebrationWinner, setCelebrationWinner,
    fetchState,
    saveStateToKV,
  };
    }
