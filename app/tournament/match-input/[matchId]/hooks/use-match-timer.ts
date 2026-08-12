"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";

interface UseMatchTimerProps {
  teamName: string;
  lateDecks: number;
  onExecuteTL: () => void;
}

export function useMatchTimer({ teamName, lateDecks, onExecuteTL }: UseMatchTimerProps) {
  const baseTime = Math.max(0, (15 - lateDecks * 2) * 60);
  const [timer, setTimer] = useState(baseTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimer(baseTime);
  }, [lateDecks, baseTime]);

  const handleTimeoutTL = async () => {
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
      setTimer(180); // Reset ke 3 Menit Tambahan
      setIsRunning(true); // LANGSUNG JALAN
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && isRunning) {
      handleTimeoutTL();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timer]);

  const toggleTimer = () => {
    if (timer === 0 && !isRunning) {
      handleTimeoutTL();
    } else {
      setIsRunning(!isRunning);
    }
  };

  const resetTimer = () => {
    setTimer(baseTime);
    setIsRunning(false);
  };

  return { timer, isRunning, toggleTimer, resetTimer };
}