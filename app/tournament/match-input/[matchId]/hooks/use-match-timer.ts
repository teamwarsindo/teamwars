"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { TOURNAMENT_CONFIG } from "../constants/tournament";

interface UseMatchTimerProps {
  teamName: string;
  lateDecks: number;
  onExecuteTL: () => void;
}

export function useMatchTimer({ teamName, lateDecks, onExecuteTL }: UseMatchTimerProps) {
  // Hitung penalti menit (1 Deck = 2 Menit)
  const penaltyMins = lateDecks * TOURNAMENT_CONFIG.PENALTY_MINUTES_PER_DECK;
  const netMins = 15 - penaltyMins;

  let initialSeconds = 0;
  let initialCycle = 0;

  if (netMins > 0) {
    // Masih berada dalam Waktu Regulasi (15m)
    initialSeconds = netMins * 60;
  } else {
    // Waktu Regulasi Habis -> Hitung Siklus Extra Timer (Kelipatan 3 Menit / 180s)
    const deficitSecs = Math.abs(netMins) * 60;
    initialCycle = Math.floor(deficitSecs / 180) + 1;
    const totalCycleSecs = initialCycle * 180;
    initialSeconds = totalCycleSecs - deficitSecs;

    if (initialSeconds === 0) {
      initialCycle += 1;
      initialSeconds = 180;
    }
  }

  const [timer, setTimer] = useState(initialSeconds);
  const [extraCycle, setExtraCycle] = useState(initialCycle);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimer(initialSeconds);
    setExtraCycle(initialCycle);
    setIsRunning(false);
  }, [lateDecks, initialSeconds, initialCycle]);

  const handleTimeoutTL = useCallback(async () => {
    setIsRunning(false);
    const result = await Swal.fire({
      title: `⚠️ TIMER ${teamName} HABIS (00:00)`,
      text: `Apakah ingin mengeksekusi Hukuman Technical Loss (TL) untuk ${teamName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Eksekusi TL",
      cancelButtonText: "Batal (Pemain Kembali)",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      onExecuteTL();
      // Buka siklus Extra Timer 3 Menit baru
      setExtraCycle((prev) => prev + 1);
      setTimer(TOURNAMENT_CONFIG.TIMER_OVERTIME_SECONDS);
      setIsRunning(true);
    }
  }, [teamName, onExecuteTL]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            handleTimeoutTL();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, handleTimeoutTL]);

  const toggleTimer = () => {
    if (timer === 0 && !isRunning) {
      handleTimeoutTL();
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const resetTimer = () => {
    setTimer(initialSeconds);
    setExtraCycle(initialCycle);
    setIsRunning(false);
  };

  return {
    timer,
    extraCycle,
    isExtraTimer: extraCycle > 0,
    isRunning,
    toggleTimer,
    resetTimer,
  };
}