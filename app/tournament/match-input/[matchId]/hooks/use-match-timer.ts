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
  // Hitung durasi awal berdasarkan config: 15 menit minus penalti per-deck
  const baseTime = Math.max(
    0,
    (TOURNAMENT_CONFIG.TIMER_DEFAULT_SECONDS / 60 - lateDecks * TOURNAMENT_CONFIG.PENALTY_MINUTES_PER_DECK) * 60
  );

  const [timer, setTimer] = useState(baseTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimer(baseTime);
  }, [lateDecks, baseTime]);

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
      setTimer(TOURNAMENT_CONFIG.TIMER_OVERTIME_SECONDS); // Overtime 3 Menit Tambahan
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
    setTimer(baseTime);
    setIsRunning(false);
  };

  return { timer, isRunning, toggleTimer, resetTimer };
}