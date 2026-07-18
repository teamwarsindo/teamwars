"use client";

import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldIcon, TrashIcon } from "@/components/icons";

// ==========================================
// 1. TOP BAR (Tombol Gelap Cerah & Teks Kiri)
// ==========================================
interface TopBarProps {
  title: string;
  showTrash?: boolean;
  onClearStorage?: () => void;
}

export function TopBar({ title, showTrash = false, onClearStorage }: TopBarProps) {
  return (
    <div className="relative z-10 flex w-full items-center justify-between px-6 pt-6 lg:px-12">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <ShieldIcon className="h-4 w-4 text-primary" />
        {title}
      </div>
      
      <div className="flex items-center gap-1">
        {showTrash && onClearStorage && (
          <button
            type="button"
            onClick={onClearStorage}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            title="Hapus data tersimpan & reset form"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
        {/* Tombol Gelap/Cerah */}
        <ThemeToggle />
      </div>
    </div>
  );
}

// ==========================================
// 2. HERO HEADER (Logo & Deskripsi Rebranding)
// ==========================================

// 1. Buat interface untuk menerima props boolean
interface HeroHeaderProps {
  showDetails?: boolean;
}

// 2. Set default value-nya menjadi true
export function HeroHeader({ showDetails = true }: HeroHeaderProps) {
  return (
    <header className="mt-6 mb-8 flex flex-col items-center text-center lg:mb-10">
      <div className="glow-border relative mb-6 h-[120px] w-[120px] overflow-hidden rounded-2xl sm:h-28 sm:w-28 lg:mb-8 lg:h-44 lg:w-44">
        <Image
          src="/logo.webp"
          alt="Logo Team Wars Indonesia"
          fill
          priority
          className="scale-[1.01] object-cover" 
        />
      </div>
      <h1 className="glow-text text-balance text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-[clamp(3.5rem,5vw,5.5rem)] lg:leading-[1.1]">
        TEAM WARS INDONESIA
      </h1>
      
      {/* 3. Bungkus bagian detail dengan kondisi showDetails */}
      {showDetails && (
        <>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:py-1.5 sm:text-sm lg:mt-6">
            Season 7 — Duel Links
          </p>

          <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
            Team Wars Indonesia (TWI) adalah platform kompetisi beregu Yu-Gi-Oh! utama yang mempertemukan berbagai komunitas dan guild terbaik. TWI menghadirkan standar turnamen Duel Links yang kompetitif dan profesional.
          </p>
        </>
      )}
    </header>
  );
}

// ==========================================
// 3. FOOTER
// ==========================================
export function Footer() {
  return (
    <footer className="mt-auto pt-10 pb-6 text-center text-[10px] text-muted-foreground sm:pt-16 sm:text-xs">
      © {new Date().getFullYear()} Team Wars Indonesia. All rights reserved.
    </footer>
  );
}
