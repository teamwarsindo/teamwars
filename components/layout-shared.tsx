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
    { label: "Analytics", href: "/analytics" },
    { label: "Roulette", href: "/roulette" },
    { label: "Rules", href: "/rules" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-md transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2.5 md:py-0 md:h-[72px] sm:px-6 lg:px-12 gap-2.5 md:gap-4">
        
        {/* KIRI: LOGO & JUDUL (Flex-1 dengan batas minimum agar seimbang) */}
        <div className="flex w-full md:w-auto items-center justify-between md:justify-start md:flex-1 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-2.5 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldIcon className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <span className="truncate">{title}</span>
          </Link>

          {/* TOGGLE MOBILE */}
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

        {/* TENGAH: NAV PILLS (shrink-0 agar 5 tab tidak tertekan/mengecil) */}
        <nav className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto no-scrollbar shrink-0 py-0.5">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 py-1 sm:px-3 md:px-4 lg:px-5 md:py-2 text-[11px] md:text-xs lg:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
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

        {/* KANAN: TOGGLES DESKTOP (Flex-1 penyeimbang simetri) */}
        <div className="hidden md:flex items-center justify-end gap-3 md:flex-1 shrink-0">
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
// 2. HERO HEADER
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
    <footer className="mt-auto pt-8 pb-6 flex items-center justify-center gap-2.5 text-center text-[10px] text-muted-foreground sm:pt-12 sm:text-xs md:text-sm font-medium">
      <span>© {new Date().getFullYear()} Team Wars Indonesia</span>
      <span className="opacity-40">•</span>
      <a
        href="https://discord.gg/NtBBdqUrxe"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-foreground/90 shadow-2xs transition hover:bg-muted hover:text-foreground active:scale-95"
      >
        <svg
          className="h-3.5 w-3.5 fill-current text-[#5865F2] shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        <span>Gabung Discord</span>
      </a>
    </footer>
  );
      }
