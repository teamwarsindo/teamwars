// Tidak ada lagi "use client" di sini!
import { Suspense } from "react"
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared"
import { AlertNotOpen } from "./_home-components/alert-not-open"
import { RegistrationCTA } from "./_home-components/registration-cta"

export default function Page() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      {/* Pengecekan Error dari Middleware secara Client-side terisolasi */}
      <Suspense fallback={null}>
        <AlertNotOpen />
      </Suspense>

      {/* Ambient esports glow */}
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar title="Official Website" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        
        {/* Komponen interaktif yang diisolasi re-rendernya */}
        <RegistrationCTA />

        <Footer />
      </div>
    </main>
  )
}
