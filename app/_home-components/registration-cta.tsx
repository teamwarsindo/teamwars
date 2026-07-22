"use client"

import { useState, useEffect } from "react"
import { Countdown } from "./countdown" // Pastikan file countdown.tsx sudah dipindah ke folder ini
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { DiscordIcon, RulesIcon, FormIcon } from "@/components/icons"
import { LAUNCH_TARGET, CLOSE_TARGET } from "@/lib/config"

type RegistrationPhase = "PRE_LAUNCH" | "OPEN" | "CLOSED"

export function RegistrationCTA() {
  const [phase, setPhase] = useState<RegistrationPhase>("PRE_LAUNCH")

  useEffect(() => {
    const checkTime = () => {
      const now = new Date().getTime()
      if (now < LAUNCH_TARGET) setPhase("PRE_LAUNCH")
      else if (now >= LAUNCH_TARGET && now < CLOSE_TARGET) setPhase("OPEN")
      else setPhase("CLOSED")
    }

    checkTime()
    const intervalId = setInterval(checkTime, 1000)
    return () => clearInterval(intervalId)
  }, [])

  const isOpen = phase === "OPEN"
  const getCountdownLabel = () => {
    if (phase === "PRE_LAUNCH") return "Registration Opens In"
    if (phase === "OPEN") return "Registration Closes In"
    return "Registration Has Ended"
  }
  const activeTarget = phase === "PRE_LAUNCH" ? LAUNCH_TARGET : CLOSE_TARGET

  return (
    <section className="flex w-full flex-col items-center text-center">
      {/* Area Countdown */}
      <div className="w-full max-w-3xl">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground sm:mb-4 sm:text-xs transition-colors">
          {getCountdownLabel()}
        </p>
        {phase !== "CLOSED" && <Countdown target={activeTarget} />}
      </div>

      {/* Area Tombol */}
      <div className="mt-4 flex w-full max-w-4xl flex-col items-center gap-2.5 lg:mt-10 lg:flex-row lg:justify-center">
        {/* Tombol Registrasi */}
        <a
          href={isOpen ? "/registration" : undefined}
          target={isOpen ? "_blank" : undefined}
          rel={isOpen ? "noopener noreferrer" : undefined}
          onClick={(e) => { if (!isOpen) e.preventDefault(); }}
          aria-disabled={!isOpen}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5 transition-all duration-300",
            "!bg-red-600 !text-white hover:!bg-red-700 shadow-[0_0_30px_-6px_rgba(220,38,38,0.5)] dark:!bg-red-600 dark:!text-white dark:hover:!bg-red-700",
            !isOpen && "opacity-50 cursor-not-allowed !pointer-events-none"
          )}
        >
          <FormIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          {phase === "PRE_LAUNCH" && "Registration Opens Soon"}
          {phase === "OPEN" && "Team Registration"}
          {phase === "CLOSED" && "Registration Closed"}
        </a>

        {/* Tombol Discord */}
        <a
          href="/invite"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5",
            "!bg-[#5865F2] !text-white hover:!bg-[#4752c4] shadow-[0_0_30px_-6px_rgba(88,101,242,0.5)] dark:!bg-[#5865F2] dark:!text-white dark:hover:!bg-[#4752c4]"
          )}
        >
          <DiscordIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          Join the Discord
        </a>

        {/* Tombol Rulebook */}
        <a
          href="/rules"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5",
            "!bg-gray-800 !text-white hover:!bg-gray-900 shadow-[0_0_30px_-6px_rgba(31,41,55,0.5)]",
            "dark:!bg-white dark:!text-black dark:hover:!bg-gray-200 dark:!shadow-[0_0_30px_-6px_rgba(255,255,255,0.5)]"
          )}
        >
          <RulesIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          Check Rulebook
        </a>
      </div>
    </section>
  )
}
