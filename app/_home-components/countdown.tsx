"use client"

import { useEffect, useState } from "react"

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

const UNITS: { key: keyof TimeLeft; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
]

export function Countdown({ target }: { target: number }) {
  const [time, setTime] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTime(getTimeLeft(target))
    const id = setInterval(() => setTime(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-label="Tournament launch countdown">
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className="relative flex flex-col items-center justify-center rounded-md border border-border bg-card/60 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
        >
          <span className="absolute left-0 top-0 h-px w-full bg-primary/40 animate-pulse-line" />
          <span className="font-heading text-3xl font-bold tabular-nums text-foreground text-glow sm:text-5xl md:text-6xl">
            {time ? String(time[key]).padStart(2, "0") : "--"}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
