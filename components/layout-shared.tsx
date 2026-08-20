"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldIcon, TrashIcon } from "@/components/icons";

// ==========================================
// 1. TOP BAR (SIMETRIS 3 KOLOM DI DESKTOP)
// ==========================================
interface TopBarProps {
  title: string;
  showTrash?: boolean;
  onClearStorage?: () => void;
}

export function TopBar({ title, showTrash = false, onClearStorage }: TopBarProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Tournament", href: "/tournament" },
    { label: "Roulette", href: "/roulette" },
    { label: "Rules", href: "/rules" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2.5 md:py-0 md:h-[72px] sm:px-6 lg:px-12 gap-2.5 md:gap-0">
        
        {/* KIRI: LOGO & JUDUL (Flex-1 agar kolom tengah presisi simetris) */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start md:flex-1">
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-2.5 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span className="truncate">{title}</span>
          </Link>

          {/* TOGGLE MOBILE (Sembunyi di Desktop) */}
          <div className="flex md:hidden items-center gap-2">
            {showTrash && onClearStorage && (
              <button
                type="button"
                onClick={onClearStorage}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* TENGAH: NAV PILLS (Ukuran Besar & Gagah di Desktop) */}
        <nav className="flex items-center justify-center gap-1.5 md:gap-2.5 overflow-x-auto no-scrollbar md:flex-1">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 md:px-5 md:py-2 text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* KANAN: TOGGLES DESKTOP (Flex-1 menyeimbangkan kolom kiri) */}
        <div className="hidden md:flex items-center justify-end gap-3 md:flex-1">
          {showTrash && onClearStorage && (
            <button
              type="button"
              onClick={onClearStorage}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted/30 border border-border/40 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors cursor-pointer shadow-sm"
              title="Hapus data tersimpan & reset form"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <div className="scale-110">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// 2. HERO HEADER (Diperbesar untuk Desktop)
// ==========================================
interface HeroHeaderProps {
  showDetails?: boolean;
}

export function HeroHeader({ showDetails = true }: HeroHeaderProps) {
  return (
    <header className="mt-4 mb-6 flex flex-col items-center text-center sm:mt-8 md:mt-10 lg:mb-12">
      <div className="glow-border relative mb-4 h-24 w-24 overflow-hidden rounded-3xl sm:h-32 sm:w-32 md:h-36 md:w-36 lg:mb-6 lg:h-44 lg:w-44 shadow-2xl">
        <Image
          src="/logo.webp"
          alt="Logo Team Wars Indonesia"
          fill
          priority
          className="scale-[1.01] object-cover"
        />
      </div>
      <h1 className="glow-text text-balance text-2xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-[4rem] leading-none">
        TEAM WARS INDONESIA
      </h1>

      {showDetails && (
        <>
          <div className="mt-3 md:mt-5 inline-flex items-center gap-2 md:gap-3 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 md:px-5 md:py-1.5 text-[11px] md:text-sm font-black uppercase tracking-[0.15em] text-primary shadow-sm">
            <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Season 7 — Duel Links
          </div>

          <p className="mt-3 md:mt-4 max-w-lg md:max-w-2xl text-center text-xs md:text-sm lg:text-base leading-relaxed text-muted-foreground font-medium">
            Platform kompetisi beregu Yu-Gi-Oh! Duel Links terbesar di Indonesia. Pantau jadwal pertandingan, klasemen grup, dan hasil match secara real-time.
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
    <footer className="mt-auto pt-8 pb-6 text-center text-[10px] text-muted-foreground sm:pt-12 sm:text-xs md:text-sm font-medium">
      © {new Date().getFullYear()} Team Wars Indonesia. All rights reserved.
    </footer>
  );
}