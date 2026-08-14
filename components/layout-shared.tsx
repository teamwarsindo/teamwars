"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldIcon, TrashIcon } from "@/components/icons";

interface TopBarProps {
  title: string;
  showTrash?: boolean;
  onClearStorage?: () => void;
}

export function TopBar({ title, showTrash = false, onClearStorage }: TopBarProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: "Tournament", href: "/tournament" },
    { label: "Decks", href: "/tournament/decks" },
    { label: "Roulette", href: "/roulette" },
    { label: "Rules", href: "/rules" },
  ];

  return (
    <div className="relative z-20 flex w-full flex-col gap-3 px-4 pt-4 sm:px-6 lg:px-12">
      <div className="flex w-full items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
          <ShieldIcon className="h-4 w-4 text-primary" />
          {title}
        </Link>
        
        <div className="flex items-center gap-2">
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
          <ThemeToggle />
        </div>
      </div>

      {/* Quick Nav Pills Bar */}
      <nav className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 no-scrollbar sm:justify-center">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

interface HeroHeaderProps {
  showDetails?: boolean;
}

export function HeroHeader({ showDetails = true }: HeroHeaderProps) {
  return (
    <header className="mt-2 mb-6 flex flex-col items-center text-center sm:mt-4 lg:mb-8">
      <div className="glow-border relative mb-4 h-24 w-24 overflow-hidden rounded-2xl sm:h-28 sm:w-28 lg:mb-6 lg:h-36 lg:w-36">
        <Image
          src="/logo.webp"
          alt="Logo Team Wars Indonesia"
          fill
          priority
          className="scale-[1.01] object-cover" 
        />
      </div>
      <h1 className="glow-text text-balance text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
        TEAM WARS INDONESIA
      </h1>
      
      {showDetails && (
        <>
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Season 7 — Group Stage Live
          </div>

          <p className="mt-3 max-w-lg text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Platform kompetisi beregu Yu-Gi-Oh! Duel Links terbesar di Indonesia. Pantau jadwal pertandingan, klasemen grup, dan decklist tim favoritmu.
          </p>
        </>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto pt-8 pb-6 text-center text-[10px] text-muted-foreground sm:pt-12 sm:text-xs">
      © {new Date().getFullYear()} Team Wars Indonesia. All rights reserved.
    </footer>
  );
          }
