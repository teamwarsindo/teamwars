"use client"

import { useState, useEffect } from "react"
import { Countdown } from "./countdown"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { DiscordIcon, RulesIcon, FormIcon } from "@/components/icons"
import { CLOSE_TARGET } from "@/lib/config" // Kita fokus ke Batas Edit Team

export function RegistrationCTA() {
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const checkTime = () => {
      const now = new Date().getTime()
      // Cek apakah sudah melewati batas akhir edit team (CLOSE_TARGET)
      setIsExpired(now >= CLOSE_TARGET)
    }

    checkTime()
    const intervalId = setInterval(checkTime, 1000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <section className="flex w-full flex-col items-center text-center">
      {/* Area Countdown Edit Team */}
      <div className="w-full max-w-3xl">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500 sm:mb-4 sm:text-xs transition-colors">
          {isExpired ? "Roster Lock Deadline Reached" : "⏳ Batas Akhir Edit Team / Roster"}
        </p>
        
        {/* Countdown TETAP NYALA sampai batas waktu edit team habis */}
        {!isExpired ? (
          <Countdown target={CLOSE_TARGET} />
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400 font-medium text-sm sm:text-base">
            🔒 Pendaftaran & Perbaikan Roster Tim Resmi Ditutup
          </div>
        )}
      </div>

      {/* Area Tombol */}
      <div className="mt-4 flex w-full max-w-4xl flex-col items-center gap-2.5 lg:mt-10 lg:flex-row lg:justify-center">
        
        {/* Tombol Registrasi (DITUTUP) */}
        <div
          aria-disabled={true}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5 transition-all duration-300",
            "!bg-red-950/50 !text-red-400 border border-red-800/50 opacity-60 cursor-not-allowed pointer-events-none"
          )}
        >
          <FormIcon className="h-4 w-4 lg:h-5 lg:w-5" />
          Registration Closed
        </div>

        {/* Tombol Discord (Tetap Aktif) */}
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
          Join Discord (Edit Team)
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
