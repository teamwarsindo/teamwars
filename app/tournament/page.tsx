"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TournamentView } from "@/components/tournament/tournament-view";
import { AnalystCenter } from "@/components/analyst/analyst-center";

// 1. Komponen Internal yang membaca Client SearchParams
function TournamentContent() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [activeMainTab, setActiveMainTab] = useState<"TOURNAMENT" | "ANALYST">("TOURNAMENT");

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* 🌟 HERO BANNER & HEADER */}
      <header className="relative w-full border-b border-border bg-gradient-to-b from-card/80 via-card/40 to-background pt-10 pb-8 px-4 text-center backdrop-blur-md overflow-hidden">
        {/* Glow Effects Background */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-sky-500/10 blur-3xl rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center gap-3">
          {/* Season Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-950/40 px-4 py-1 text-xs font-bold text-sky-400 shadow-sm">
            <span>🔥 SEASON 7 OFFICIAL DRAW & STAGE</span>
            {isAdmin && (
              <span className="ml-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 border border-rose-500/40">
                ADMIN MODE
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight bg-gradient-to-r from-white via-sky-200 to-sky-500 bg-clip-text text-transparent drop-shadow-sm">
            Team Wars Indonesia
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl">
            Sistem kompetisi beregu King of Hill (KOF). Alokasi tim otomatis berbasis Uniform Distribution dari Roulette Spin.
          </p>

          {/* Quick Stats Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl text-left">
            <div className="rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Format Match</p>
              <p className="text-xs font-extrabold text-sky-400">KOF Race to 10</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Deck Per Tim</p>
              <p className="text-xs font-extrabold text-amber-400">10 Deck (5 Roster)</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Playoff Slots</p>
              <p className="text-xs font-extrabold text-emerald-400">12 Tim Lolos</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-3 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Wildcard Play-Ins</p>
              <p className="text-xs font-extrabold text-indigo-400">Top 8 Global</p>
            </div>
          </div>
        </div>
      </header>

      {/* 🎛️ MAIN MODULE SWITCHER */}
      <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveMainTab("TOURNAMENT")}
            className={`flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === "TOURNAMENT"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🏆</span>
            <span>Tournament Center</span>
          </button>

          <button
            onClick={() => setActiveMainTab("ANALYST")}
            className={`flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeMainTab === "ANALYST"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20 scale-105"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>📊</span>
            <span>Analyst Center</span>
          </button>
        </div>
      </nav>

      {/* 🚀 MAIN CONTENT VIEW */}
      <main className="flex-1 w-full max-w-6xl mx-auto py-8 px-4">
        {activeMainTab === "TOURNAMENT" ? (
          <TournamentView isAdmin={isAdmin} />
        ) : (
          <AnalystCenter isAdmin={isAdmin} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-border bg-card/40 py-6 px-4 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold">
            © {new Date().getFullYear()} Team Wars Indonesia. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="/roulette?admin=true" className="hover:text-primary transition">
              🎡 Spin Roulette
            </a>
            <span>•</span>
            <span className="text-emerald-400 font-bold">Vercel KV Synced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 2. Main Export Halaman Utama Dibungkus <Suspense> untuk lolos Vercel Build
export default function TournamentLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-xs font-bold text-primary animate-pulse">
          ⏳ Memuat Turnamen Team Wars Indonesia...
        </div>
      }
    >
      <TournamentContent />
    </Suspense>
  );
      }
