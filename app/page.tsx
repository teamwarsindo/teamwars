"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from 'next/navigation'
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared"
import { cn } from "@/lib/utils"
import { Countdown } from "@/components/countdown"
import { buttonVariants } from "@/components/ui/button"
import { DiscordIcon, RulesIcon, FormIcon } from "@/components/icons"

// 👈 TAMBAHKAN IMPORT INI
import { LAUNCH_TARGET, CLOSE_TARGET } from "@/lib/config" 

type RegistrationPhase = "PRE_LAUNCH" | "OPEN" | "CLOSED"

// Komponen terpisah untuk menangani parameter URL agar Next.js tidak protes (Suspense boundary)
function AlertNotOpen() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'not_open') {
      alert("Sabar ya! Registrasi belum dibuka. Tunggu hitung mundur selesai ⏳")
    }
  }, [searchParams])

  return null
}

export default function Page() {
  // State untuk melacak sistem sedang ada di fase mana
  const [phase, setPhase] = useState<RegistrationPhase>("PRE_LAUNCH")

  useEffect(() => {
    const checkTime = () => {
      const now = new Date().getTime()
      
      if (now < LAUNCH_TARGET) {
        // Fase 1: Belum waktunya buka
        setPhase("PRE_LAUNCH")
      } else if (now >= LAUNCH_TARGET && now < CLOSE_TARGET) {
        // Fase 2: Sudah buka, tapi belum melewati batas 2 minggu
        setPhase("OPEN")
      } else {
        // Fase 3: Sudah melewati batas 2 minggu
        setPhase("CLOSED")
      }
    }

    // Cek inisial saat dimuat
    checkTime()

    // Cek berkala setiap 1 detik
    const intervalId = setInterval(checkTime, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // Bantuan logika (Helper) agar kode di bawah lebih rapi
  const isOpen = phase === "OPEN"
  
  // Tentukan teks di atas countdown sesuai fase
  const getCountdownLabel = () => {
    if (phase === "PRE_LAUNCH") return "Registration Opens In"
    if (phase === "OPEN") return "Registration Closes In"
    return "Registration Has Ended"
  }

  // Tentukan target countdown
  const activeTarget = phase === "PRE_LAUNCH" ? LAUNCH_TARGET : CLOSE_TARGET

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      {/* Pengecekan Error dari Middleware */}
      <Suspense fallback={null}>
        <AlertNotOpen />
      </Suspense>

      {/* Ambient esports glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Website" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
      
       <HeroHeader/>
          
        {/* SECTION KONTEN: Countdown & Tombol */}
        <section className="flex w-full flex-col items-center text-center">      
          
          {/* Area Countdown */}
          <div className="w-full max-w-3xl">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground sm:mb-4 sm:text-xs transition-colors">
              {getCountdownLabel()}
            </p>
            {/* Countdown disembunyikan jika pendaftaran sudah benar-benar ditutup */}
            {phase !== "CLOSED" && (
              <Countdown target={activeTarget} />
            )}
          </div>

          {/* Area Tombol */}
          <div className="mt-4 flex w-full max-w-4xl flex-col items-center gap-2.5 lg:mt-10 lg:flex-row lg:justify-center">
            
            {/* 1. TOMBOL REGISTRASI (Dinamis 3 Fase) */}
            <a
              href={isOpen ? "/registration" : undefined}
              target={isOpen ? "_blank" : undefined} // Ditambahkan
              rel={isOpen ? "noopener noreferrer" : undefined} // Ditambahkan
              onClick={(e) => {
                if (!isOpen) e.preventDefault();
              }}
              aria-disabled={!isOpen}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5 transition-all duration-300",
                "!bg-red-600 !text-white hover:!bg-red-700 shadow-[0_0_30px_-6px_rgba(220,38,38,0.5)] dark:!bg-red-600 dark:!text-white dark:hover:!bg-red-700",
                !isOpen && "opacity-50 cursor-not-allowed !pointer-events-none"
              )}
            >
              <FormIcon className="h-4 w-4 lg:h-5 lg:w-5" />
              {/* Teks Tombol Berubah Sesuai Fase */}
              {phase === "PRE_LAUNCH" && "Registration Opens Soon"}
              {phase === "OPEN" && "Team Registration"}
              {phase === "CLOSED" && "Registration Closed"}
            </a>

            {/* 2. TOMBOL DISCORD */}
            <a
              href="/invite"
              target="_blank" // Ditambahkan
              rel="noopener noreferrer" // Ditambahkan
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 w-full gap-2 whitespace-nowrap px-4 sm:px-6 lg:h-12 lg:w-auto lg:gap-2.5 lg:text-base [&_svg:not([class*='size-'])]:size-4 lg:[&_svg:not([class*='size-'])]:size-5",
                "!bg-[#5865F2] !text-white hover:!bg-[#4752c4] shadow-[0_0_30px_-6px_rgba(88,101,242,0.5)] dark:!bg-[#5865F2] dark:!text-white dark:hover:!bg-[#4752c4]"
              )}
            >
              <DiscordIcon className="h-4 w-4 lg:h-5 lg:w-5" />
              Join the Discord
            </a>

            {/* 3. TOMBOL RULEBOOK */}
            <a
              href="/rules"
              target="_blank" // Ditambahkan
              rel="noopener noreferrer" // Ditambahkan
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

        <Footer/>

      </div>
    </main>
  )
}
