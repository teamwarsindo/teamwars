"use client";

import { useState } from "react";
import { TeamItem } from "@/app/api/roulette-state/route";

export function useRouletteSpin() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [serverTargetAngle, setServerTargetAngle] = useState<number | null>(null);
  const [spinStartTimeMs, setSpinStartTimeMs] = useState<number | undefined>(undefined);

  const calculateSpin = (remainingTeams: TeamItem[]) => {
    const randomIndex = Math.floor(Math.random() * remainingTeams.length);
    const sliceAngle = (2 * Math.PI) / remainingTeams.length;
    const exactTargetAngle = 10 * Math.PI - (randomIndex + 0.5) * sliceAngle;

    setWinningIndex(randomIndex);
    setServerTargetAngle(exactTargetAngle);
    setSpinStartTimeMs(performance.now());
    setIsSpinning(true);

    return { randomIndex, exactTargetAngle };
  };

  const triggerRemoteSpin = (spinEvent: any) => {
    const elapsed = Date.now() - spinEvent.startTime;
    setWinningIndex(spinEvent.winningIndex);
    setServerTargetAngle(spinEvent.targetAngle);
    setSpinStartTimeMs(performance.now() - elapsed);
    setIsSpinning(true);
  };

  const resetSpinState = () => {
    setIsSpinning(false);
    setWinningIndex(null);
  };

  return {
    isSpinning,
    winningIndex,
    serverTargetAngle,
    spinStartTimeMs,
    calculateSpin,
    triggerRemoteSpin,
    resetSpinState,
  };
}
