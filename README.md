(Files content cropped to 300k characters, download full ingest to see more)
================================================
FILE: components.json
================================================
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}



================================================
FILE: next-env.d.ts
================================================
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.



================================================
FILE: next.config.mjs
================================================
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/fb',
        destination: 'https://www.facebook.com/teamwars.id',
        permanent: true,
      },
      {
        source: '/ig',
        destination: 'https://www.instagram.com/teamwarsindonesia',
        permanent: true,
      },
    ]
  },

  async rewrites() {
    return [
      // Format URL Bukti
      {
        source: '/bukti/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/bukti/:path*',
      },

      // ⚡ MASKING DOWNLOAD (Harus di ATAS /logo/:path*)
      // Menambahkan fl_attachment agar browser langsung men-download otomatis
      {
        source: '/logo/:filename/download',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/fl_attachment/logo/:filename',
      },

      // Format URL Logo Biasa untuk Display Web
      {
        source: '/logo/:path*',
        destination: 'https://res.cloudinary.com/dhplw8rsd/image/upload/logo/:path*',
      }
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;



================================================
FILE: package.json
================================================
{
  "name": "teamwarsid",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@base-ui/react": "^1.5.0",
    "@vercel/analytics": "1.6.1",
    "@vercel/speed-insights": "^2.0.0",
    "@upstash/redis": "^1.28.0",
    "@vercel/kv": "^1.0.1",
    "@google/genai": "latest",
    "@livekit/components-react": "^2.6.0",
    "@livekit/components-styles": "^1.0.12",
    "livekit-client": "^2.5.0",
    "livekit-server-sdk": "^2.7.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "next": "16.2.6",
    "next-themes": "^0.4.6",
    "react": "^19",
    "react-dom": "^19",
    "shadcn": "^4.8.0",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.4.0",
    "browser-image-compression": "^2.0.2",
    "resend": "latest",
    "cloudinary": "^2.2.0",
    "sweetalert2": "^11.x.x",
    "tweetnacl": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.0",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5",
    "tailwindcss": "^4.2.0",
    "typescript": "5.7.3"
  }
}



================================================
FILE: postcss.config.mjs
================================================
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config



================================================
FILE: proxy.ts
================================================
import { NextResponse, type NextRequest } from 'next/server';

// ==========================================
// 1. HELPER: BACA DAN PROTEKSI AKSES ADMIN
// ==========================================
function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Biarkan API Admin lewat tanpa di-redirect oleh middleware
  if (pathname.startsWith('/api/admin')) {
    return null;
  }

  // 2. Baca Cookie Session
  const sessionToken = req.cookies.get('admin_session')?.value;

  // 🟢 A. Jika membuka root `/admin` atau `/admin/`, paksa lempar ke `/admin/dashboard`
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  // 🟢 B. Jika membuka `/admin/dashboard` tapi BELUM punya cookie session
  // Biarkan LEWAT karena halaman /admin/dashboard memuat form login-nya
  if (pathname.startsWith('/admin/dashboard')) {
    return null; 
  }

  // 🟢 C. Untuk rute sub-admin lainnya (misal: /admin/settings, /admin/users, dll)
  if (pathname.startsWith('/admin/') && !sessionToken) {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return null;
}

// ==========================================
// 2. HELPER: REGISTRASI & CSRF
// ==========================================
function handleRegistration(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/registration' || pathname === '/registration/') {
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('error', 'registration_closed');
    return NextResponse.redirect(homeUrl);
  }

  const res = NextResponse.next();
  if (!req.cookies.get('twi_csrf_token')) {
    res.cookies.set('twi_csrf_token', crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7200
    });
  }
  return res;
}

// ==========================================
// 3. FUNGSI UTAMA PROXY / MIDDLEWARE
// ==========================================
export function proxy(request: NextRequest) {
  const adminRedirect = handleAdminRoutes(request);
  if (adminRedirect) return adminRedirect;

  const registrationLogic = handleRegistration(request);
  if (registrationLogic) return registrationLogic;

  return NextResponse.next();
}

// ==========================================
// 4. MATCHER CONFIG
// ==========================================
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/registration/:path*',
  ],
};



================================================
FILE: tsconfig.json
================================================
{
  "compilerOptions": {
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "target": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}



================================================
FILE: app/globals.css
================================================
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: var(--font-geist-sans), 'Geist Fallback';
  --font-mono: var(--font-geist-mono), 'Geist Mono Fallback';
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

@theme inline {
  --color-glow: var(--glow);
}

:root {
  color-scheme: light;
  --background: oklch(0.985 0.002 250);
  --foreground: oklch(0.16 0.02 255);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.16 0.02 255);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.16 0.02 255);
  --primary: oklch(0.55 0.2 255);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.96 0.005 250);
  --secondary-foreground: oklch(0.2 0.02 255);
  --muted: oklch(0.96 0.005 250);
  --muted-foreground: oklch(0.5 0.015 255);
  --accent: oklch(0.95 0.02 255);
  --accent-foreground: oklch(0.3 0.1 255);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.9 0.008 250);
  --input: oklch(0.9 0.008 250);
  --ring: oklch(0.55 0.2 255);
  --glow: oklch(0.6 0.22 255);
  --chart-1: oklch(0.55 0.2 255);
  --chart-2: oklch(0.65 0.18 230);
  --chart-3: oklch(0.45 0.15 270);
  --chart-4: oklch(0.7 0.12 220);
  --chart-5: oklch(0.5 0.1 255);
  --radius: 0.75rem;
  --sidebar: oklch(0.985 0.002 250);
  --sidebar-foreground: oklch(0.16 0.02 255);
  --sidebar-primary: oklch(0.55 0.2 255);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.95 0.02 255);
  --sidebar-accent-foreground: oklch(0.3 0.1 255);
  --sidebar-border: oklch(0.9 0.008 250);
  --sidebar-ring: oklch(0.55 0.2 255);
}

.dark {
  color-scheme: dark;
  --background: oklch(0.16 0.025 260);
  --foreground: oklch(0.97 0.008 250);
  --card: oklch(0.21 0.03 260);
  --card-foreground: oklch(0.97 0.008 250);
  --popover: oklch(0.2 0.03 260);
  --popover-foreground: oklch(0.97 0.008 250);
  --primary: oklch(0.7 0.18 250);
  --primary-foreground: oklch(0.14 0.03 260);
  --secondary: oklch(0.27 0.03 260);
  --secondary-foreground: oklch(0.97 0.008 250);
  --muted: oklch(0.26 0.03 260);
  --muted-foreground: oklch(0.7 0.03 255);
  --accent: oklch(0.3 0.05 255);
  --accent-foreground: oklch(0.92 0.05 250);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.7 0.05 255 / 18%);
  --input: oklch(0.7 0.05 255 / 22%);
  --ring: oklch(0.7 0.18 250);
  --glow: oklch(0.72 0.2 250);
  --chart-1: oklch(0.7 0.18 250);
  --chart-2: oklch(0.65 0.18 220);
  --chart-3: oklch(0.6 0.16 275);
  --chart-4: oklch(0.75 0.14 230);
  --chart-5: oklch(0.55 0.12 255);
  --sidebar: oklch(0.18 0.03 260);
  --sidebar-foreground: oklch(0.97 0.008 250);
  --sidebar-primary: oklch(0.7 0.18 250);
  --sidebar-primary-foreground: oklch(0.14 0.03 260);
  --sidebar-accent: oklch(0.3 0.05 255);
  --sidebar-accent-foreground: oklch(0.92 0.05 250);
  --sidebar-border: oklch(0.7 0.05 255 / 18%);
  --sidebar-ring: oklch(0.7 0.18 250);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

@layer utilities {
  /* Glassmorphism card — frosted translucent surface */
  .glass {
    background-color: color-mix(in oklch, var(--card) 70%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  /* Glowing border/shadow accent for Esports aesthetic */
  .glow-border {
    border-color: color-mix(in oklch, var(--glow) 40%, transparent);
    box-shadow:
      0 0 0 1px color-mix(in oklch, var(--glow) 18%, transparent),
      0 8px 40px -12px color-mix(in oklch, var(--glow) 45%, transparent);
  }
  .glow-text {
    text-shadow: 0 0 24px color-mix(in oklch, var(--glow) 55%, transparent);
  }
  /* Ambient radial glow used behind the header */
  .ambient-glow {
    background:
      radial-gradient(
        60% 50% at 50% 0%,
        color-mix(in oklch, var(--glow) 22%, transparent) 0%,
        transparent 70%
      );
  }
}



================================================
FILE: app/layout.tsx
================================================
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Tambahkan kode ini sebelum function RootLayout
export const metadata: Metadata = {
  // metadataBase WAJIB ADA agar Next.js tahu domain utama Anda
  metadataBase: new URL('https://teamwars.web.id'), 
  title: 'Team Wars Indonesia',
  description: 'Official Website TWI Season 7 — Duel Links',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Website TWI Season 7 — Duel Links',
    url: 'https://teamwars.web.id',
    siteName: 'Team Wars Indonesia',
    images: [
      {
        // Sesuaikan dengan nama gambar PNG/JPG Anda di folder public/
        url: '/opengraph-image.jpg', 
        width: 1200, // Opsional, tapi disarankan
        height: 630, // Opsional, tapi disarankan
        alt: 'Team Wars Indonesia Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}



================================================
FILE: app/page.tsx
================================================
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



================================================
FILE: app/_home-components/alert-not-open.tsx
================================================
"use client"

import { useEffect } from "react"
import { useSearchParams } from 'next/navigation'

export function AlertNotOpen() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'not_open') {
      alert("Sabar ya! Registrasi belum dibuka. Tunggu hitung mundur selesai ⏳")
    }
  }, [searchParams])

  return null
}



================================================
FILE: app/_home-components/countdown.tsx
================================================
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



================================================
FILE: app/_home-components/registration-cta.tsx
================================================
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



================================================
FILE: app/admin/dashboard/dashboard-client.tsx
================================================
'use client';

import { useAdminTeams } from './hooks/use-admin-teams';
import { AdminTable } from './components/admin-table';
import { ProofModal } from './components/proof-modal';
import { RosterModal } from './components/roster-modal';
import { ApiController } from './components/api-controller';
import { CleanupButton } from './components/cleanup-button';
import { TopBar, Footer } from "@/components/layout-shared";
import { Search, RefreshCw, LogOut, Trophy } from 'lucide-react';

export default function DashboardClientContent() {
  const {
    teams,
    totalCount,
    search,
    setSearch,
    filter,
    setFilter,
    selectedRoster,
    setSelectedRoster,
    previewImg,
    setPreviewImg,
    isLoading,
    refresh,
    logout,
  } = useAdminTeams();

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <TopBar title="Admin Dashboard" />

      <div className="relative z-10 w-[95%] max-w-7xl mx-auto px-4 py-8 flex-1">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Team Wars Indonesia Season 7
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Dashboard Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total <span className="text-foreground font-semibold">{totalCount}</span> tim
              terdaftar di Vercel KV Redis
            </p>
          </div>

          {/* Action Control Panel */}
          <div className="flex flex-wrap items-center gap-3">
            <ApiController />
            <CleanupButton />
            
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            
            <button
              onClick={() => {
                logout();
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground hover:bg-destructive hover:border-destructive hover:text-white rounded-xl text-sm font-medium transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama tim atau email..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Semua Tim ({totalCount})</option>
            <option value="complete">Roster Lengkap Verified</option>
            <option value="incomplete">Roster Belum Lengkap</option>
          </select>
        </div>

        {/* Tabel Interaktif */}
        <AdminTable
          teams={teams}
          isLoading={isLoading}
          onPreviewProof={(url) => setPreviewImg(url)}
          onSelectRoster={(team) => setSelectedRoster(team)}
          onRefreshData={refresh}
        />

        {/* Modal Bukti Transfer */}
        <ProofModal imageUrl={previewImg} onClose={() => setPreviewImg(null)} />

        {/* Modal Detail Roster */}
        <RosterModal team={selectedRoster} onClose={() => setSelectedRoster(null)} />
      </div>

      <Footer />
    </main>
  );
        }



================================================
FILE: app/admin/dashboard/page.tsx
================================================
import { cookies } from "next/headers";
import { Suspense } from "react";
import DashboardClientContent from "./dashboard-client";
import { AdminLoginForm } from "@/components/admin-login-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";

export const metadata = {
  title: "Dashboard Admin — TWI Season 7",
};

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_session")?.value;
  const isAuthorized = Boolean(adminCookie);

  // 🔒 Jika BELUM Login di Server, tampilkan halaman Login
  if (!isAuthorized) {
    return (
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
        <TopBar title="Admin Portal" />
        
        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
          <HeroHeader showDetails={false} />
          <Suspense fallback={<div className="text-center py-6 text-xs text-muted-foreground">Loading Form...</div>}>
            <AdminLoginForm />
          </Suspense>
          <Footer />
        </div>
      </main>
    );
  }

  // 📊 Jika SUDAH Login di Server, langsung render Client Dashboard
  return (
    <Suspense fallback={<div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-xs">Loading Dashboard...</div>}>
      <DashboardClientContent />
    </Suspense>
  );
}



================================================
FILE: app/admin/dashboard/components/admin-table.tsx
================================================
'use client';

import { useState } from 'react';
import { Team } from '../hooks/use-admin-teams';
import { Eye, EyeOff, Users, Edit, ShieldAlert, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { FeedbackModal, FeedbackState } from './feedback-modal';
import Swal from 'sweetalert2';

interface AdminTableProps {
  teams: Team[];
  isLoading: boolean;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
  onRefreshData: () => void;
}

function TeamRowActions({
  team,
  onRefreshData,
  onPreviewProof,
  onSelectRoster,
}: {
  team: Team;
  onRefreshData: () => void;
  onPreviewProof: (url: string) => void;
  onSelectRoster: (team: Team) => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.id }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Sinkronisasi Berhasil',
          message: `Data tim "${team.namaTim}" telah berhasil disinkronkan ke Database Global dan Discord.`,
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Sinkronisasi Gagal',
          message: data.error || 'Gagal memperbarui data tim di Discord.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Gagal menghubungkan ke server sinkronisasi.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    const { value: confirmText, isDismissed } = await Swal.fire({
      title: 'PENGHAPUSAN PERMANEN',
      html: `Ketik <b>HAPUS</b> untuk mendiskualifikasi dan menghapus tim <span class="text-rose-500 font-bold">${team.namaTim}</span>`,
      input: 'text',
      icon: 'warning',
      background: '#171717', 
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#3f3f46', 
      confirmButtonText: 'Eksekusi Hapus',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) return 'Kamu harus mengetik kata konfirmasi!';
        if (value !== 'HAPUS') return 'Kata kunci tidak sesuai!';
      },
    });

    if (isDismissed || confirmText !== 'HAPUS') return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamSlug: team.id }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Tim Berhasil Dihapus',
          message: data.message || `Tim "${team.namaTim}" telah didiskualifikasi dan seluruh data/role/channel terkait telah dibersihkan.`,
        });
        onRefreshData();
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Penghapusan Gagal',
          message: data.error || 'Gagal menghapus tim dari database.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Gagal terhubung ke server saat menghapus tim.',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => onPreviewProof(team.buktiTransfer)}
          className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition shrink-0"
          title="Lihat Bukti Transfer"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectRoster(team)}
          className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500 hover:text-white transition shrink-0"
          title="Detail Roster"
        >
          <Users className="w-4 h-4" />
        </button>

        <a
          href={team.editUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition shrink-0"
          title="Edit Team (Token User)"
        >
          <Edit className="w-4 h-4" />
        </a>

        <a
          href={team.adminEditUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition shrink-0"
          title="Edit Team (Admin Key Bypass)"
        >
          <ShieldAlert className="w-4 h-4" />
        </a>

        <button
          onClick={handleSync}
          disabled={isSyncing || isDeleting}
          className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition disabled:opacity-50 shrink-0"
          title="Force Sync Discord & Global DB"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>

        <button
          onClick={handleDelete}
          disabled={isSyncing || isDeleting}
          className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition disabled:opacity-50 shrink-0"
          title="Diskualifikasi & Hapus Tim"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
}

export function AdminTable({
  teams,
  isLoading,
  onPreviewProof,
  onSelectRoster,
  onRefreshData,
}: AdminTableProps) {
  // 1. State untuk merekam tim mana saja yang emailnya sedang di-unhide
  const [visibleEmails, setVisibleEmails] = useState<Record<string, boolean>>({});

  const formatDateWIB = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return (
      date
        .toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        .replace(/\./g, ':') + ' WIB'
    );
  };

  // 2. Fungsi cerdas untuk menyensor email
  const maskEmail = (email: string) => {
    if (!email) return '••••••••••••';
  
    // Langsung kembalikan titik/bintang secara penuh tanpa peduli panjang aslinya
    return '••••••••••••••••'; 
  };

  // 3. Fungsi untuk menyalakan/mematikan visibilitas email
  const toggleEmail = (teamId: string) => {
    setVisibleEmails((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  return (
    <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl w-full">
      <table className="w-full min-w-[1100px] text-left text-sm whitespace-nowrap">
        <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 w-12 text-center">No</th>
            <th className="px-4 py-3 w-16 text-center">Logo</th>
            <th className="px-4 py-3 min-w-[180px]">Nama Tim</th>
            <th className="px-4 py-3 min-w-[200px]">Email</th>
            <th className="px-4 py-3 min-w-[180px]">Waktu Regis</th>
            <th className="px-4 py-3 w-28">Warna</th>
            <th className="px-4 py-3 w-32 text-center">Total Roster</th>
            <th className="px-4 py-3 min-w-[240px] text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="p-12 text-center text-neutral-500">
                Memuat data pendaftaran dari server...
              </td>
            </tr>
          ) : teams.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-12 text-center text-neutral-500">
                Tidak ada data tim yang sesuai dengan pencarian
              </td>
            </tr>
          ) : (
            teams.map((team) => {
              const [verified, total] = team.rosterStatus.split('/');
              const isComplete = verified === total;
              
              // Cek status email untuk baris ini
              const isEmailVisible = visibleEmails[team.id];

              return (
                <tr
                  key={team.id}
                  className="hover:bg-neutral-800/40 transition duration-150"
                >
                  <td className="px-4 py-3 text-center text-neutral-400 font-medium">
                    {team.no}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt="Logo"
                          className="w-10 h-10 object-cover rounded-xl bg-neutral-950 border border-neutral-800"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-[10px] text-neutral-500">
                          N/A
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-white whitespace-normal break-words max-w-[200px]">
                    {team.namaTim}
                  </td>
                  {/* 👇 BAGIAN EMAIL YANG DIUBAH 👇 */}
                  <td className="px-4 py-3 text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {isEmailVisible ? team.email : maskEmail(team.email)}
                      </span>
                      <button
                        onClick={() => toggleEmail(team.id)}
                        className="text-neutral-500 hover:text-white transition p-1 rounded-md hover:bg-neutral-800"
                        title={isEmailVisible ? "Sembunyikan Email" : "Tampilkan Email"}
                      >
                        {isEmailVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-300 font-mono text-xs">
                    {formatDateWIB(team.waktuRegis)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-neutral-700 shadow-sm shrink-0"
                        style={{ backgroundColor: team.warna }}
                      />
                      <span className="text-xs uppercase text-neutral-400 font-mono">
                        {team.warna}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isComplete
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {team.rosterStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TeamRowActions
                      team={team}
                      onPreviewProof={onPreviewProof}
                      onSelectRoster={onSelectRoster}
                      onRefreshData={onRefreshData}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}



================================================
FILE: app/admin/dashboard/components/api-controller.tsx
================================================
'use client';

import { useState, useEffect } from 'react';
import { Terminal, Play, Loader2, X, RefreshCw, Copy, Check } from 'lucide-react';
import Swal from 'sweetalert2';

export function ApiController() {
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fetchRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch('/api/list-routes');
      const data = await res.json();
      if (data.success && data.routes.length > 0) {
        setAvailableRoutes(data.routes);
        setSelectedRoute(data.routes[0]);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar API:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen]);

  const handleExecuteApi = async () => {
    if (!selectedRoute) return;

    setIsExecuting(true);
    setApiResponse('⏳ Sedang memproses request API & kompresi...');

    try {
      const res = await fetch(selectedRoute, {
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
      
      let resultText = `========================================\n`;
      resultText += `🔹 RESPONSE STATUS: ${res.status} ${res.statusText}\n`;
      resultText += `========================================\n`;
      resultText += `${formattedData}`;

      setApiResponse(resultText);

      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `API ${selectedRoute} Selesai!`,
          showConfirmButton: false,
          timer: 2000,
          background: '#171717',
          color: '#fff',
        });
      }
    } catch (err: any) {
      setApiResponse(`❌ Error Eksekusi: ${err.message || 'Gagal terhubung ke API'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 📋 Fungsi Copy Hasil Response
  const handleCopyResult = () => {
    if (!apiResponse) return;
    navigator.clipboard.writeText(apiResponse);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl text-sm font-medium transition cursor-pointer"
      >
        <Terminal className="w-4 h-4 text-blue-400" />
        <span>API Runner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-3 py-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-blue-400">
                <Terminal className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg text-white">Auto API Runner</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-400">
                    Pilih API Route:
                  </label>
                  <button
                    onClick={fetchRoutes}
                    className="text-[11px] flex items-center gap-1 text-blue-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRoutes ? 'animate-spin' : ''}`} />
                    Scan Ulang
                  </button>
                </div>

                {isLoadingRoutes ? (
                  <div className="flex items-center gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Mendeteksi API Route...
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3 text-xs font-mono text-white outline-none focus:border-blue-500 cursor-pointer truncate"
                    >
                      {availableRoutes.map((route, idx) => (
                        <option key={idx} value={route}>
                          {route}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleExecuteApi}
                      disabled={isExecuting || !selectedRoute}
                      className="w-full mt-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shrink-0 shadow-lg shadow-blue-600/20"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecuting ? 'Memproses API...' : '⚡ JALANKAN API'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 📺 HASIL RESPON CONSOLE + TOMBOL COPY */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    📟 Hasil Respon Console:
                  </span>
                  {apiResponse && (
                    <button
                      onClick={handleCopyResult}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/30 transition cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Tercopy!' : 'Copy Result'}</span>
                    </button>
                  )}
                </div>
                <pre className="h-56 w-full overflow-x-auto overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/90 p-3 font-mono text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-all">
                  {apiResponse || '// Klik "Jalankan API" untuk mengeksekusi.'}
                </pre>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
      }



================================================
FILE: app/admin/dashboard/components/cleanup-button.tsx
================================================
'use client';

import { useState, useEffect } from 'react';
import { DatabaseZap, Loader2, AlertTriangle, X } from 'lucide-react';
import { FeedbackModal, FeedbackState } from './feedback-modal';

export function CleanupButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Kunci scroll saat modal konfirmasi atau feedback terbuka
  useEffect(() => {
    if (showConfirm || (feedback && feedback.isOpen)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirm, feedback]);

  const handleExecuteCleanup = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/cleanup-orphans', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Database Berhasil Ditata Ulang',
          message: 'Seluruh Set Global telah ditata ulang dan seluruh key spam player telah dibasmi.',
          details: [
            `Total Tim Aktif: ${data.stats.totalTim}`,
            `Pemain Masuk Global: ${data.stats.totalPemain}`,
            `Key Spam Dihapus: ${data.stats.spamPlayerKeysDihapus}`,
          ],
        });
      } else {
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Gagal Rebuild Database',
          message: data.error || 'Terjadi kesalahan saat memproses rebuild data.',
        });
      }
    } catch (err) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Kesalahan Jaringan',
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50"
        title="Rebuild & Rapikan Global Database"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
        <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Rebuild Database'}</span>
      </button>

      {/* MODAL KONFIRMASI SEBELUM CLEANUP */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Konfirmasi Rebuild Database</h3>
            <p className="text-sm text-neutral-300 leading-relaxed mb-6">
              Apakah Anda yakin ingin membangun ulang seluruh Index Global Database dan menghapus seluruh data residu/spam?
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteCleanup}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition shadow-lg"
              >
                Ya, Rebuild
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FEEDBACK HASIL */}
      <FeedbackModal data={feedback} onClose={() => setFeedback(null)} />
    </>
  );
              }



================================================
FILE: app/admin/dashboard/components/feedback-modal.tsx
================================================
'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface FeedbackState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string[];
}

interface FeedbackModalProps {
  data: FeedbackState | null;
  onClose: () => void;
}

export function FeedbackModal({ data, onClose }: FeedbackModalProps) {
  useEffect(() => {
    // Kunci scroll saat modal muncul
    if (data && data.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; // Balikin ke default (string kosong lebih aman dari 'unset')
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [data]);

  if (!data || !data.isOpen) return null;

  const isSuccess = data.type === 'success';

  return (
    <div
      // PERBAIKAN: z-[9999] agar dipastikan nampil paling depan menutupi apapun!
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
            isSuccess
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
        </div>

        <h3 className="text-lg font-bold text-white mb-2">{data.title}</h3>
        <p className="text-sm text-neutral-300 leading-relaxed mb-5">{data.message}</p>

        {data.details && data.details.length > 0 && (
          <div className="w-full bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 mb-5 text-left text-xs text-neutral-400 space-y-1.5">
            {data.details.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="leading-snug break-words">{item}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition shadow-lg ${
            isSuccess
              ? 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950'
              : 'bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          Tutup Panel
        </button>
      </div>
    </div>
  );
}



================================================
FILE: app/admin/dashboard/components/proof-modal.tsx
================================================
'use client';

import { X } from 'lucide-react';

interface ProofModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ProofModal({ imageUrl, onClose }: ProofModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-white">Bukti Pembayaran Pendaftaran</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
          <img
            src={imageUrl}
            alt="Bukti Transfer"
            className="max-h-[75vh] w-auto object-contain rounded-xl"
          />
        </div>
        <p className="text-center mt-3 text-xs text-neutral-500">
          Klik di luar area gambar untuk menutup preview
        </p>
      </div>
    </div>
  );
}



================================================
FILE: app/admin/dashboard/components/roster-modal.tsx
================================================
'use client';

import { Team } from '../hooks/use-admin-teams';
import { Users, X, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface RosterModalProps {
  team: Team | null;
  onClose: () => void;
}

export function RosterModal({ team, onClose }: RosterModalProps) {
  if (!team) return null;

  // Pastikan selalu ada 10 slot pemain agar tinggi tabel tetap konstan/stabil untuk SS
  const TOTAL_SLOTS = 10;
  const players = team.players || [];
  const filledPlayers = [...players];

  // Tambahkan slot kosong jika pemain kurang dari 10
  while (filledPlayers.length < TOTAL_SLOTS) {
    filledPlayers.push(null as any);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container - Lebar Proporsional (max-w-5xl) */}
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl p-6 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Detail Roster: <span className="text-blue-400">{team.namaTim}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pemeriksaan status verifikasi Discord pemain (10 Slot Roster)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabel Roster - Kunci Tinggi 10 Slot */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
          <table className="w-full text-left text-sm table-fixed">
            <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 w-[22%]">Nama Lengkap</th>
                <th className="px-4 py-3 w-[20%]">Discord Username</th>
                <th className="px-4 py-3 w-[18%]">IGN (In-Game Name)</th>
                <th className="px-4 py-3 w-[16%]">ID Duel Links</th>
                <th className="px-4 py-3 w-[11%] text-center">Jabatan</th>
                <th className="px-4 py-3 w-[13%] text-center">Status Discord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filledPlayers.map((p: any, i) => {
                // Render baris dummy jika slot kosong (agar modal tidak mengkerut)
                if (!p) {
                  return (
                    <tr key={`empty-${i}`} className="h-[44px] bg-neutral-950/40 text-neutral-600">
                      <td className="px-4 py-2 italic text-xs">Slot {i + 1} (Kosong)</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-xs">—</td>
                      <td className="px-4 py-2 text-center text-xs">—</td>
                      <td className="px-4 py-2 text-center text-xs">—</td>
                    </tr>
                  );
                }

                const isKetua = p.role?.toLowerCase() === 'ketua';
                const isWakil = p.role?.toLowerCase() === 'wakil';

                const rawDate = p.claimedAt || p.verifiedAt;
                const claimedDate = rawDate
                  ? new Date(rawDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null;

                return (
                  <tr key={i} className="hover:bg-neutral-900/40 transition h-[44px]">
                    {/* 1. Nama Lengkap */}
                    <td className="px-4 py-2 font-medium text-white truncate">
                      {p.namaLengkap || p.nama || <span className="text-neutral-600 italic">Data kosong</span>}
                    </td>

                    {/* 2. Discord Username */}
                    <td className="px-4 py-2 font-mono text-pink-400 truncate">
                      @{p.discord}
                    </td>

                    {/* 3. IGN (In-Game Name) */}
                    <td className="px-4 py-2 text-neutral-300 truncate">
                      {p.ign}
                    </td>

                    {/* 4. ID Duel Links */}
                    <td className="px-4 py-2 text-neutral-400 font-mono text-xs truncate">
                      {p.idDuelLinks}
                    </td>

                    {/* 5. Jabatan / Role (Dipisah ke kolom sendiri) */}
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                          isKetua
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : isWakil
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        {p.role || 'Anggota'}
                      </span>
                    </td>

                    {/* 6. Status Discord + Waktu Klaim */}
                    <td className="px-4 py-2 text-center">
                      {p.hasRoleDiscord ? (
                        <div className="inline-flex flex-col items-center">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </div>
                          {claimedDate && (
                            <span className="text-[9px] text-neutral-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {claimedDate}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" /> Missing
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



================================================
FILE: app/admin/dashboard/hooks/use-admin-teams.ts
================================================
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export interface Player {
  nama: string;
  discord: string;
  ign: string;
  idDuelLinks: string;
  role: string;
  hasRoleDiscord: boolean;
  discordId?: string | null;
}

export interface Team {
  id: string;
  no: number;
  namaTim: string;
  email: string;
  waktuRegis: string;
  warna: string;
  logo: string;
  buktiTransfer: string;
  editToken: string;
  editUrl: string;
  adminEditUrl: string;
  players: Player[];
  rosterStatus: string;
}

export function useAdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRoster, setSelectedRoster] = useState<Team | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/teams');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Gagal memuat data tim');
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchSearch =
        team.namaTim.toLowerCase().includes(search.toLowerCase()) ||
        team.email.toLowerCase().includes(search.toLowerCase());

      const [verified, total] = team.rosterStatus.split('/');
      if (filter === 'complete') {
        return matchSearch && verified === total;
      }
      if (filter === 'incomplete') {
        return matchSearch && verified !== total;
      }
      return matchSearch;
    });
  }, [teams, search, filter]);

  return {
    teams: filteredTeams,
    totalCount: teams.length,
    search,
    setSearch,
    filter,
    setFilter,
    selectedRoster,
    setSelectedRoster,
    previewImg,
    setPreviewImg,
    isLoading,
    error,
    refresh: fetchTeams,
    logout,
  };
}



================================================
FILE: app/api/admin/auth/route.ts
================================================
import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { userAgent } from 'next/server';
import { discordAPI } from '@/lib/discord/utils'; 
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

// Helper Kirim Embed ke Channel Log Discord
async function sendDiscordLog(embed: any) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [embed]
    });
  } catch (err) {
    console.error('Gagal kirim log admin ke discord:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUser = process.env.BASIC_AUTH_USER;
    const validPwd = process.env.BASIC_AUTH_PWD;

    if (!validUser || !validPwd) {
      return NextResponse.json({ error: 'Kredensial server (ENV) belum diatur' }, { status: 500 });
    }

    // Ekstrak Data Client untuk Logging
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
    
    const { browser, device, os } = userAgent(request);
    const deviceType = device.type === 'mobile' ? 'HP' : device.type === 'tablet' ? 'Tablet' : 'PC/Laptop';
    const browserName = browser.name || 'Unknown Browser';
    const osName = os.name || 'Unknown OS';
    
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

    // Paksa Username menjadi Lowercase
    const inputUser = username ? username.toLowerCase().trim() : '';
    const expectedUser = validUser.toLowerCase().trim();

    const isUserCorrect = inputUser === expectedUser;
    const isPwdCorrect = password === validPwd;

    // --- 1. JIKA LOGIN BERHASIL ---
    if (isUserCorrect && isPwdCorrect) {
      const response = NextResponse.json({ success: true });

      // 🟢 Set Cookie via Response Header dengan Path '/' (Durasi 1 Jam)
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 Jam
      });

      // Simpan Log Sukses di Redis KV
      const logSuccess = `[SUKSES] ${timestamp} | User: ${inputUser} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType} (${osName})`;
      await kv.lpush('admin:login_logs', logSuccess);
      await kv.ltrim('admin:login_logs', 0, 99);

      // Kirim Notif Discord (Embed Hijau)
      await sendDiscordLog({
        title: "✅ Admin Login Berhasil",
        color: 0x22c55e, // Hijau
        fields: [
          { name: "👤 User", value: `**${inputUser}**`, inline: true },
          { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
          { name: "🌐 Browser", value: browserName, inline: true },
          { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
          { name: "📡 IP Asli", value: `||${ip}||`, inline: true }
        ],
        footer: { text: "TWI Security System" },
        timestamp: new Date().toISOString()
      });

      return response;
    }

    // --- 2. JIKA LOGIN GAGAL ---
    let errorMessage = 'Username dan password salah';
    if (isUserCorrect && !isPwdCorrect) {
      errorMessage = 'Password salah';
    } else if (!isUserCorrect && isPwdCorrect) {
      errorMessage = 'Username salah';
    }

    // Simpan Log Gagal di Redis KV
    const logFailed = `[GAGAL - ${errorMessage.toUpperCase()}] ${timestamp} | IP: ${ip} (${city}, ${country}) | Device: ${deviceType}`;
    await kv.lpush('admin:login_logs', logFailed);
    await kv.ltrim('admin:login_logs', 0, 99);

    const failedFields = [];

    if (!isUserCorrect) {
      failedFields.push({ name: "🕵️‍♂️ Username Dicoba", value: `\`${inputUser || '-'}\``, inline: true });
    }

    if (!isPwdCorrect) {
      failedFields.push({ name: "🔑 Password Dicoba", value: `\`${password || '-'}\``, inline: true });
    }

    failedFields.push(
      { name: "📱 Device", value: `${deviceType} (${osName})`, inline: true },
      { name: "🌐 Browser", value: browserName, inline: true },
      { name: "📍 Lokasi", value: `${city}, ${country}`, inline: true },
      { name: "📡 IP Address", value: `||${ip}||`, inline: true }
    );

    await sendDiscordLog({
      title: "🚨 Peringatan: Percobaan Login Gagal!",
      description: `Seseorang mencoba mengakses panel Admin Dashboard.\n**Status Kegagalan:** \`${errorMessage}\``,
      color: 0xef4444, // Merah
      fields: failedFields,
      footer: { text: "TWI Security System - Audit Log" },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error Auth API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
      }



================================================
FILE: app/api/admin/cleanup-orphans/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST() {
  try {
    // 1. Ambil semua key tim yang sah & map verifikasi discord
    const teamKeys = await kv.keys('teams:*');
    const verifiedUsersData = (await kv.hgetall('global:verified_users')) || {};
    const verifiedMap = verifiedUsersData as Record<string, string>;

    const validPlayers: any[] = [];
    const validTeams = new Set<string>();

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.players) {
        const teamSlug = key.replace('teams:', '');
        validTeams.add(teamSlug);

        const players =
          typeof teamData.players === 'string'
            ? JSON.parse(teamData.players)
            : teamData.players;

        if (Array.isArray(players)) {
          players.forEach((p: any) => {
            validPlayers.push(p);
          });
        }
      }
    }

    // 2. NUKE: Hapus Set Global Lama
    await kv.del('global:discord');
    await kv.del('global:discord_ids');
    await kv.del('global:ign');
    await kv.del('global:duellinks');
    await kv.del('global:teams');
    await kv.del('global:duelId'); // Hapus key legacy jika ada

    // BASMI SELURUH KEY SPAM player:* DARI REDIS
    const spamPlayerKeys = await kv.keys('player:*');
    if (spamPlayerKeys.length > 0) {
      await kv.del(...spamPlayerKeys);
    }

    // 3. REBUILD: HANYA SET GLOBAL RESMI (Preserve Casing / Huruf Besar-Kecil)
    for (const slug of Array.from(validTeams)) {
      await kv.sadd('global:teams', slug);
    }

    let rebuildCount = 0;
    for (const p of validPlayers) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const originalId = p.idDuelLinks ? p.idDuelLinks.toString().trim() : '';

      if (originalDiscord) {
        // Simpan username Discord asli ke set global:discord
        await kv.sadd('global:discord', originalDiscord);

        // Cari ID angka dari buku besar global:verified_users
        const searchKey = originalDiscord.toLowerCase();
        const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKey];
        if (discordId) {
          await kv.sadd('global:discord_ids', discordId);
        }
      }

      if (originalIgn) {
        await kv.sadd('global:ign', originalIgn);
      }

      if (originalId) {
        await kv.sadd('global:duellinks', originalId);
      }

      rebuildCount++;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalTim: validTeams.size,
        totalPemain: rebuildCount,
        spamPlayerKeysDihapus: spamPlayerKeys.length,
      },
    });
  } catch (error: any) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
        }



================================================
FILE: app/api/admin/delete-team/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { v2 as cloudinary } from 'cloudinary';

// ⚙️ Konfigurasi Cloudinary Admin API
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🛠️ Helper: Ekstrak "Public ID" Cloudinary dari URL Web
function getCloudinaryPublicId(url: string, type: 'logo' | 'bukti') {
  try {
    if (!url) return null;
    const urlObj = new URL(url);
    const filenameWithExt = urlObj.pathname.split('/').pop();
    if (!filenameWithExt) return null;
    
    const filename = filenameWithExt.split('.')[0];
    const folder = type === 'logo' ? 'twi-season-7/logos' : 'twi-season-7/bukti';
    return `${folder}/${filename}`;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    // 1. Ambil data tim & map verified user
    const [team, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan di database.' }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // =========================================================================
    // 1. CLOUDINARY CLEANUP (Hapus Gambar Logo & Bukti Transfer)
    // =========================================================================
    const logoPublicId = getCloudinaryPublicId(team.logoTim as string, 'logo');
    if (logoPublicId) {
      await cloudinary.uploader.destroy(logoPublicId).catch((err) => {
        console.error(`Gagal hapus logo ${logoPublicId} di Cloudinary:`, err);
      });
    }

    const buktiPublicId = getCloudinaryPublicId(team.buktiTransfer as string, 'bukti');
    if (buktiPublicId) {
      await cloudinary.uploader.destroy(buktiPublicId).catch((err) => {
        console.error(`Gagal hapus bukti transfer ${buktiPublicId} di Cloudinary:`, err);
      });
    }

    // =========================================================================
    // 2. DISCORD FULL CLEANUP (TERMASUK COPOT ROLE KETUA, WAKIL & DUELIST)
    // =========================================================================
    
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();
      const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord];
      const roleJabatan = (p.role || '').toLowerCase();

      if (discordId) {
        // A. Reset Nickname Pemain (Copot IGN)
        try {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}`, 'PATCH', { nick: null });
        } catch (err) {
          console.error(`Gagal reset nickname user ${originalDiscord}:`, err);
        }

        // B. Copot Role Jabatan (Ketua / Wakil) di Discord
        if (roleJabatan === 'ketua' && DISCORD_CONFIG.ROLE_KETUA) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_KETUA}`, 'DELETE').catch(() => {});
        } else if ((roleJabatan === 'wakil' || roleJabatan === 'wakil ketua') && DISCORD_CONFIG.ROLE_WAKIL) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_WAKIL}`, 'DELETE').catch(() => {});
        }

        // C. Copot Role Duelist (Karena timnya sudah bubar/diskualifikasi)
        if (DISCORD_CONFIG.ROLE_DUELIST) {
          await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.ROLE_DUELIST}`, 'DELETE').catch(() => {});
        }
      }
    }

    // D. Hapus Role Tim
    const roleId = team.discordRoleId || team.roleId;
    if (roleId) {
      await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/roles/${roleId}`, 'DELETE').catch(() => {});
    }

    // E. Hapus TEXT Channel & VOICE Channel
    const channelId = team.discordChannelId || team.channelId;
    if (channelId) {
      await discordAPI(`/channels/${channelId}`, 'DELETE').catch(() => {});
    }
    const voiceChannelId = team.discordVoiceChannelId;
    if (voiceChannelId) {
      await discordAPI(`/channels/${voiceChannelId}`, 'DELETE').catch(() => {});
    }

    // F. Hapus Pesan Embed di Channel #roster, #bukti-transfer, dan #logo
    if (team.adminMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${team.adminMsgId}`, 'DELETE').catch(() => {});
    }
    if (team.financeMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages/${team.financeMsgId}`, 'DELETE').catch(() => {});
    }
    if (team.creativeMsgId) {
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOGO}/messages/${team.creativeMsgId}`, 'DELETE').catch(() => {});
    }

    // =========================================================================
    // 3. DATABASE SAPU BERSIH (EXACT MATCH)
    // =========================================================================
    for (const p of players) {
      const originalDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const searchKeyDiscord = originalDiscord.toLowerCase();
      const originalIgn = p.ign ? p.ign.trim() : '';
      const idDuelLinks = p.idDuelLinks ? p.idDuelLinks.toString().trim() : '';

      if (originalDiscord) {
        await kv.srem('global:discord', originalDiscord);
        await kv.del(`player:${searchKeyDiscord}`);
        
        await kv.hdel('global:verified_users', originalDiscord);
        await kv.hdel('global:verified_users', searchKeyDiscord);

        const discordId = verifiedMap[originalDiscord] || verifiedMap[searchKeyDiscord];
        if (discordId) {
          await kv.srem('global:discord_ids', discordId);
        }
      }
      if (originalIgn) {
        await kv.srem('global:ign', originalIgn);
      }
      if (idDuelLinks) {
        await kv.srem('global:duellinks', idDuelLinks);
        await kv.srem('global:duelId', idDuelLinks);
      }
    }

    if (team.editToken) {
      await kv.del(`token:map:${team.editToken}`);
    }
    await kv.del(`teams:${teamSlug}`);
    await kv.srem('global:teams', teamSlug);

    return NextResponse.json({ success: true, message: 'Tim beserta seluruh channel, role tim/ketua/wakil/duelist, roster, logo, bukti transfer, dan jejak datanya berhasil dibasmi!' });
  } catch (error: any) {
    console.error('Error delete team:', error);
    return NextResponse.json({ error: 'Gagal menghapus tim: ' + error.message }, { status: 500 });
  }
      }
      



================================================
FILE: app/api/admin/inspect-redis/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Ambil hanya list nama key-nya saja
    const keys = await kv.keys('*');

    return NextResponse.json({
      success: true,
      total: keys.length,
      keys: keys, // Contoh output: ["twi:teams_list", "twi:roulette_state", "msg_reminder:ch_match"]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}



================================================
FILE: app/api/admin/sync-emergency/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) {
      return NextResponse.json({ error: 'Slug tim wajib diisi.' }, { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(kvKey),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: `Data tim '${teamSlug}' tidak ditemukan di Redis.` }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const namaTim = (team.namaTim as string) || 'UNKNOWN';
    const warna = (team.warna as string) || '#00FFFF';
    const createdAt = (team.createdAt as string) || new Date().toISOString();
    const email = (team.email as string) || '';
    const logoTim = (team.logoTim as string) || (team.logo as string) || '';
    const buktiTransfer = (team.buktiTransfer as string) || '';
    const teamRoleId = (team.discordRoleId || team.roleId) as string;
    
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // Channel & Embed IDs dari KV
    const textChannelId = team.discordChannelId as string;
    const voiceChannelId = team.discordVoiceChannelId as string;
    const categoryId = DISCORD_CONFIG.CT_TEAM_ID; // Fallback ke Kategori Tim di config

    const adminMsgId = team.adminMsgId as string;
    const rosterMsgId = team.rosterMsgId as string;
    const creativeMsgId = team.creativeMsgId as string;
    const financeMsgId = team.financeMsgId as string;
    const trackerMsgId = team.trackerMsgId as string;
    const editReminderMsgId = team.editReminderMsgId as string;

    const GUILD_ID = DISCORD_CONFIG.GUILD_ID;
    const hexDecimal = hexToDecimal(warna, 65535);

    // =========================================================================
    // 1. SINKRONISASI ROLE & CHANNEL DISCORD
    // =========================================================================

    // A. Update Role Tim (Nama & Warna)
    if (teamRoleId && GUILD_ID) {
      await discordAPI(`/guilds/${GUILD_ID}/roles/${teamRoleId}`, 'PATCH', {
        name: namaTim,
        color: hexDecimal,
      }).catch(err => console.error(`[Sync Role Failed] RoleId ${teamRoleId}:`, err));
      await sleep(300);
    }

    // B. Update Text Channel (Nama sesuai slug standar & Topic)
    if (textChannelId) {
      const cleanSlugName = teamSlug.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await discordAPI(`/channels/${textChannelId}`, 'PATCH', {
        name: cleanSlugName,
        parent_id: categoryId,
        topic: `Official Text Channel for ${namaTim}`,
      }).catch(err => console.error(`[Sync Text Channel Failed] ChanId ${textChannelId}:`, err));
      await sleep(300);
    }

    // C. Update Voice Channel
    if (voiceChannelId) {
      await discordAPI(`/channels/${voiceChannelId}`, 'PATCH', {
        name: namaTim,
        parent_id: categoryId,
      }).catch(err => console.error(`[Sync Voice Channel Failed] VoiceId ${voiceChannelId}:`, err));
      await sleep(300);
    }

    // =========================================================================
    // 2. SINKRONISASI ROSTER PEMAIN, NICKNAME & ROLE MEMBER
    // =========================================================================
    let verifiedCount = 0;
    let trackerRosterText = "";
    let teamDataChanged = false;

    let ketuaObj = { ign: "-" };
    let wakilObj = { ign: "-" };
    const playerListArray: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      let currentDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const duelId = p.idDuelLinks || p.duelId || '';
      const roleJabatan = p.role || 'Anggota';
      let isUserVerified = false;

      // Filter Ketua / Wakil untuk Embed Roster
      if (roleJabatan === 'Ketua') ketuaObj = p;
      if (roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') wakilObj = p;
      playerListArray.push(`${originalIgn} (${duelId})`);

      if (originalIgn) await kv.sadd('global:ign', originalIgn);
      if (duelId) await kv.sadd('global:duellinks', duelId.toString().trim());

      if (currentDiscord) {
        const searchKeyDiscord = currentDiscord.toLowerCase();
        const knownUserId = verifiedMap[currentDiscord] || verifiedMap[searchKeyDiscord];
        let targetUserId = knownUserId;
        let memberData = null;

        try {
          if (knownUserId) {
            await sleep(400);
            memberData = await discordAPI(`/guilds/${GUILD_ID}/members/${knownUserId}`, 'GET');
            
            if (memberData && memberData.user) {
              const realDiscordUsername = memberData.user.username;
              if (realDiscordUsername.toLowerCase() !== searchKeyDiscord) {
                await kv.srem('global:discord', currentDiscord);
                await kv.hdel('global:verified_users', currentDiscord);
                await kv.hdel('global:verified_users', searchKeyDiscord);

                currentDiscord = realDiscordUsername;
                p.discord = realDiscordUsername;
                teamDataChanged = true;

                verifiedMap[realDiscordUsername] = knownUserId;
                verifiedMap[realDiscordUsername.toLowerCase()] = knownUserId;
                await kv.hset('global:verified_users', { [realDiscordUsername]: knownUserId });
              }
            }
          } else {
            await sleep(400);
            const searchRes = await discordAPI(`/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(currentDiscord)}&limit=5`, 'GET');
            memberData = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
            
            if (memberData) {
              targetUserId = memberData.user.id;
              await kv.hset('global:verified_users', { [currentDiscord]: targetUserId });
              await kv.sadd('global:discord_ids', targetUserId);
              verifiedMap[currentDiscord] = targetUserId;
              verifiedMap[searchKeyDiscord] = targetUserId;
            }
          }

          if (memberData && targetUserId) {
            await kv.sadd('global:discord', currentDiscord);
            const currentRoles = memberData.roles || [];
            const newRoles = new Set(currentRoles);

            const rolesToAdd = [];
            if (teamRoleId) rolesToAdd.push(teamRoleId);
            if (DISCORD_CONFIG.ROLE_DUELIST) rolesToAdd.push(DISCORD_CONFIG.ROLE_DUELIST);
            if (DISCORD_CONFIG.ROLE_VERIFIED) rolesToAdd.push(DISCORD_CONFIG.ROLE_VERIFIED);
            if (roleJabatan === 'Ketua' && DISCORD_CONFIG.ROLE_KETUA) rolesToAdd.push(DISCORD_CONFIG.ROLE_KETUA);
            else if ((roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') && DISCORD_CONFIG.ROLE_WAKIL) rolesToAdd.push(DISCORD_CONFIG.ROLE_WAKIL);

            rolesToAdd.forEach(r => newRoles.add(r));

            try {
              await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { 
                nick: originalIgn,
                roles: Array.from(newRoles)
              });
              isUserVerified = true;
              verifiedCount++;
              await sleep(400); 
            } catch (bulkErr) {
              try {
                await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { nick: originalIgn }).catch(() => null);
                for (const rId of rolesToAdd) {
                  await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}/roles/${rId}`, 'PUT').catch(() => null);
                  await sleep(200);
                }
                isUserVerified = true;
                verifiedCount++;
              } catch(fallbackErr) {
                console.error(`Fallback Gagal untuk @${currentDiscord}:`, fallbackErr);
              }
            }
          }
        } catch (err) {
          console.error(`Gagal sinkronisasi user @${currentDiscord}:`, err);
        }
      }

      trackerRosterText += `${isUserVerified ? '✅' : '❌'} **${originalIgn}** (\`@${currentDiscord}\`) - *${roleJabatan}*\n`;
    }

    if (teamDataChanged) {
      await kv.hset(kvKey, { players: JSON.stringify(players) });
    }

    // =========================================================================
    // 3. SINKRONISASI ENAM (6) EMBED DISCORD SEKALIGUS
    // =========================================================================

    // A. Embed Tracker (Di Channel Khusus Tim)
    if (textChannelId && trackerMsgId) {
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `**DAFTAR ROSTER:**\n${trackerRosterText}`,
          color: hexDecimal,
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${textChannelId}/messages/${trackerMsgId}`, 'PATCH', trackerPayload).catch(() => {});
      await sleep(300);
    }

    // B. Embed Roster (Channel Roster Utama / Config)
    if (rosterMsgId) {
      const rosterChannel = DISCORD_CONFIG.CH_ROSTER;
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketuaObj.ign || '-', inline: true },
            { name: "Wakil", value: wakilObj.ign || '-', inline: true },
            { name: "Players", value: playerListArray.join('\n') || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${rosterChannel}/messages/${rosterMsgId}`, 'PATCH', rosterPayload).catch(() => {});
      await sleep(300);
    }

    // C. Embed Creative (Channel Logo / Config)
    if (creativeMsgId) {
      const creativeChannel = DISCORD_CONFIG.CH_LOGO;
      
      let directDownloadLogo = logoTim;
      if (logoTim.includes('/upload/logo/')) {
        const splitUrl = logoTim.split('/upload/logo/');
        if (splitUrl.length > 1) {
          let filePath = splitUrl[1]; 
          if (filePath.includes('?')) filePath = filePath.split('?')[0];
          directDownloadLogo = `https://teamwars.web.id/logo/${filePath}/download`;
        }
      }

      const creativePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim Baru: **${namaTim}**!`, 
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: hexDecimal,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      };
      await discordAPI(`/channels/${creativeChannel}/messages/${creativeMsgId}`, 'PATCH', creativePayload).catch(() => {});
      await sleep(300);
    }

    // D. Embed Finance (Channel Bukti / Config)
    if (financeMsgId) {
      const financeChannel = DISCORD_CONFIG.CH_BUKTI;
      const financePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`, 
        embeds: [{
          title: `Detail Registrasi: ${namaTim}`,
          color: hexDecimal,
          description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
          image: { url: buktiTransfer },
          fields: [
            { name: "Status", value: "🟢 Sinkron/Approved", inline: true }
          ],
        }]
      };
      await discordAPI(`/channels/${financeChannel}/messages/${financeMsgId}`, 'PATCH', financePayload).catch(() => {});
      await sleep(300);
    }

    // E. Embed Admin Review (Jika Ada)
    if (adminMsgId) {
      const adminChannel = DISCORD_CONFIG.CH_LOG;
      const adminPayload = {
        embeds: [{
          title: `🛡️ AUDIT ADMIN: ${namaTim}`,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Team Slug", value: `\`${teamSlug}\``, inline: true },
            { name: "Registered Email", value: maskEmail(email), inline: true },
            { name: "Role Mention", value: teamRoleId ? `<@&${teamRoleId}>` : '-', inline: true },
            { name: "Total Roster", value: `${players.length} Pemain`, inline: true }
          ],
          footer: { text: `Audit Engine Auto-Sync • ${getFooterText(createdAt)}` }
        }]
      };
      await discordAPI(`/channels/${adminChannel}/messages/${adminMsgId}`, 'PATCH', adminPayload).catch(() => {});
      await sleep(300);
    }

    // F. Embed Closing Edit Reminder (Jika Ada)
    if (textChannelId && editReminderMsgId) {
      const reminderPayload = createClosingReminderEmbed({
        roleMentionId: teamRoleId,
        namaTim: namaTim,
        email: email,
        sisaWaktuText: "Pendaftaran Dikunci / Ter-sinkronkan",
        hexWarna: warna
      });
      await discordAPI(`/channels/${textChannelId}/messages/${editReminderMsgId}`, 'PATCH', reminderPayload).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi Total (Role, Text/Voice Channel, Roster, & 6 Embed Discord) untuk Tim "${namaTim}" Berhasil!`
    });

  } catch (error: any) {
    console.error('Error Sync Engine:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi tim.' }, { status: 500 });
  }
}



================================================
FILE: app/api/admin/sync-team/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) {
      return NextResponse.json({ error: 'Slug tim wajib diisi.' }, { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(kvKey),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: `Data tim '${teamSlug}' tidak ditemukan di Redis.` }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const namaTim = (team.namaTim as string) || 'UNKNOWN';
    const warna = (team.warna as string) || '#00FFFF';
    const createdAt = (team.createdAt as string) || new Date().toISOString();
    const email = (team.email as string) || '';
    const logoTim = (team.logoTim as string) || (team.logo as string) || '';
    const buktiTransfer = (team.buktiTransfer as string) || '';
    const teamRoleId = (team.discordRoleId || team.roleId) as string;
    
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // Channel & Embed IDs dari KV
    const textChannelId = team.discordChannelId as string;
    const voiceChannelId = team.discordVoiceChannelId as string;
    const categoryId = DISCORD_CONFIG.CT_TEAM_ID; // Fallback ke Kategori Tim di config

    const adminMsgId = team.adminMsgId as string;
    const rosterMsgId = team.rosterMsgId as string;
    const creativeMsgId = team.creativeMsgId as string;
    const financeMsgId = team.financeMsgId as string;
    const trackerMsgId = team.trackerMsgId as string;
    const editReminderMsgId = team.editReminderMsgId as string;

    const GUILD_ID = DISCORD_CONFIG.GUILD_ID;
    const hexDecimal = hexToDecimal(warna, 65535);

    // =========================================================================
    // 1. SINKRONISASI ROLE & CHANNEL DISCORD
    // =========================================================================

    // A. Update Role Tim (Nama & Warna)
    if (teamRoleId && GUILD_ID) {
      await discordAPI(`/guilds/${GUILD_ID}/roles/${teamRoleId}`, 'PATCH', {
        name: namaTim,
        color: hexDecimal,
      }).catch(err => console.error(`[Sync Role Failed] RoleId ${teamRoleId}:`, err));
      await sleep(300);
    }

    // B. Update Text Channel (Nama sesuai slug standar & Topic)
    if (textChannelId) {
      const cleanSlugName = teamSlug.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await discordAPI(`/channels/${textChannelId}`, 'PATCH', {
        name: cleanSlugName,
        parent_id: categoryId,
        topic: `Official Text Channel for ${namaTim}`,
      }).catch(err => console.error(`[Sync Text Channel Failed] ChanId ${textChannelId}:`, err));
      await sleep(300);
    }

    // C. Update Voice Channel
    if (voiceChannelId) {
      await discordAPI(`/channels/${voiceChannelId}`, 'PATCH', {
        name: namaTim,
        parent_id: categoryId,
      }).catch(err => console.error(`[Sync Voice Channel Failed] VoiceId ${voiceChannelId}:`, err));
      await sleep(300);
    }

    // =========================================================================
    // 2. SINKRONISASI ROSTER PEMAIN, NICKNAME & ROLE MEMBER
    // =========================================================================
    let verifiedCount = 0;
    let trackerRosterText = "";
    let teamDataChanged = false;

    let ketuaObj = { ign: "-" };
    let wakilObj = { ign: "-" };
    const playerListArray: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      let currentDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const duelId = p.idDuelLinks || p.duelId || '';
      const roleJabatan = p.role || 'Anggota';
      let isUserVerified = false;

      // Filter Ketua / Wakil untuk Embed Roster
      if (roleJabatan === 'Ketua') ketuaObj = p;
      if (roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') wakilObj = p;
      playerListArray.push(`${originalIgn} (${duelId})`);

      if (originalIgn) await kv.sadd('global:ign', originalIgn);
      if (duelId) await kv.sadd('global:duellinks', duelId.toString().trim());

      if (currentDiscord) {
        const searchKeyDiscord = currentDiscord.toLowerCase();
        const knownUserId = verifiedMap[currentDiscord] || verifiedMap[searchKeyDiscord];
        let targetUserId = knownUserId;
        let memberData = null;

        try {
          if (knownUserId) {
            await sleep(400);
            memberData = await discordAPI(`/guilds/${GUILD_ID}/members/${knownUserId}`, 'GET');
            
            if (memberData && memberData.user) {
              const realDiscordUsername = memberData.user.username;
              if (realDiscordUsername.toLowerCase() !== searchKeyDiscord) {
                await kv.srem('global:discord', currentDiscord);
                await kv.hdel('global:verified_users', currentDiscord);
                await kv.hdel('global:verified_users', searchKeyDiscord);

                currentDiscord = realDiscordUsername;
                p.discord = realDiscordUsername;
                teamDataChanged = true;

                verifiedMap[realDiscordUsername] = knownUserId;
                verifiedMap[realDiscordUsername.toLowerCase()] = knownUserId;
                await kv.hset('global:verified_users', { [realDiscordUsername]: knownUserId });
              }
            }
          } else {
            await sleep(400);
            const searchRes = await discordAPI(`/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(currentDiscord)}&limit=5`, 'GET');
            memberData = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
            
            if (memberData) {
              targetUserId = memberData.user.id;
              await kv.hset('global:verified_users', { [currentDiscord]: targetUserId });
              await kv.sadd('global:discord_ids', targetUserId);
              verifiedMap[currentDiscord] = targetUserId;
              verifiedMap[searchKeyDiscord] = targetUserId;
            }
          }

          if (memberData && targetUserId) {
            await kv.sadd('global:discord', currentDiscord);
            const currentRoles = memberData.roles || [];
            const newRoles = new Set(currentRoles);

            const rolesToAdd = [];
            if (teamRoleId) rolesToAdd.push(teamRoleId);
            if (DISCORD_CONFIG.ROLE_DUELIST) rolesToAdd.push(DISCORD_CONFIG.ROLE_DUELIST);
            if (DISCORD_CONFIG.ROLE_VERIFIED) rolesToAdd.push(DISCORD_CONFIG.ROLE_VERIFIED);
            if (roleJabatan === 'Ketua' && DISCORD_CONFIG.ROLE_KETUA) rolesToAdd.push(DISCORD_CONFIG.ROLE_KETUA);
            else if ((roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') && DISCORD_CONFIG.ROLE_WAKIL) rolesToAdd.push(DISCORD_CONFIG.ROLE_WAKIL);

            rolesToAdd.forEach(r => newRoles.add(r));

            try {
              await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { 
                nick: originalIgn,
                roles: Array.from(newRoles)
              });
              isUserVerified = true;
              verifiedCount++;
              await sleep(400); 
            } catch (bulkErr) {
              try {
                await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { nick: originalIgn }).catch(() => null);
                for (const rId of rolesToAdd) {
                  await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}/roles/${rId}`, 'PUT').catch(() => null);
                  await sleep(200);
                }
                isUserVerified = true;
                verifiedCount++;
              } catch(fallbackErr) {
                console.error(`Fallback Gagal untuk @${currentDiscord}:`, fallbackErr);
              }
            }
          }
        } catch (err) {
          console.error(`Gagal sinkronisasi user @${currentDiscord}:`, err);
        }
      }

      trackerRosterText += `${isUserVerified ? '✅' : '❌'} **${originalIgn}** (\`@${currentDiscord}\`) - *${roleJabatan}*\n`;
    }

    if (teamDataChanged) {
      await kv.hset(kvKey, { players: JSON.stringify(players) });
    }

    // =========================================================================
    // 3. SINKRONISASI ENAM (6) EMBED DISCORD SEKALIGUS
    // =========================================================================

    // A. Embed Tracker (Di Channel Khusus Tim)
    if (textChannelId && trackerMsgId) {
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `**DAFTAR ROSTER:**\n${trackerRosterText}`,
          color: hexDecimal,
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${textChannelId}/messages/${trackerMsgId}`, 'PATCH', trackerPayload).catch(() => {});
      await sleep(300);
    }

    // B. Embed Roster (Channel Roster Utama / Config)
    if (rosterMsgId) {
      const rosterChannel = DISCORD_CONFIG.CH_ROSTER;
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketuaObj.ign || '-', inline: true },
            { name: "Wakil", value: wakilObj.ign || '-', inline: true },
            { name: "Players", value: playerListArray.join('\n') || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${rosterChannel}/messages/${rosterMsgId}`, 'PATCH', rosterPayload).catch(() => {});
      await sleep(300);
    }

    // C. Embed Creative (Channel Logo / Config)
    if (creativeMsgId) {
      const creativeChannel = DISCORD_CONFIG.CH_LOGO;
      
      let directDownloadLogo = logoTim;
      if (logoTim.includes('/upload/logo/')) {
        const splitUrl = logoTim.split('/upload/logo/');
        if (splitUrl.length > 1) {
          let filePath = splitUrl[1]; 
          if (filePath.includes('?')) filePath = filePath.split('?')[0];
          directDownloadLogo = `https://teamwars.web.id/logo/${filePath}/download`;
        }
      }

      const creativePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim Baru: **${namaTim}**!`, 
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: hexDecimal,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      };
      await discordAPI(`/channels/${creativeChannel}/messages/${creativeMsgId}`, 'PATCH', creativePayload).catch(() => {});
      await sleep(300);
    }

    // D. Embed Finance (Channel Bukti / Config)
    if (financeMsgId) {
      const financeChannel = DISCORD_CONFIG.CH_BUKTI;
      const financePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`, 
        embeds: [{
          title: `Detail Registrasi: ${namaTim}`,
          color: hexDecimal,
          description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
          image: { url: buktiTransfer },
          fields: [
            { name: "Status", value: "🟢 Sinkron/Approved", inline: true }
          ],
        }]
      };
      await discordAPI(`/channels/${financeChannel}/messages/${financeMsgId}`, 'PATCH', financePayload).catch(() => {});
      await sleep(300);
    }

    // E. Embed Admin Review (Jika Ada)
    if (adminMsgId) {
      const adminChannel = DISCORD_CONFIG.CH_LOG;
      const adminPayload = {
        embeds: [{
          title: `🛡️ AUDIT ADMIN: ${namaTim}`,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Team Slug", value: `\`${teamSlug}\``, inline: true },
            { name: "Registered Email", value: maskEmail(email), inline: true },
            { name: "Role Mention", value: teamRoleId ? `<@&${teamRoleId}>` : '-', inline: true },
            { name: "Total Roster", value: `${players.length} Pemain`, inline: true }
          ],
          footer: { text: `Audit Engine Auto-Sync • ${getFooterText(createdAt)}` }
        }]
      };
      await discordAPI(`/channels/${adminChannel}/messages/${adminMsgId}`, 'PATCH', adminPayload).catch(() => {});
      await sleep(300);
    }

    // F. Embed Closing Edit Reminder (Jika Ada)
    if (textChannelId && editReminderMsgId) {
      const reminderPayload = createClosingReminderEmbed({
        roleMentionId: teamRoleId,
        namaTim: namaTim,
        email: email,
        sisaWaktuText: "Pendaftaran Dikunci / Ter-sinkronkan",
        hexWarna: warna
      });
      await discordAPI(`/channels/${textChannelId}/messages/${editReminderMsgId}`, 'PATCH', reminderPayload).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi Total (Role, Text/Voice Channel, Roster, & 6 Embed Discord) untuk Tim "${namaTim}" Berhasil!`
    });

  } catch (error: any) {
    console.error('Error Sync Engine:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi tim.' }, { status: 500 });
  }
}



================================================
FILE: app/api/admin/teams/route.ts
================================================
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    if (!session || session.value !== 'authenticated') {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const adminKey = process.env.BASIC_AUTH_PWD || '';

    const [allTeamSlugs, verifiedUsersMap] = await Promise.all([
      kv.smembers('global:teams'),
      kv.hgetall('global:verified_users'),
    ]);

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};

    const allTeamsData = await Promise.all(
      (allTeamSlugs || []).map(async (slug: any) => {
        const data: any = await kv.hgetall(`teams:${slug}`);

        let parsedPlayers = [];
        try {
          parsedPlayers = typeof data?.players === 'string'
            ? JSON.parse(data.players)
            : (data?.players || []);
        } catch (e) {
          parsedPlayers = [];
        }

        const playersWithVerification = parsedPlayers.map((player: any) => {
          const isVerified = Boolean(
            player?.discord && verifiedMap.hasOwnProperty(player.discord)
          );

          return {
            ...player,
            hasRoleDiscord: isVerified,
            discordId: isVerified ? verifiedMap[player.discord] : null,
          };
        });

        return {
          slug,
          ...data,
          players: playersWithVerification,
        };
      })
    );

    const formattedData = allTeamsData
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      })
      .map((team: any, index: number) => {
        const totalPlayers = team.players.length;
        const verifiedPlayers = team.players.filter((p: any) => p.hasRoleDiscord).length;

        // Tarik token edit asli dari DB Redis (editToken)
        const editToken = team.editToken || team.token || team.slug || '';
        
        // Buat Link Edit User & Admin Bypass Key
        const editUrl = `/edit-team/${editToken}`;
        const adminEditUrl = `/edit-team/${editToken}?key=${adminKey}`;

        return {
          id: team.slug,
          no: index + 1,
          namaTim: team.namaTim || 'Unknown',
          email: team.email || '-',
          waktuRegis: team.createdAt || new Date().toISOString(),
          warna: team.warna || '#000000',
          logo: team.logoTim || team.logo || '',
          buktiTransfer: team.buktiTransfer || '',
          editToken,
          editUrl,
          adminEditUrl,
          players: team.players,
          rosterStatus: `${verifiedPlayers}/${totalPlayers}`,
        };
      });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error Admin Teams API:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pendaftaran' },
      { status: 500 }
    );
  }
}



================================================
FILE: app/api/approve/route.ts
================================================
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '@/lib/config';
import { getApprovalTemplate } from '@/lib/email-templates'; 
import { discordAPI } from '@/lib/discord/utils'; 
import { DISCORD_CONFIG } from '@/lib/discord/config'; 

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    // 1. Tangkap nama tim (slug) dari URL
    const searchParams = request.nextUrl.searchParams;
    const teamSlug = searchParams.get('team');

    if (!teamSlug) {
      return new NextResponse('Parameter tim tidak ditemukan.', { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const teamData: any = await kv.hgetall(kvKey);

    // 2. Validasi apakah tim ada di database
    if (!teamData) {
      return new NextResponse('Tim tidak ditemukan di database.', { status: 404 });
    }

    const TeamName = teamData.namaTim;
    const isAlreadyApproved = teamData.statusVerifikasi === 'Approved';

    // ==========================================
    // HELPER: Rangka HTML Standar untuk Layar Admin Browser
    // ==========================================
    const renderHTML = (content: string) => `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Konfirmasi Pembayaran TWI</title>
      </head>
      <body style="background-color: #020817; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px;">
        ${content}
      </body>
      </html>
    `;

    // 3. Update status di Redis jadi Approved (Jika belum)
    if (!isAlreadyApproved) {
      await kv.hset(kvKey, { statusVerifikasi: 'Approved' });
    }

    // ==========================================
    // 4. UPDATE PESAN DISCORD (SELALU DIJALANKAN)
    // ==========================================
    // Meskipun sudah di-approve sebelumnya, embed Discord TETAP diubah jadi Hijau
    if (teamData.financeMsgId) {
      // 1. Format tanggal agar rapi (Contoh: 20 Juli 2026 pukul 21.08)
      const d = new Date();
      const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.');
      const waktuKonfirmasiDiscord = `${tgl} pukul ${waktu}`;

      try {
        await discordAPI(`/channels/${DISCORD_CONFIG.CH_BUKTI}/messages/${teamData.financeMsgId}`, 'PATCH', {
          embeds: [{
            title: `Detail Registrasi: ${TeamName}`,
            color: 3066993, // Warna Hijau (Success)
            description: `**✅ PEMBAYARAN TELAH DIKONFIRMASI!**\nTim verifikator telah menyetujui setoran ini dan email konfirmasi otomatis telah meluncur ke peserta.`,
            image: { url: teamData.buktiTransfer },
            fields: [
              { 
                name: "Waktu Konfirmasi", 
                value: `${waktuKonfirmasiDiscord} WIB`, // 👈 Menggunakan format yang sudah dirapikan
                inline: true
              },
              { name: "Status", value: "✅ Terkonfirmasi", inline: true }
            ],
          }]
        });
      } catch (err) {
        console.error("Gagal edit pesan Discord (Bot API):", err);
      }
    }
  
    // ==========================================
    // 5. PENCEGAH SPAM EMAIL (BERHENTI DI SINI JIKA SUDAH PERNAH APPROVED)
    // ==========================================
    if (isAlreadyApproved) {
      return new NextResponse(renderHTML(`
        <div style="font-family: sans-serif; text-align: center; background-color: #0f172a; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #1e293b; color: #f8fafc; width: 100%;">
          <h2 style="color: #eab308; margin-top: 0;">⚠️ Tim ${TeamName.toUpperCase()} Sudah Pernah Dikonfirmasi!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">Status pesan di Discord <b>telah berhasil diperbarui</b> menjadi hijau, namun email konfirmasi resmi <b>tidak dikirim ulang</b> untuk mencegah spam ke peserta.</p>
          <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini.</p>
        </div>
      `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ==========================================
    // 6. KIRIM EMAIL KONFIRMASI (HANYA JIKA BARU PERTAMA KALI APPROVED)
    // ==========================================
    if (teamData.email) {
      const waktuKonfirmasi = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "long",
        timeStyle: "medium"
      }) + " WIB";

      let parsedPlayers = [];
      try {
        parsedPlayers = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : (teamData.players || []);
      } catch (e) {
        parsedPlayers = [];
      }
      
      const ketuaTim = parsedPlayers.find((p: any) => p.role === 'Ketua') || teamData.ketua || { namaLengkap: 'Kapten' };
      const warnaTim = teamData.warna || '#4CAF50';
      const editToken = teamData.editToken || '';

      const emailHtml = getApprovalTemplate({
        namaTim: TeamName,
        warna: warnaTim,
        namaKetua: ketuaTim.namaLengkap,
        waktuKonfirmasi,
        editToken
      });

      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: teamData.email,
        subject: `✅ Pendaftaran Berhasil: Tim ${TeamName} [Teamwars S7]`,
        html: emailHtml
      });
    }

    // 7. Tampilkan Pesan Sukses ke Layar Admin Finance (Untuk approve pertama kali)
    return new NextResponse(renderHTML(`
      <div style="font-family: sans-serif; text-align: center; background-color: #052e16; padding: 40px; border-radius: 12px; max-width: 500px; border: 1px solid #166534; color: #f0fdf4; width: 100%;">
        <h1 style="color: #4ade80; margin-top: 0;">✅ Berhasil Dikonfirmasi!</h1>
        <p style="color: #bbf7d0; font-size: 18px; margin-bottom: 5px;">Status tim <strong>${TeamName}</strong> telah diubah menjadi Approved.</p>
        <p style="color: #86efac; margin-top: 0;">Email konfirmasi resmi otomatis telah dikirim.</p>
        <p style="color: #475569; margin-top: 30px; font-size: 14px;">Anda sudah bisa menutup tab browser ini dan kembali ke Discord.</p>
      </div>
    `), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error) {
    console.error("Error approve tim:", error);
    return new NextResponse('Terjadi kesalahan internal server.', { status: 500 });
  }
  }



================================================
FILE: app/api/check-team/route.ts
================================================
import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    let token = searchParams.get('token');

    if (!name) {
      return NextResponse.json({ error: "Nama tim wajib disertakan" }, { status: 400 });
    }

    // 💡 DETEKSI OTOMATIS MODE EDIT DARI REFERER URL (Jika frontend lupa ngirim token)
    if (!token) {
      const referer = request.headers.get('referer') || '';
      // Contoh referer: https://www.teamwars.web.id/edit-team/e0739a40-be76-4608-b07d-feab16bb064e?key=...
      const editMatch = referer.match(/\/edit-team\/([a-zA-Z0-9-]+)/);
      if (editMatch && editMatch[1]) {
        token = editMatch[1]; // Otomatis dapat token dari URL edit!
      }
    }

    // Normalisasi slug
    const teamSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // Jika dalam Mode Edit (punya token), cek apakah slug ini milik tim dia sendiri
    if (token) {
      const currentTeamSlug = await kv.get(`token:map:${token}`);
      if (currentTeamSlug === teamSlug) {
        // Nama tidak berubah / milik tim sendiri -> Izinkan!
        return NextResponse.json({ available: true });
      }
    }

    // Cek di global index Redis untuk pendaftaran baru
    const isExist = await kv.sismember("global:teams", teamSlug);

    return NextResponse.json({ available: !isExist });
  } catch (error) {
    console.error('Error Check Team API:', error);
    return NextResponse.json({ available: true }, { status: 500 }); 
  }
}



================================================
FILE: app/api/create-emojis/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

// 🗜️ Fungsi Pembantu: Mengompresi URL logo menggunakan Cloudinary CDN Transformation
function getOptimizedLogoUrl(originalUrl: string): string {
  if (!originalUrl || !originalUrl.startsWith('http')) return originalUrl;

  // Jika URL sudah merupakan URL Cloudinary murni
  if (originalUrl.includes('res.cloudinary.com') && originalUrl.includes('/upload/')) {
    return originalUrl.replace('/upload/', '/upload/w_128,h_128,c_fill,q_auto,f_png/');
  }

  // Jika URL berformat lain atau URL masking, manfaatkan Fetch URL Cloudinary untuk kompresi otomatis
  if (CLOUD_NAME) {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/w_128,h_128,c_fill,q_auto,f_png/${encodedUrl}`;
  }

  return originalUrl;
}

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    if (!teamKeys || teamKeys.length === 0) {
      return NextResponse.json({ success: false, message: "Tidak ada tim ditemukan di database." });
    }

    const rawTeams = await Promise.all(
      teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
    );

    const teams = rawTeams
      .filter((team): team is Record<string, any> => Boolean(team))
      .map((team) => ({
        name: team?.namaTim || team?.name || 'Unknown Team',
        logo: team?.logoTim || team?.logo || '',
      }));

    let existingEmojis: any[] = [];
    try {
      existingEmojis = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'GET');
    } catch (e) {
      console.warn("Gagal mengambil daftar emoji eksisting:", e);
    }

    const existingNames = new Set(
      Array.isArray(existingEmojis) ? existingEmojis.map((e) => e.name) : []
    );

    let successCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const team of teams) {
      if (!team.logo || !team.logo.startsWith("http")) {
        failedCount++;
        details.push(`⚠️ Skipped ${team.name}: URL logo tidak valid.`);
        continue;
      }

      const rawEmojiName = team.name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();

      const validName = (rawEmojiName.length < 2 ? `t_${rawEmojiName}` : rawEmojiName).slice(0, 32);

      if (existingNames.has(validName)) {
        failedCount++;
        details.push(`ℹ️ Skipped ${team.name}: Emoji :${validName}: sudah ada di Discord.`);
        continue;
      }

      try {
        // 🚀 Terapkan kompresi URL otomatis (Ukuran turun dari ~2 MB jadi ~15 KB)
        const optimizedUrl = getOptimizedLogoUrl(team.logo);

        const imageRes = await fetch(optimizedUrl);
        if (!imageRes.ok) {
          // Fallback ke URL asli jika fetch Cloudinary terhalang
          const fallbackRes = await fetch(team.logo);
          if (!fallbackRes.ok) throw new Error(`Gagal download logo (${fallbackRes.statusText})`);
          var arrayBuffer = await fallbackRes.arrayBuffer();
          var contentType = fallbackRes.headers.get("content-type") || "image/png";
        } else {
          var arrayBuffer = await imageRes.arrayBuffer();
          var contentType = imageRes.headers.get("content-type") || "image/png";
        }
        
        const buffer = Buffer.from(arrayBuffer);

        // Pengecekan Batas Ukuran File Discord (256 KB)
        if (buffer.length > 256 * 1024) {
          failedCount++;
          details.push(`❌ Gagal ${team.name}: File masih kebesaran (${Math.round(buffer.length / 1024)} KB > 256 KB).`);
          continue;
        }

        const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`;

        // Kirim request ke Discord API
        const res = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/emojis`, 'POST', {
          name: validName,
          image: base64Image,
        });

        if (res && res.id) {
          successCount++;
          details.push(`✅ Berhasil: :${validName}: untuk ${team.name}`);
        } else {
          failedCount++;
          const errorMsg = res?.message || (res ? JSON.stringify(res) : "Response kosong dari Discord");
          details.push(`❌ Gagal ${team.name}: ${errorMsg}`);
        }
      } catch (err: any) {
        failedCount++;
        details.push(`❌ Error ${team.name}: ${err?.message || String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: `Total diproses: ${teams.length} | Berhasil: ${successCount} | Gagal/Skipped: ${failedCount}`,
      logs: details,
    });

  } catch (error: any) {
    console.error("API Error create-emojis:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
                   }
      



================================================
FILE: app/api/cron/ai-exhibition/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ai } from '@/lib/gemini';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Ambil Channel ID Exhibition dari file config
const EXHIBITION_CHANNEL_ID = DISCORD_CONFIG.CH_EXHI;

// Helper pengecekan emoji (Abaikan jika mayoritas emoji/simbol)
function isMajorityEmoji(text: string): boolean {
  if (!text) return true;
  const cleanText = text.replace(/\s+/g, '');
  if (cleanText.length === 0) return true;

  const letterAndNumberMatches = cleanText.match(/[\p{L}\p{N}]/gu) || [];
  const ratio = letterAndNumberMatches.length / cleanText.length;
  return ratio < 0.4;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isReset = searchParams.get('reset') === 'true';

    if (!EXHIBITION_CHANNEL_ID) {
      return NextResponse.json({ error: 'EXHIBITION_CHANNEL_ID belum diset di DISCORD_CONFIG.channels.exhibition' }, { status: 400 });
    }

    const redisKey = `ai_replied:${EXHIBITION_CHANNEL_ID}`;

    if (isReset) {
      await kv.del(redisKey);
      return NextResponse.json({ success: true, message: 'Cache Redis berhasil di-reset!' });
    }

    // ⚡ 1. PARALLEL FETCH: Ambil pesan Discord + Cek Redis bersamaan
    const [rawMessages, lastRepliedMsgId] = await Promise.all([
      discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages?limit=5`, 'GET'),
      kv.get<string>(redisKey)
    ]);

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ message: 'Tidak ada pesan di channel exhibition' });
    }

    const lastMsg = rawMessages[0]; // Pesan paling baru

    // 🛑 Rule 1: Skip jika pesan dari Bot
    if (lastMsg.author?.bot) {
      return NextResponse.json({ message: 'Pesan terakhir dikirim oleh Bot, di-skip.' });
    }

    // 🛑 Rule 2: Skip jika teks kosong
    if (!lastMsg.content || lastMsg.content.trim() === '') {
      return NextResponse.json({ message: 'Pesan berupa media/stiker, di-skip.' });
    }

    // 🛑 Rule 3: Skip jika mayoritas emoji
    if (isMajorityEmoji(lastMsg.content)) {
      return NextResponse.json({ message: 'Pesan mayoritas emoji/simbol, di-skip.' });
    }

    // 🛑 Rule 4: Anti-Spam (Sudah pernah dibalas)
    if (lastRepliedMsgId === lastMsg.id) {
      return NextResponse.json({ message: 'Pesan ini sudah dibalas sebelumnya.' });
    }

    // 🧠 2. Rakit Riwayat Chat
    const conversation = [...rawMessages].reverse();
    const formattedHistory = conversation.map((msg) => {
      const role = msg.author?.bot ? 'Bot' : msg.author?.username || 'User';
      return `${role}: ${msg.content}`;
    }).join('\n');

    const promptText = `Riwayat percakapan:\n${formattedHistory}\n\n` +
      `Balas pesan terakhir dari ${lastMsg.author?.username}: "${lastMsg.content}"`;

    // 🔍 TES CEK DAFTAR MODEL YANG AKTIF DULU
    try {
      const listResult = await ai.models.list();
      const availableModels = [];
      for await (const m of listResult) {
        availableModels.push(m.name);
      }
      console.log("🔥 MODEL YANG AKTIF DAN BISA DIPAKAI KEY INI:", availableModels);
    } catch (err) {
      console.error("Gagal fetch list models:", err);
    }
    
    // 🤖 3. Generate Balasan Gemini AI
    // 💡 Format model 'models/gemini-2.5-flash' wajib diawali 'models/' di API v1beta
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: promptText,
      config: {
        systemInstruction:
          'Kamu adalah member Discord biasa di server esports/gaming Indonesia. Santai, rada sarkas, agak pinggir jurang/dark joke khas tongkrongan netizen lokal, cuek, tapi tetep akrab.\n\n' +
          'ATURAN PENTING GAYA BAHASA:\n' +
          '1. JANGAN PERNAH pakai kata "bro", "wkwk" di awal kalimat, "halo", "semangat", atau gaya bahasa CS/Admin AI lebay.\n' +
          '2. Jangan pakai emoji berlebihan (max 1 atau tidak sama sekali).\n' +
          '3. Gunakan bahasa gaul/ketikan anak Discord lokal yang natural dan singkat (max 15 kata).\n' +
          '4. Jika bahas politik/isu lokal, boleh bercanda tipis ala pinggir jurang (sarkas halus).\n' +
          '5. Balas pesan terakhir dengan memperhatikan riwayat chat.',
        temperature: 0.7,
      },
    });

    const aiReplyText = response.text?.trim();

    if (!aiReplyText) {
      return NextResponse.json({ error: 'Gemini AI tidak menghasilkan jawaban' }, { status: 500 });
    }

    // 💬 4. Direct Reply ke Discord + Simpan Redis secara berurutan
    await discordAPI(`/channels/${EXHIBITION_CHANNEL_ID}/messages`, 'POST', {
      content: aiReplyText,
      message_reference: { message_id: lastMsg.id },
      allowed_mentions: { replied_user: false }
    });

    await kv.set(redisKey, lastMsg.id);

    return NextResponse.json({
      success: true,
      userPrompt: lastMsg.content,
      aiReply: aiReplyText,
      messageId: lastMsg.id
    });

  } catch (error) {
    console.error('Error Auto-Reply Gemini AI Exhibition:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



================================================
FILE: app/api/cron/match-notifier/route.ts
================================================
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { TESTER_MATCH_DATA } from '@/lib/config-tester';
import { discordAPI } from '@/lib/discord/utils';

// Import Generator Message Terpisah
import { buildReminderEmbed } from '@/lib/discord/messages/reminderEmbed';
import { buildPrepareEmbed } from '@/lib/discord/messages/prepareEmbed';
import { createTimerControlEmbed } from '@/lib/discord/messages/timerControlEmbed';

// Helper Hapus Pesan Discord
async function deleteDiscordMessage(channelId: string, messageId?: string) {
  if (channelId && messageId) {
    try {
      await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'DELETE');
    } catch (err) {
      console.error(`Gagal menghapus pesan ${messageId} di channel ${channelId}:`, err);
    }
  }
}

// Helper Log Discord Admin
async function sendAdminLog(description: string) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title: '🤖 Cron Job Match Notifier',
          description,
          color: 3447003,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error('Gagal kirim log ke Discord Admin:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Kalkulasi Waktu WIB (UTC+7)
    const now = new Date();
    const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const hours = wibDate.getUTCHours();
    const minutes = wibDate.getUTCMinutes();

    const matchData = TESTER_MATCH_DATA;
    const kvKey = `reminders:checkpoint:${matchData.matchId}`;
    const sentCheckpoints: string[] = (await kv.smembers(kvKey)) || [];

    // --- LOGIKA 1: JAM 18.00 WIB (REMINDER 1) ---
    if (hours === 18 && !sentCheckpoints.includes('reminder_1')) {
      const payloadA = buildReminderEmbed(matchData.teamA.nama, matchData.teamA.roleId, matchData.matchTimeWIB, matchData.wasit.mention);
      const payloadB = buildReminderEmbed(matchData.teamB.nama, matchData.teamB.roleId, matchData.matchTimeWIB, matchData.wasit.mention);

      const [resA, resB]: any = await Promise.all([
        discordAPI(`/channels/${matchData.teamA.channelId}/messages`, 'POST', payloadA),
        discordAPI(`/channels/${matchData.teamB.channelId}/messages`, 'POST', payloadB),
      ]);

      const msgIdsToSave: Record<string, string> = {};
      if (resA?.id) msgIdsToSave.teamA_rem1 = resA.id;
      if (resB?.id) msgIdsToSave.teamB_rem1 = resB.id;

      if (Object.keys(msgIdsToSave).length > 0) {
        await kv.hset(`msg:${matchData.matchId}`, msgIdsToSave);
      }

      await kv.sadd(kvKey, 'reminder_1');
      await sendAdminLog(`✅ **Reminder 1 (18.00 WIB)** berhasil dikirim ke channel tim ${matchData.teamA.nama} & ${matchData.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_1_sent' });
    }

    // --- LOGIKA 2: JAM 19.00 WIB (REMINDER 2 + AUTO DELETE REMINDER 1) ---
    if (hours === 19 && minutes < 45 && !sentCheckpoints.includes('reminder_2')) {
      const oldMsgs: any = await kv.hgetall(`msg:${matchData.matchId}`);
      await Promise.all([
        deleteDiscordMessage(matchData.teamA.channelId, oldMsgs?.teamA_rem1),
        deleteDiscordMessage(matchData.teamB.channelId, oldMsgs?.teamB_rem1),
      ]);

      const payloadA = buildReminderEmbed(matchData.teamA.nama, matchData.teamA.roleId, matchData.matchTimeWIB, matchData.wasit.mention);
      const payloadB = buildReminderEmbed(matchData.teamB.nama, matchData.teamB.roleId, matchData.matchTimeWIB, matchData.wasit.mention);

      await Promise.all([
        discordAPI(`/channels/${matchData.teamA.channelId}/messages`, 'POST', payloadA),
        discordAPI(`/channels/${matchData.teamB.channelId}/messages`, 'POST', payloadB),
      ]);

      await kv.sadd(kvKey, 'reminder_2');
      await sendAdminLog(`✅ **Reminder 2 (19.00 WIB)** berhasil dikirim & **Reminder 1 lama telah dihapus**.`);

      return NextResponse.json({ success: true, step: 'reminder_2_sent' });
    }

    // --- LOGIKA 3: JAM 19.45 WIB (PREPARE BRIEFING + PANEL TIMER INTERAKTIF) ---
    if (hours === 19 && minutes >= 45 && !sentCheckpoints.includes('prepare')) {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      const preparePayload = buildPrepareEmbed();
      const timerPayload = createTimerControlEmbed(
        {
          teamA: { nama: matchData.teamA.nama, state: matchData.teamA },
          teamB: { nama: matchData.teamB.nama, state: matchData.teamB },
        },
        nowInSeconds
      );

      await discordAPI(`/channels/${matchData.matchChannelId}/messages`, 'POST', preparePayload);
      await discordAPI(`/channels/${matchData.matchChannelId}/messages`, 'POST', timerPayload);

      await kv.sadd(kvKey, 'prepare');
      await sendAdminLog(`🚀 **Prepare Briefing & Panel Timer (19.45 WIB)** berhasil dikirim ke Channel Match (${matchData.matchChannelId})!`);

      return NextResponse.json({ success: true, step: 'prepare_and_timer_sent' });
    }

    return NextResponse.json({
      success: true,
      message: 'Cron berjalan, tidak ada jadwal pengiriman pada menit/jam ini.',
      currentWibTime: `${hours}:${minutes < 10 ? '0' : ''}${minutes}`,
      sentCheckpoints,
    });

  } catch (error: any) {
    console.error('Error Match Notifier Cron:', error);
    await sendAdminLog(`❌ **Error Match Notifier Cron:** \`${error.message}\``);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



================================================
FILE: app/api/cron/match-reminder/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Konfigurasi Target Channel & Role ID (Sudah Diperbaiki)
const CHANNELS_CONFIG = [
  {
    channelId: '1532355472764440576', // CH_STAR
    roleId: '1532352873113849938',    // Role STAR
    kvKey: 'msg_reminder:ch_star',
    type: 'reminder',
  },
  {
    channelId: '1532355753535471827', // CH_CHAMP
    roleId: '1524245016552144978',    // Role CHAM
    kvKey: 'msg_reminder:ch_cham',
    type: 'reminder',
  },
  {
    channelId: '1532353687450685522', // CH_EXHI / Match Channel
    roleId: null,
    kvKey: 'msg_reminder:ch_match',
    type: 'match_info',
  },
];

const REFEREE_ID = '675203924072071191';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get('force') === 'true'; 
    const forceType = searchParams.get('type'); 
    const resetMatch = searchParams.get('reset_match') === 'true';

    // 🕒 Cek Waktu WIB Saat Ini
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('id-ID', options);
    const parts = formatter.formatToParts(now);
    
    let day = '';
    let hour = 0;

    parts.forEach(p => {
      if (p.type === 'weekday') day = p.value; 
      if (p.type === 'hour') hour = parseInt(p.value, 10);
    });

    // 🔍 Tentukan Jenis Eksekusi Berdasarkan Jam & Hari
    let isScheduledTime = false;
    let isClosingTime = false;

    if (forceRun) {
      isScheduledTime = true;
      if (forceType === 'close') isClosingTime = true;
    } else {
      if (day === 'Sabtu' && hour === 16) isScheduledTime = true;
      if (day === 'Minggu' && hour === 16) isScheduledTime = true;
      if (day === 'Senin' && (hour === 16 || hour === 18)) isScheduledTime = true;
      if (day === 'Senin' && hour === 19) {
        isScheduledTime = true;
        isClosingTime = true;
      }
    }

    if (!isScheduledTime) {
      return NextResponse.json({
        skipped: true,
        message: `Bukan jadwal kirim reminder (${day}, Jam ${hour}:00 WIB). Di-skip otomatis.`,
        tip: 'Gunakan ?force=true pada URL jika ingin memaksa jalan sekarang.'
      });
    }

    const results = [];

    for (const target of CHANNELS_CONFIG) {
      try {
        // =========================================================================
        // A. CHANNEL MATCH INFO (Strict: HANYA BOLEH 1X SEPANJANG MASA)
        // =========================================================================
        if (target.type === 'match_info') {
          const existingMatchMsgId = await kv.get<string>(target.kvKey);

          if (existingMatchMsgId && !resetMatch) {
            results.push({ 
              channel: target.channelId, 
              status: 'Skipped', 
              reason: 'Pesan match info SUDAH ADA di DB & Discord. Tidak di-update/hapus.',
              msgId: existingMatchMsgId 
            });
            continue; 
          }

          if (existingMatchMsgId && resetMatch) {
            await discordAPI(`/channels/${target.channelId}/messages/${existingMatchMsgId}`, 'DELETE').catch(() => null);
            await kv.del(target.kvKey);
          }

          const matchPayload = {
            embeds: [
              {
                title: '⚔️ TWI Season 7 - Exhibition Match',
                color: hexToDecimal('#FFD700'),
                description: 
                  `📅 **Hari / Tanggal:** Senin, 3 Agustus 2026\n` +
                  `⏰ **Waktu Kick-Off:** 20:00 WIB\n\n` +
                  `⚔️ **TIM BERTANDING:**\n` +
                  `• <@&1532352873113849938> **VS** <@&1524245016552144978>`,
                fields: [
                  {
                    name: '🎮 DETAIL ROOM & STREAMING',
                    value: 
                      '• **Room ID:** Menyusul\n' +
                      '• **Streaming:** Streamer (Link Menyusul)',
                    inline: false,
                  },
                  {
                    name: '⏱️ TIMELINE & REFEREE',
                    value: 
                      '• **19:00 WIB:** Batas Akhir Pengumpulan 10 Deck\n' +
                      '• **19:30 WIB:** Pengecekan Deck dan Persiapan oleh Referee\n' +
                      '• **20:00 WIB:** Match Kick-Off\n\n' +
                      `• **Referee Bertugas:** <@${REFEREE_ID}>`,
                    inline: false,
                  }
                ],
                footer: { text: 'Team Wars Indonesia Season 7' },
                timestamp: new Date().toISOString(),
              }
            ],
            allowed_mentions: {
              roles: ['1532352873113849938', '1524245016552144978'],
              users: [REFEREE_ID],
            }
          };

          const resMatch = await discordAPI(`/channels/${target.channelId}/messages`, 'POST', matchPayload);

          if (resMatch?.id) {
            await discordAPI(`/channels/${target.channelId}/pins/${resMatch.id}`, 'PUT', {}).catch(() => null);
            await kv.set(target.kvKey, resMatch.id);
            results.push({ channel: target.channelId, status: 'Success (Created)', msgId: resMatch.id, type: 'match_info' });
          } else {
            results.push({ channel: target.channelId, status: 'Failed', error: 'Cek Permission Bot di Channel Match!' });
          }
          continue;
        }

        // =========================================================================
        // B. CHANNEL REMINDER TIM (CH_STAR & CH_CHAMP)
        // =========================================================================
        
        // Hapus pesan lama jika ada
        const oldMsgId = await kv.get<string>(target.kvKey);
        if (oldMsgId) {
          await discordAPI(`/channels/${target.channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
          await kv.del(target.kvKey);
        }

        let payload: any = {};

        if (isClosingTime) {
          payload = {
            content: `<@&${target.roleId}>`,
            embeds: [
              {
                title: '🚨 BATAS WAKTU MEDECK DITUTUP — TWI SEASON 7',
                color: hexToDecimal('#FF0000'), 
                description: 
                  `Batas waktu pengumpulan deck untuk match **Senin, 3 Agustus 2026** telah **RESMI DITUTUP** per pukul **19:00 WIB**.\n\n` +
                  `Sesuai regulasi, pengumpulan deck setelah waktu ini atau slot yang belum terisi dikenakan sanksi tegas!`,
                fields: [
                  {
                    name: '⚠️ SANKSI KETERLAMBATAN & AUTO-LOSS',
                    value: 
                      '• **Deck Terlambat (> 19:00 WIB):** Pemotongan waktu kontrol **2 menit per deck** yang terlambat.\n' +
                      '• **Slot Kosong (s/d 20:00 WIB):** Slot otomatis dinyatakan **AUTO-LOSS** pada kick-off.',
                    inline: false,
                  },
                  {
                    name: '❓ BANTUAN WASIT',
                    value: `Jika terdapat kendala teknis mendesak, segera hubungi Wasit: <@${REFEREE_ID}>`,
                    inline: false,
                  }
                ],
                footer: { text: 'Team Wars Indonesia • Closed at 19:00 WIB' },
                timestamp: new Date().toISOString(),
              }
            ],
            allowed_mentions: {
              roles: target.roleId ? [target.roleId] : [],
              users: [REFEREE_ID],
            }
          };
        } else {
          payload = {
            content: `<@&${target.roleId}>`,
            embeds: [
              {
                title: '📢 PERSIAPAN MATCH & REGULASI PENGUMPULAN DECK',
                color: hexToDecimal('#00FFFF'), 
                description: 
                  `Halo <@&${target.roleId}>, pertandingan kalian di **TWI Season 7** dijadwalkan pada:\n\n` +
                  `📅 **Hari / Tanggal:** Senin, 3 Agustus 2026\n` +
                  `⏰ **Waktu Match:** 20:00 WIB (Kick-Off)\n\n` +
                  `Mohon segera mempersiapkan lineup & medeck dengan memperhatikan aturan di bawah ini:`,
                fields: [
                  {
                    name: '⚠️ ATURAN PENGUMPULAN DECK',
                    value: 
                      '• **10 Deck/Tim:** Wajib dikirim di channel ini paling lambat **Senin, 3 Agustus 2026 — Pukul 19:00 WIB**.\n' +
                      '• **2 Deck/Pemain:** Setiap pemain (total 5 orang) wajib membawa 2 deck dengan archetype utama yang berbeda.\n' +
                      '• **Limit Archetype (Max 5x):** Batas penggunaan 1 jenis archetype yang sama adalah maksimal 5x dalam 1 tim.\n' +
                      '  *(Contoh: Gabungan Stardust-Centurion dihitung akumulatif max 5x untuk total seluruh tim)*.\n' +
                      '• **Definisi Archetype:** Kelompok min. 3 kartu dengan kesamaan nama (contoh: *Branded In Red* & *Branded Fusion* = Archetype *Branded*). Jika kurang dari 3 kartu, diklasifikasikan sebagai **"Deck Khusus"** (misal: Dino, Stun).',
                    inline: false,
                  },
                  {
                    name: '❌ SANKSIS',
                    value: 
                      '• **Keterlambatan (> 19:00 WIB):** Pemotongan waktu kontrol **2 menit per deck** yang terlambat.\n' +
                      '• **Slot Kosong (s/d 20:00 WIB):** Slot otomatis dinyatakan **AUTO-LOSS**.',
                    inline: false,
                  },
                  {
                    name: '❓ BANTUAN & BACA RULES',
                    value: `Ada pertanyaan seputar deck/regulasi? Hubungi Wasit: <@${REFEREE_ID}>\n🔗 **Rules Selengkapnya:** https://teamwars.web.id/rules`,
                    inline: false,
                  }
                ],
                footer: { text: 'Team Wars Indonesia • Reminder Auto-System' },
                timestamp: new Date().toISOString(),
              }
            ],
            allowed_mentions: {
              roles: target.roleId ? [target.roleId] : [],
              users: [REFEREE_ID],
            }
          };
        }

        // Kirim Embed Reminder Baru ke Channel Tim
        const res = await discordAPI(`/channels/${target.channelId}/messages`, 'POST', payload);

        if (res?.id) {
          await discordAPI(`/channels/${target.channelId}/pins/${res.id}`, 'PUT', {}).catch(() => null);
          await kv.set(target.kvKey, res.id);
          results.push({ channel: target.channelId, status: 'Success (Created)', msgId: res.id, type: target.type });
        } else {
          results.push({ channel: target.channelId, status: 'Failed', error: 'Cek Permission Bot di Channel Tim ini!' });
        }

      } catch (channelErr: any) {
        console.error(`Error pada channel ${target.channelId}:`, channelErr);
        results.push({ channel: target.channelId, status: 'Error', error: channelErr?.message || String(channelErr) });
      }
    }

    return NextResponse.json({
      success: true,
      executedAt: `${day}, Jam ${hour}:00 WIB`,
      results
    });

  } catch (error) {
    console.error('Error Cron Match Reminder:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



================================================
FILE: app/api/cron/send-closing-reminder/route.ts
================================================
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE, DISCORD_CONFIG } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';
import { discordAPI } from '@/lib/discord/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper format tanggal & jam: "29 Jul 2026 at 14:30 WIB"
function getFormattedDateTime(): string {
  const d = new Date();

  const dateStr = d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateStr} at ${timeStr} WIB`;
}

function getRemainingTimeText(): string {
  const now = new Date();
  const targetClosing = new Date(CLOSE_TARGET_DATE);
  const diffMs = targetClosing.getTime() - now.getTime();

  if (diffMs <= 0) return 'PENDAFTARAN TELAH DITUTUP!';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) text += `${days} Hari `;
  if (hours > 0) text += `${hours} Jam `;
  text += `${minutes} Menit`;

  return text;
}

// Helper kirim log ke Channel CH_LOG Admin
async function sendDiscordLog(title: string, description: string, color = 3447003) {
  try {
    const formattedDateTime = getFormattedDateTime();

    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: {
            text: `Sistem Registrasi • Sent on ${formattedDateTime}`,
          },
        },
      ],
    });
  } catch (err) {
    console.error('Gagal kirim log ke Discord CH_LOG:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sisaWaktuText = getRemainingTimeText();
    const formattedDateTime = getFormattedDateTime();

    // 1. Ambil daftar SLUG dari SET 'global:teams'
    const allTeamSlugs: string[] = (await kv.smembers('global:teams')) || [];

    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data tim di global:teams Redis.' });
    }

    // 2. Ambil daftar SLUG yang SUDAH dikirim dari SET 'reminders:sent'
    const sentSlugs: string[] = (await kv.smembers('reminders:sent')) || [];

    let targetSlug: string | null = null;
    let targetTeamData: any = null;

    // 3. Cari 1 slug tim yang BELUM ada di 'reminders:sent'
    for (const slug of allTeamSlugs) {
      if (sentSlugs.includes(slug)) {
        continue;
      }

      const teamData: any = await kv.hgetall(`teams:${slug}`);

      if (teamData && teamData.email) {
        targetSlug = slug;
        targetTeamData = teamData;
        break;
      } else {
        await kv.sadd('reminders:sent', slug);
      }
    }

    if (!targetSlug || !targetTeamData) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: 'Seluruh tim terdaftar sudah berhasil menerima email & pemberitahuan Discord!',
      });
    }

    let parsedPlayers = [];
    try {
      parsedPlayers = typeof targetTeamData.players === 'string'
        ? JSON.parse(targetTeamData.players)
        : targetTeamData.players || [];
    } catch (e) {
      parsedPlayers = [];
    }

    const ketuaTim = parsedPlayers.find((p: any) => p.role === 'Ketua') ||
      targetTeamData.ketua || { namaLengkap: 'Kapten' };
    const teamName = targetTeamData.namaTim || 'Tim';

    // A. Kirim Email via Resend
    const emailHtml = getClosingReminderTemplate({
      namaTim: teamName,
      namaKetua: ketuaTim.namaLengkap,
      warna: targetTeamData.warna || '#4CAF50',
      editToken: targetTeamData.editToken || '',
      sisaWaktuText,
    });

    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: targetTeamData.email,
      subject: `⚠️ Pendaftaran Akan Ditutup: Cek Data Tim ${teamName} [Team Wars S7]`,
      html: emailHtml,
    });

    // B. Kirim Embed Discord Ke Channel Tim & OTOMATIS PIN
    const channelId = targetTeamData.discordChannelId;
    const roleId = targetTeamData.discordRoleId || targetTeamData.roleId;

    if (channelId && roleId) {
      const discordPayload = createClosingReminderEmbed({
        roleMentionId: roleId,
        namaTim: teamName,
        email: targetTeamData.email,
        sisaWaktuText,
        hexWarna: targetTeamData.warna || '#4CAF50',
      });

      // 💡 FOOTER DISCORD SESUAI REQUEST
      if (discordPayload.embeds && discordPayload.embeds.length > 0) {
        discordPayload.embeds[0].footer = {
          text: `Sistem Registrasi • Sent on ${formattedDateTime}`,
        };
      }

      try {
        // 1. Kirim Pesan Embed
        const sentMessage: any = await discordAPI(
          `/channels/${channelId}/messages`,
          'POST',
          discordPayload
        );

        // 2. PIN PESAN di channel tim
        if (sentMessage && sentMessage.id) {
          await discordAPI(
            `/channels/${channelId}/pins/${sentMessage.id}`,
            'PUT'
          );
        }
      } catch (err) {
        console.error(`Gagal kirim / pin reminder Discord ke tim ${teamName}:`, err);
      }
    }

    // C. Tulis SLUG yang berhasil dikirim ke SET 'reminders:sent'
    await kv.sadd('reminders:sent', targetSlug);

    // D. Kirim Log Ke Channel Admin Discord
    await sendDiscordLog(
      `📢 Reminder Terkirim: Tim ${teamName}`,
      `• **Slug:** \`${targetSlug}\`\n• **Email Registered:** \`${targetTeamData.email}\`\n• **Channel DC:** <#${channelId || 'N/A'}>\n• **Sisa Waktu:** ${sisaWaktuText}\n• **Status:** ✅ Terkirim via Resend, Logged & Auto-Pinned`,
      3066993
    );

    return NextResponse.json({
      success: true,
      sentToTeam: teamName,
      slug: targetSlug,
      email: targetTeamData.email,
      discordChannelId: channelId || 'Tidak ada Channel ID',
      sisaWaktu: sisaWaktuText,
      message: `Berhasil mengirim email & notifikasi Discord (Auto-Pinned) ke ${teamName}!`,
    });

  } catch (error: any) {
    console.error('Error Cron Job Reminder:', error);

    await sendDiscordLog(
      `❌ Error Cron Job Reminder`,
      `**Pesan Error:** \`${error.message || 'Unknown Error'}\``,
      15158332
    );

    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}



================================================
FILE: app/api/cron/update-timer/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Target Deadline Edit Team (Jumat, 31 Juli 2026, 21:23 WIB)
const EDIT_DEADLINE = new Date('2026-07-31T21:23:00+07:00').getTime();

// Helper pengereman (sleep) ms per request agar aman dari rate limit
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper Hitung Sisa Waktu Format (X Jam Y Menit)
function getRemainingTimeText(deadlineTime: number) {
  const now = Date.now();
  const diffMs = deadlineTime - now;

  if (diffMs <= 0) return '⏳ Waktu Telah Habis';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} Jam ${minutes} Menit`;
  }
  return `${minutes} Menit`;
}

// Helper Sensor Email
function maskEmail(email: string) {
  if (!email || !email.includes('@')) return 'e****@gmail.com';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name}****@${domain}`;
  return `${name.slice(0, 2)}****@${domain}`;
}

// Helper Format Waktu Footer Terkini
function getCurrentFormattedTime() {
  const dateObj = new Date();

  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const timeStr = dateObj
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
    .replace('.', ':');

  return `Sistem Registrasi • Sent on ${dateStr} at ${timeStr} WIB`;
}

export async function GET(req: Request) {
  try {
    // 🛡️ Security Check Header Cron Vercel / External Cron
    const authHeader = req.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTeamKeys = await kv.keys('teams:*');
    if (allTeamKeys.length === 0) {
      return NextResponse.json({ message: 'Tidak ada tim di database' });
    }

    const now = Date.now();
    const remainingMs = EDIT_DEADLINE - now;
    const remainingText = getRemainingTimeText(EDIT_DEADLINE);
    const isExpired = remainingMs <= 0;

    // ⏱️ PEMICU RESEND: Sisa Waktu <= 30 Menit (dan belum expired)
    const is30MinTrigger = remainingMs <= 30 * 60 * 1000 && remainingMs > 0;
    const currentFooterText = getCurrentFormattedTime();

    let updatedCount = 0;
    const collectedRoles: string[] = [];

    // Loop semua tim secara berurutan
    for (const key of allTeamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const channelId = teamData.discordChannelId;
      const roleId = teamData.discordRoleId;
      let savedMsgId = teamData.editReminderMsgId;
      const namaTim = teamData.namaTim || 'TEAM';
      const colorHex = teamData.warna || '#e91e63';
      const maskedEmail = maskEmail(teamData.email || '');

      // Kumpulkan Role ID untuk dimasukkan ke dalam embed news
      if (roleId) {
        collectedRoles.push(`<@&${roleId}>`);
      }

      if (!channelId) continue;

      // Cek apakah resend 30 menit sudah pernah dijalankan
      const hasSent30m = teamData.reminder30mSent === true || teamData.reminder30mSent === 'true';

      // 🎯 Embed Payload untuk Channel Tim
      const embedPayload = {
        title: isExpired
          ? '🔒 Akses Edit Team Telah Ditutup!'
          : '⌛ Pengingat Batas Akhir Edit Team!',
        color: hexToDecimal(isExpired ? '#f44336' : colorHex),
        description: isExpired
          ? `Sesi perbaikan dan pembaruan data roster untuk tim **${namaTim}** resmi **ditutup**.\n\n` +
            `Seluruh data roster telah dikunci untuk penataan jadwal pertandingan.`
          : `Pendaftaran baru telah **ditutup**. Segera periksa dan kunci data roster tim **${namaTim}** sebelum waktu perbaikan berakhir!\n\n` +
            `⏰ **Sisa Waktu Edit Data**\n\`\`\`\n${remainingText}\n\`\`\`\n\n` +
            `🔍 **Poin Penting Perbaikan Roster**\n` +
            `• Pastikan tidak ada typo pada **IGN In-Game & Duel ID**.\n` +
            `• Pastikan seluruh anggota tim sudah **Terverifikasi Discord**.\n` +
            `• Atur susunan pemain utama dan cadangan (Maks. 10 Pemain).\n\n` +
            `📝 **Cara Memperbarui Data Tim**\n` +
            `Klik tombol **Edit Team** di bawah ini atau buka tautan verifikasi yang dikirim ke email registered:\n` +
            `📧 \`${maskedEmail}\`\n\n` +
            `_Catatan: Setelah waktu habis, data roster akan terkunci secara otomatis dan tidak bisa diubah._`,
        footer: {
          text: currentFooterText,
        },
      };

      // 🔘 Component Button
      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: isExpired ? 2 : 1, // SECONDARY (GRAY) / PRIMARY (BLUE)
              label: isExpired ? '🔒 Edit Team Terkunci' : '✏️ Edit Team',
              custom_id: 'btn_edit_team',
              disabled: isExpired,
            },
          ],
        },
      ];

      const mentionContent = roleId ? `<@&${roleId}>` : `@${namaTim}`;

      try {
        // 🔄 LOGIKA 1: Sisa <= 30 Menit & BELUM pernah kirim ulang -> Send Message Baru (1x saja per tim)
        if (is30MinTrigger && !hasSent30m && !isExpired) {
          if (savedMsgId) {
            try {
              await discordAPI(
                `/channels/${channelId}/messages/${savedMsgId}`,
                'DELETE'
              );
            } catch (err) {
              console.log(`Log: Pesan lama tidak ada/gagal hapus (${namaTim})`);
            }
          }

          const newMsg: any = await discordAPI(
            `/channels/${channelId}/messages`,
            'POST',
            {
              content: mentionContent,
              embeds: [embedPayload],
              components,
            }
          );

          if (newMsg && newMsg.id) {
            await kv.hset(key, { 
              editReminderMsgId: newMsg.id,
              reminder30mSent: true 
            });
          }
        }
        // 🔄 LOGIKA 2: Update Rutin Biasa / Status Ditutup -> Pakai PATCH pada pesan yang ada
        else if (savedMsgId) {
          await discordAPI(
            `/channels/${channelId}/messages/${savedMsgId}`,
            'PATCH',
            {
              content: mentionContent,
              embeds: [embedPayload],
              components,
            }
          );
        }

        updatedCount++;
      } catch (e) {
        console.error(
          `Gagal memproses timer tim ${namaTim} (MsgID: ${savedMsgId}):`,
          e
        );
      }

      await sleep(200);
    }

    // 📢 LOGIKA 3: Kirim Pengumuman ke Channel News Saat Waktu Habis (1x Saja)
    if (isExpired && DISCORD_CONFIG?.CH_NEWS) {
      const hasAnnounced = await kv.get('team_edit_closed_announced');

      if (!hasAnnounced) {
        const rolesText =
          collectedRoles.length > 0 ? collectedRoles.join(' ') : 'Semua Tim';

        const newsEmbed = {
          title: '🎉 Selamat Bergabung di Turnamen!',
          color: hexToDecimal('#2ecc71'),
          description:
            `Batas waktu perbaikan data roster tim resmi **DITUTUP**! 🔒\n\n` +
            `Selamat bertanding dan selamat bergabung kepada seluruh tim terdaftar:\n` +
            `${rolesText}\n\n` +
            `📌 **Informasi Selanjutnya:**\n` +
            `• 📋 **Technical Meeting:** Minggu, 2 Agustus 2026 pukul 20:00 WIB\n` +
            `• 🔀 **Shuffle Tim ke Grup:** Senin, 3 Agustus 2026 pukul 19:00 WIB\n` +
            `• ⚔️ **Match Exhibition:** Senin, 3 Agustus 2026 pukul 20:00 WIB\n` +
            `• 📺 **Link Streaming:** Menyusul\n` +
            `• 📊 **Info Jadwal & Bagan Main:** Menyusul\n\n` +
            `_Catatan: Seluruh data roster tim telah **dikunci** dan tidak dapat diubah kembali._\n\n` +
            `Good luck and have fun! 🔥`,
          footer: {
            text: currentFooterText,
          },
        };

        try {
          await discordAPI(
            `/channels/${DISCORD_CONFIG.CH_NEWS}/messages`,
            'POST',
            {
              content: '@everyone',
              embeds: [newsEmbed],
            }
          );

          await kv.set('team_edit_closed_announced', true);
        } catch (newsErr) {
          console.error('Gagal mengirim pengumuman ke channel news:', newsErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isExpired
        ? 'Waktu habis, data tim terkunci dan pengumuman news terkirim.'
        : 'Timer berhasil diperbarui!',
      totalTimDiproses: updatedCount,
      sisaWaktu: remainingText,
      lastUpdated: currentFooterText,
    });
  } catch (error) {
    console.error('Error running update-timer cron:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}



================================================
FILE: app/api/discord/route.ts
================================================
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySignature } from '@/lib/discord/utils';

// Slash Commands
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';
import { handleInfo } from '@/lib/discord/commands/info';
import { handleTimerCommand } from '@/lib/discord/commands/timer';
import { handleCekId } from '@/lib/discord/commands/cek-id-dl';
import { handleBlacklistCommand } from '@/lib/discord/commands/blacklist';
import { handleCekRoster } from '@/lib/discord/commands/cek-roster';
import { handleCancelBid } from '@/lib/discord/commands/cancel-bid'; // 👈 TAMBAHAN: Handler Batal Bid Admin

// Button Handlers
import { handleBtVerified } from '@/lib/discord/buttons/btVerified';
import { handleBtRole } from '@/lib/discord/buttons/btRole';
import { handleBtEditTeam } from '@/lib/discord/buttons/btEditTeam';
import { handleBtTimer } from '@/lib/discord/buttons/handleBtTimer';

// Bidding Module
import { getBidModal } from '@/lib/discord/buttons/bidding';
import { processBidSubmission, handleViewFullLog, KV_BID_KEY, BidStore } from '@/lib/discord/bidding';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');

    if (!verifySignature(rawBody, signature, timestamp)) {
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.type === 1) return NextResponse.json({ type: 1 });

    // ⚡ Slash Commands (Type 2)
    if (body.type === 2) {
      const commandName = body.data.name;
      if (commandName === 'reminder') return await handleReminder(body);
      if (commandName === 'prepare') return await handlePrepare(body);
      if (commandName === 'info') return await handleInfo(body); 
      if (commandName === 'timer') return await handleTimerCommand(body);
      if (commandName === 'cek-id') return await handleCekId(body);
      if (commandName === 'blacklist') return await handleBlacklistCommand(body);
      if (commandName === 'cek-roster') return await handleCekRoster(body);
      if (commandName === 'cancel-bid') return await handleCancelBid(body); // 👈 TAMBAHAN: Route ke Cancel Bid
    }

    // 🔘 Button Interactions (Type 3)
    if (body.type === 3) {
      const customId = body.data.custom_id;

      if (customId === 'bt_verified') return await handleBtVerified(body);
      if (customId === 'bt_role') return await handleBtRole(body);
      if (customId === 'btn_edit_team') return await handleBtEditTeam(body);
      if (customId === 'toggle_timer_teamA' || customId === 'toggle_timer_teamB') {
        return await handleBtTimer(body);
      }

      // 📜 Tombol Lihat Seluruh Log
      if (customId === 'btn_view_full_log') {
        return await handleViewFullLog();
      }

      // 🏆 Tombol Bid Group A / B
      if (customId.startsWith('btn_bid_')) {
        const groupTarget = customId.replace('btn_bid_', '');

        const data = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null };

        const currentA = data.groupA?.amount || 0;
        const currentB = data.groupB?.amount || 0;

        const minAmountA = currentA === 0 ? 110000 : currentA + 10000;
        const minAmountB = currentB === 0 ? 110000 : currentB + 10000;

        const minAmount = groupTarget === "A" ? minAmountA : minAmountB;

        return NextResponse.json(getBidModal(groupTarget, minAmount));
      }
    }

    // 📝 Modal Submit Interactions (Type 5)
    if (body.type === 5) {
      const customId = body.data.custom_id;

      if (customId.startsWith('modal_bid_')) {
        return await processBidSubmission(body);
      }
    }

    return new NextResponse('Unknown Interaction', { status: 400 });

  } catch (error) {
    console.error('Error Webhook DC:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}



================================================
FILE: app/api/discord/command/route.ts
================================================
import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // REGISTER SLASH COMMANDS (PUT Overwrite)
  // ==========================================
  const commands = [
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },
    {
      name: 'prepare',
      description: 'Kirim briefing in-game dan info Room ID di channel match.',
    },
    {
      name: 'info',
      description: 'Lihat informasi profil Discord kamu atau pemain lain',
      options: [
        {
          type: 6, // USER
          name: 'target',
          description: 'Pilih user yang ingin dilihat infonya (kosongkan untuk diri sendiri)',
          required: false,
        }
      ]
    },
    {
      name: 'timer',
      description: 'Tampilkan Panel Timer Kontrol Waktu Match TWI S7',
    },
    {
      name: 'cek-id',
      description: 'Cek pemilik ID Game di database TWI',
      options: [
        {
          type: 3, // STRING Choice
          name: 'game',
          description: 'Pilih jenis game',
          required: true,
          choices: [
            { name: 'Duel Links', value: 'dl' },
            { name: 'Master Duel', value: 'md' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'id',
          description: 'Masukkan angka ID Game (Contoh: 168-256-618 atau 168256618)',
          required: true,
        },
      ],
    },
    {
      name: 'blacklist',
      description: '[ADMIN] Kelola ID Duel Links yang di-blacklist',
      options: [
        {
          type: 3, // STRING Choice
          name: 'action',
          description: 'Pilih aksi yang ingin dilakukan',
          required: true,
          choices: [
            { name: 'Tambah ke Blacklist (Add)', value: 'add' },
            { name: 'Hapus dari Blacklist (Remove)', value: 'remove' },
            { name: 'Lihat Semua Blacklist (List)', value: 'list' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'id',
          description: 'Masukkan angka ID Duel Links (Wajib untuk Add/Remove)',
          required: false,
        },
      ],
    },
    {
      name: 'cek-roster',
      description: '[REFEREE] Cek roster tim berdasarkan Tag Role Tim Discord (Privat)',
      options: [
        {
          type: 8, // ROLE
          name: 'team1',
          description: 'Tag Role Tim Pertama (Contoh: @Team A)',
          required: true,
        },
        {
          type: 8, // ROLE
          name: 'team2',
          description: 'Tag Role Tim Kedua (Opsional)',
          required: false,
        },
      ],
    },
    {
      name: 'cancel-bid',
      description: '[ADMIN] Batal/Anulir bid tertinggi group tertentu',
      options: [
        {
          type: 3, // STRING Choice
          name: 'group',
          description: 'Pilih Group yang ingin dibatalkan bid-nya',
          required: true,
          choices: [
            { name: 'Group A', value: 'A' },
            { name: 'Group B', value: 'B' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'alasan',
          description: 'Alasan pembatalan (Contoh: Nama SARA / Bid Tidak Wajar)',
          required: false,
        },
      ],
    },
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  if (slashResult) {
    return NextResponse.json({ 
      message: '✅ Setup Slash Commands Berhasil Dijalankan!', 
      commands: slashResult
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
}



================================================
FILE: app/api/discord/message/bid-announce/route.ts
================================================
import { NextRequest, NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Helper untuk menguji apakah waktu saat ini di WIB persis Jam 07 Pagi
 */
function is07AMWib(): boolean {
  const now = new Date();
  // Ambil jam dalam zona waktu Asia/Jakarta (0-23)
  const hourWib = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit' }),
    10
  );
  return hourWib === 7;
}

/**
 * Helper untuk mengubah Permission Overwrite Channel di Discord API v10
 * Bitwise Permission:
 * - VIEW_CHANNEL = 1024 ("1024")
 * - SEND_MESSAGES = 2048 ("2048")
 */
async function updateChannelPermissions(
  channelId: string,
  roleId: string,
  token: string,
  allowBit: string,
  denyBit: string
) {
  const url = `https://discord.com/api/v10/channels/${channelId}/permissions/${roleId}`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allow: allowBit, // Permission View Channel
      deny: denyBit,   // Permission Send Messages (Disertai Deny agar tidak bisa chat)
      type: 0          // 0 = Role
    })
  });

  if (!res.ok) {
    const err = await res.json();
    console.error(`Gagal update permission untuk Role ${roleId}:`, err);
  }
  return res.ok;
}

export async function GET(req: NextRequest) {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const { searchParams } = new URL(req.url);
    const isForce = searchParams.get('force') === 'true'; // Mode Tester Bypass

    // 🔴 1. CEK BATASAN WAKTU (Jika bukan jam 7 pagi WIB & bukan mode force -> ABAIKAN)
    const isScheduledTime = is07AMWib();

    if (!isForce && !isScheduledTime) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'ℹ️ Diabaikan: Eksekusi otomatis hanya berjalan pada jam 07:00 WIB.'
      });
    }

    const newsChannelId = DISCORD_CONFIG.CH_NEWS;
    const logChannelId = DISCORD_CONFIG.CH_LOG;
    const bidChannelId = DISCORD_CONFIG.CH_BID;

    const adminRoleId = DISCORD_CONFIG.ROLE_ADMIN;
    const refereeRoleId = DISCORD_CONFIG.ROLE_REFEREE;
    const verifiedRoleId = DISCORD_CONFIG.ROLE_VERIFIED;

    if (!token || !newsChannelId || !bidChannelId) {
      return NextResponse.json(
        { success: false, error: 'Missing BOT TOKEN or Channel Config' },
        { status: 500 }
      );
    }

    // ==========================================
    // 2. PENENTUAN MODE & PERMISSION
    // ==========================================
    let targetChannelId = newsChannelId;
    let targetTag = "@everyone";
    let modeText = "LIVE MODE (Cron Job - 07:00 WIB)";

    if (isForce) {
      // 🧪 MODE TESTER (?force=true)
      targetChannelId = logChannelId || newsChannelId;
      targetTag = `<@&${adminRoleId}> \`[TESTING MODE]\``;
      modeText = "TESTING MODE (?force=true)";

      // Permission Referee: Can View (1024), Deny Send Messages (2048)
      if (refereeRoleId) {
        await updateChannelPermissions(bidChannelId, refereeRoleId, token, "1024", "2048");
      }
    } else {
      // 🚀 MODE ASLI (Jam 07:00 WIB)
      // Permission Verified: Can View (1024), Deny Send Messages (2048)
      if (verifiedRoleId) {
        await updateChannelPermissions(bidChannelId, verifiedRoleId, token, "1024", "2048");
      }
    }

    // ==========================================
    // 3. ANNOUNCEMENT PAYLOAD
    // ==========================================
    const announcementMessage = {
      content: `${targetTag} 📢 **PEMBUKAAN LELANG PENAMAAN DIVISI TWI 2026!**`,
      embeds: [
        {
          title: "🏆 Kesempatan Menamai Divisi Resmi TWI 2026!",
          description:
            "Halo semuanya! Lelang Penamaan Divisi TWI 2026 resmi dibuka untuk umum. Siapa saja berhak memberikan nama terbaik dan paling keren untuk divisi turnamen kita!",
          color: 0xFEE75C, // Warna Emas
          fields: [
            {
              name: "📌 Cara Melakukan Bidding:",
              value: [
                "1️⃣ Buka channel lelang utama di <#" + bidChannelId + ">.",
                "2️⃣ Klik tombol **`[ Bid Group A ]`** atau **`[ Bid Group B ]`**.",
                "3️⃣ Isi **Nama Divisi Pilihan** dan **Nominal Bid** pada form modal yang muncul.",
                "4️⃣ Klik **Submit** dan nominal bid kamu akan langsung ter-update secara otomatis!"
              ].join("\n"),
              inline: false
            },
            {
              name: "⚙️ Ketentuan Singkat:",
              value: [
                "• **Minimal Bid Awal:** Rp 100.000 (Bid pertama min. Rp 110.000)",
                "• **Kelipatan Bid:** Rp 10.000",
                "• **Batas Waktu Bidding:** 8 Agustus 2026, Pukul 20:00 WIB"
              ].join("\n"),
              inline: false
            }
          ],
          footer: { text: `Team Wars Indonesia • ${modeText}` },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // ==========================================
    // 4. KIRIM PESAN KE DISCORD
    // ==========================================
    const res = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcementMessage)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gagal kirim pengumuman bidding:", data);
      return NextResponse.json({ success: false, error: data }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      mode: modeText,
      message: `✅ Pengumuman bidding berhasil dikirim (${modeText})!`,
      messageId: data.id
    });

  } catch (error: any) {
    console.error('Error Single Bid Announce:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
      }
         



================================================
FILE: app/api/discord/message/get-team-role/edit/1525885817149722835/route.ts
================================================
import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

// 🔥 Tambahkan ini agar Next.js selalu mengeksekusi ulang saat URL diakses
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Pengecekan Client ID sebenarnya opsional di sini karena endpoint channels/messages 
  // menggunakan Bot Token (yang sudah diurus otomatis di dalam fungsi discordAPI), 
  // tapi sebagai pengaman tambahan tidak masalah.
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 2. EDIT PESAN LAMA UNTUK UPDATE TOMBOL
  // ==========================================
  const channelId = "1525775391854428241"; 
  const messageId = "1525885817149722835"; 
  
  let buttonResult = null;
  
  // A. UPDATE TOMBOL DI PESAN LAMA
  if (channelId && messageId) {
    const buttonPayload = {
      components: [
        {
          type: 1, // Wadah (Action Row)
          components: [
            {
              type: 2, // Tombol
              label: "Verified",
              style: 1, // Biru
              custom_id: "bt_verified", // 👈 Pastikan sama persis dengan yang di-handle
              emoji: { name: "🔒" } 
            },
            {
              type: 2, // Tombol
              label: "Role Tim",
              style: 3, // Hijau
              custom_id: "bt_role", // 👈 Pastikan sama persis dengan yang di-handle
              emoji: { name: "🛡️" } 
            }
          ]
        }
      ]
    };
    buttonResult = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'PATCH', buttonPayload);
  }

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (buttonResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan! Tombol berhasil diperbarui.', 
      buttons_updated: 'Sukses',
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal update tombol' }, { status: 500 });
  }
}



================================================
FILE: app/api/discord/message/get-team-role/new/tips/route.ts
================================================
import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 2. KIRIM PESAN BARU (TIPS)
  // ==========================================
  const channelId = "1525775391854428241"; // Pastikan config-nya mengarah ke channel #get-team-role
  
  let tipResult = null;
  
  if (channelId) {
    const tipPayload = {
      content: "💡 **Tip:** Gunakan perintah `/check` di *Private Channel* tim untuk memantau rekan setim yang belum verifikasi."
    };
    tipResult = await discordAPI(`/channels/${channelId}/messages`, 'POST', tipPayload);
  }

  // ==========================================
  // 4. KEMBALIKAN RESPON
  // ==========================================
  if (tipResult) {
    return NextResponse.json({ 
      tip_sent: tipResult ? 'Sukses kirim pesan tips' : 'Gagal kirim pesan'
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal kirim pesan' }, { status: 500 });
  }
}



================================================
FILE: app/api/discord/message/referee-hack/new/route.ts
================================================
import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils'; // Pastikan path ini sesuai dengan helper lu

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // KONFIGURASI PENGIRIMAN SOP WASIT
  // ==========================================
  const channelId = "1172158841845207193"; // Channel tujuan POST
  const refereeRoleId = "604079443647922197"; // Role Referee

  // Susunan Payload dengan Embed Estetik
  const sopPayload = {
    // Content di luar embed agar notifikasi ping role masuk ke wasit
    content: `<@&${refereeRoleId}>\nMohon perhatiannya untuk seluruh wasit yang bertugas! Berikut adalah Standar Operasional Prosedur (SOP) resmi kita.`,
    embeds: [
      {
        title: "🚨 STANDAR OPERASIONAL PROSEDUR (SOP) WASIT TWI S7 🚨",
        description: "Berikut adalah panduan langkah demi langkah (Juklak) untuk wasit yang bertugas mengawal pertandingan. Mohon dibaca, dipahami, dan dijalankan dengan tegas!\n\n=============================================",
        color: 15548997, // Warna Merah (Hex: #ED4245)
        fields: [
          {
            name: "🔹 FASE 1: PERSIAPAN & PENGAWASAN DECK (H-1 Jam)",
            value: "> **Gunakan Bot:** Ketik `/reminder` dan isi jam kick-off di channel Tim A & B.\n• **Inspeksi Waktu:** Kesepuluh (10) deck wajib dikirim maksimal 60 menit sebelum kick-off.\n• **Sanksi Telat:** Potong waktu kontrol 2 menit per deck telat. Slot kosong saat kick-off = Auto-loss.\n• **Validasi Archetype:** Maksimal 5 kali pemakaian per 1 jenis archetype dalam 1 tim. Melanggar = **Loss 1 deck/game**.",
            inline: false
          },
          {
            name: "🔹 FASE 2: BRIEFING & KICK-OFF (H-30 Menit)",
            value: "> **Gunakan Bot:** Ketik `/prepare` (Tag Role Tim A, Tim B, isi ID Room) di channel Match.\n• **Persiapan Room:** Buat Room di Duel Links sesuai ID yang dikirim.\n• **Absensi VC:** Seluruh pemain terdaftar WAJIB standby di Voice Chat (VC) Discord TWI.\n• **Validasi IGN:** Masuk menggunakan ID/IGN yang salah = **Loss 2 deck/game**.",
            inline: false
          },
          {
            name: "🔹 FASE 3: IN-GAME & MANAJEMEN WAKTU (Saat Match)",
            value: "> ⏱️ **Kunci Wasit:** Siapkan *stopwatch* 15 menit per tim.\n• **Aturan Waktu:** Berjalan saat persiapan/ganti deck, di-pause saat masuk lobby/bermain.\n• **Aba-aba Mulai:** Ketik **\"START / MULAI\"** saat waktu di-pause dan pemain siap.\n• **Inspeksi SS:** WAJIB kirim SS Starting Hand (Full Screen). Gagal = **Peringatan Ringan**.\n• **DC & Glitch:** DC = Kalah otomatis. Glitch = Maks 5 menit kirim bukti valid (SS/Video).\n• **Hak Pemain:** Substitute maks 1x per match (deck persis). Repeat Deck maks 2x per match (hanya untuk deck kalah di game pertama).",
            inline: false
          },
          {
            name: "🔹 FASE 4: POST-MATCH (Selesai Pertandingan)",
            value: "• **Deklarasi Selesai:** Berakhir jika satu tim mengeliminasi 10 deck lawan. Instruksikan keluar room.\n• **Penetapan Poin:** Menang = 3 Poin, Kalah = 0 Poin.\n• **Laporan:** Susun laporan akhir (Skor, Sisa Waktu, Pelanggaran) ke channel panitia internal.",
            inline: false
          }
        ],
        footer: {
          text: "Informasi atau tugas lainnya akan ditambahkan oleh Chief Referee.\nKetegasan wasit adalah kunci kelancaran TWI Season 7. Selamat bertugas! 🛡️"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  // Eksekusi tembakan POST ke Discord API
  let postResult = null;
  try {
    postResult = await discordAPI(`/channels/${channelId}/messages`, 'POST', sopPayload);
  } catch (error) {
    console.error("Gagal mengirim pesan SOP:", error);
    return NextResponse.json({ error: '❌ Gagal mengirim SOP ke Discord' }, { status: 500 });
  }

  // ==========================================
  // KEMBALIKAN RESPON
  // ==========================================
  return NextResponse.json({ 
    message: '✅ SOP Wasit Berhasil Dikirim sebagai Embed!', 
    result: postResult 
  });
}



================================================
FILE: app/api/discord/rekap/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';

export async function GET() {
  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    const allTeamsData = await Promise.all(
      allTeamSlugs.map(async (slug) => {
        const data = await kv.hgetall(`teams:${slug}`);
        return { slug, ...data };
      })
    );

    // Pastikan key untuk sorting sesuai (createdAt atau timestamp)
    allTeamsData.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let rekapText = "";
    let totalApproved = 0;
    let totalPending = 0;

    allTeamsData.forEach((team: any, index: number) => {
      const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);
      const totalRoster = players.length;

      const statusDB = (team.statusVerifikasi || '').toLowerCase();
      const isApproved = statusDB === 'approved';
      
      if (isApproved) totalApproved++;
      else totalPending++;

      const statusIcon = isApproved ? "✅ Approved" : "🟡 Pending";
      
      let tglDaftar = "-";
      // Cek apakah key-nya createdAt. Kalau di database kamu beda (misal 'timestamp'), ganti tulisan createdAt di bawah ini
      if (team.createdAt) {
         const dateObj = new Date(team.createdAt);
         tglDaftar = dateObj.toLocaleString('id-ID', { 
           timeZone: 'Asia/Jakarta', // 🎯 KUNCI: Paksa jam ke Waktu Indonesia Barat (WIB)
           day: '2-digit', 
           month: 'short',
           hour: '2-digit',
           minute: '2-digit'
         }).replace(/\./g, ':') + ' WIB'; // Tambahan teks WIB biar lebih jelas
      }

      rekapText += `**${index + 1}. ${team.namaTim?.toUpperCase()}**\n`;
      rekapText += `👥 ${totalRoster} Pemain\n`;
      rekapText += `💰 ${statusIcon}\n`;
      rekapText += `🗓️ ${tglDaftar}\n\n`;
    });

    if (!rekapText) rekapText = "Belum ada tim yang terdaftar di database.";

    const channelTarget = "1170909631049121872";
    const payload = {
      embeds: [{
        title: "📊 REKAPITULASI PENDAFTARAN TIM",
        description: rekapText,
        color: 3447003, 
        fields: [
          { 
            name: "📈 Ringkasan Status Pendaftaran", 
            value: `**${allTeamsData.length}** Total Tim  |  ✅ **${totalApproved}** Approved  |  🟡 **${totalPending}** Pending`, 
            inline: false 
          }
        ],
        footer: { text: "Data ditarik secara real-time dari Database TWI" },
        timestamp: new Date().toISOString()
      }]
    };

    const result = await discordAPI(`/channels/${channelTarget}/messages`, 'POST', payload);

    if (result) {
      return NextResponse.json({ 
        message: "✅ Rekapan berhasil dikirim ke channel Discord!",
        total_tim: allTeamsData.length
      });
    } else {
      return NextResponse.json({ error: "❌ Gagal mengirim ke Discord" }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error rekap data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



================================================
FILE: app/api/discord/setup-bid/route.ts
================================================
import { NextRequest, NextResponse } from 'next/server';
import { initBiddingMessages, syncBidMessages } from '@/lib/discord/bidding';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bidParam = searchParams.get('bid');

    let overrideStatus: 'closed' | 'open' | undefined = undefined;
    if (bidParam === 'closed') overrideStatus = 'closed';
    if (bidParam === 'open') overrideStatus = 'open';

    // Jika dipanggil via query param, update/init pesan dengan status tersebut
    if (overrideStatus) {
      await initBiddingMessages(overrideStatus);
    } else {
      await initBiddingMessages();
    }

    return NextResponse.json({
      success: true,
      message: `✅ Pesan Bidding berhasil dikirim ke channel (Status: ${overrideStatus || 'Auto Schedule'})!`,
    });
  } catch (error: any) {
    console.error('Gagal mengirim pesan bidding:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengirim pesan bidding' },
      { status: 500 }
    );
  }
}



================================================
FILE: app/api/edit-team/route.ts
================================================
import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, namaTim, warna, logoTim, buktiTransfer, players, key } = body;

    // 🔑 Deteksi Mode Admin
    const urlKey = request.nextUrl.searchParams.get('key');
    const isAdminKey = (key === '470212070957252618') || (urlKey === '470212070957252618');

    if (!token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    // 1. Validasi Token & Ambil Data Tim
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) {
      return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 });
    }

    const [oldTeamData, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users'),
    ]);

    if (!oldTeamData) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan' }, { status: 404 });
    }

    // 🛑 Validasi Tambahan: Jika Nama Tim Diubah saat Edit, Cek Bentrok Nama Tim Lain
    const newTeamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    if (newTeamSlug !== teamSlug) {
      const isExist = await kv.sismember("global:teams", newTeamSlug);
      if (isExist) {
        return NextResponse.json({ error: `Nama tim "${namaTim}" sudah digunakan oleh tim lain!` }, { status: 400 });
      }
      // Update indeks global nama tim jika berganti nama
      await kv.srem("global:teams", teamSlug);
      await kv.sadd("global:teams", newTeamSlug);
      await kv.set(`token:map:${token}`, newTeamSlug);
    }

    const targetSlug = newTeamSlug; // Pakai slug baru jika berubah, atau slug lama jika tetap

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const oldPlayers = typeof oldTeamData.players === 'string'
      ? JSON.parse(oldTeamData.players)
      : (oldTeamData.players || []);

    // 2. Peringatan Status Verifikasi Discord (TIDAK MEMBLOKIR PENYIMPANAN)
    const warnings: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];

      const newDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';
      const oldDiscord = oldPlayer?.discord ? oldPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';

      if (newDiscord) {
        const isNewVerified = verifiedMap.hasOwnProperty(newDiscord);
        if (!isNewVerified) {
          warnings.push(`Pemain ${newPlayer.ign} (@${newPlayer.discord}) belum terverifikasi di Discord TWI.`);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Peringatan Edit Tim:', warnings.join(' | '));
    }

    // 3. Update Nickname Discord Server (Jika IGN berubah di Web & Terverifikasi)
    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];
      const playerDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';
      const discordId = verifiedMap[playerDiscord];

      if (discordId && oldPlayer && oldPlayer.ign !== newPlayer.ign) {
        try {
          await discordAPI(
            `/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}`,
            'PATCH',
            { nick: newPlayer.ign }
          );
        } catch (nickErr) {
          console.error(`Gagal update nickname untuk @${newPlayer.discord}:`, nickErr);
        }
      }
    }

    // 4. Sinkronisasi Data Global / Cleanup
    const getCleanDiscord = (p: any) => p?.discord?.toLowerCase().replace(/^@/, '').trim();
    const getCleanIgn = (p: any) => p?.ign?.toLowerCase().trim();
    const getCleanDuelLinks = (p: any) => (p?.idDuelLinks || p?.duelId);

    const oldDiscords = new Set(oldPlayers.map(getCleanDiscord).filter(Boolean));
    const oldIgns = new Set(oldPlayers.map(getCleanIgn).filter(Boolean));
    const oldDuelLinks = new Set(oldPlayers.map(getCleanDuelLinks).filter(Boolean));

    const newDiscords = new Set(players.map(getCleanDiscord).filter(Boolean));
    const newIgns = new Set(players.map(getCleanIgn).filter(Boolean));
    const newDuelLinks = new Set(players.map(getCleanDuelLinks).filter(Boolean));

    // 4A. Hapus data lama yang diganti
    const discordsToRemove = [...oldDiscords].filter(d => !newDiscords.has(d));
    const ignsToRemove = [...oldIgns].filter(i => !newIgns.has(i));
    const duelLinksToRemove = [...oldDuelLinks].filter(dl => !newDuelLinks.has(dl));

    if (discordsToRemove.length) await kv.srem('global:discord', ...discordsToRemove);
    if (ignsToRemove.length) await kv.srem('global:ign', ...ignsToRemove);
    if (duelLinksToRemove.length) await kv.srem('global:duellinks', ...duelLinksToRemove);

    // 4B. Tambah data baru yang masuk
    const discordsToAdd = [...newDiscords].filter(d => !oldDiscords.has(d));
    const ignsToAdd = [...newIgns].filter(i => !oldIgns.has(i));
    const duelLinksToAdd = [...newDuelLinks].filter(dl => !oldDuelLinks.has(dl));

    if (discordsToAdd.length) await kv.sadd('global:discord', ...discordsToAdd);
    if (ignsToAdd.length) await kv.sadd('global:ign', ...ignsToAdd);
    if (duelLinksToAdd.length) await kv.sadd('global:duellinks', ...duelLinksToAdd);

    // 5. Update Data Utama di KV Redis
    const createdAt = oldTeamData.createdAt as string;
    const updatedAt = new Date().toISOString(); 
    
    const updatedTeamObj = {
      ...oldTeamData,
      namaTim,
      warna,
      logoTim: logoTim || oldTeamData.logoTim,
      buktiTransfer: buktiTransfer || oldTeamData.buktiTransfer,
      players: JSON.stringify(players),
      updatedAt: updatedAt,
    };

    // Jika ganti slug nama tim, hapus key lama
    if (newTeamSlug !== teamSlug) {
      await kv.del(`teams:${teamSlug}`);
    }

    await kv.hset(`teams:${targetSlug}`, updatedTeamObj);

    // 6. Update Embeds Discord (Roster, Tracker, Creative)
    const rosterMessageId = oldTeamData.adminMsgId as string;
    const trackerChannelId = oldTeamData.discordChannelId as string;
    const trackerMessageId = oldTeamData.trackerMsgId as string;
    const teamRoleId = oldTeamData.discordRoleId || oldTeamData.roleId;
    
    const creativeMsgId = oldTeamData.creativeMsgId as string; 
    const creativeChannelId = oldTeamData.creativeChannelId || DISCORD_CONFIG.CH_LOGO;

    // 6A. Update Embed Roster
    if (rosterMessageId) {
      const ketua = players.find((p: any) => p.role === "Ketua") || { ign: "-", idDuelLinks: "-" };
      const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { ign: "-", idDuelLinks: "-" };
      
      let playerListString = "";
      players.forEach((p: any) => {
        playerListString += `${p.ign} (${p.idDuelLinks || p.duelId})\n`;
      });
      
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim || oldTeamData.logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString, inline: false }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };

      discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${rosterMessageId}`, 'PATCH', rosterPayload)
        .catch(err => console.error('Gagal update roster embed message:', err));
    }

    // 6B. Update Embed Tracker (Otomatis menampilkan Tanda ❌ jika belum terverifikasi)
    if (trackerChannelId && trackerMessageId) {
      let verifiedCount = 0;
      let rosterText = "";

      players.forEach((p: any) => {
        const pDiscord = p.discord ? p.discord.toLowerCase().replace(/^@/, '').trim() : '';
        const isVerified = verifiedMap.hasOwnProperty(pDiscord);

        if (isVerified) verifiedCount++;

        const icon = isVerified ? '✅' : '❌';
        rosterText += `${icon} ${p.ign} (@${p.discord}) - ${p.role}\n`;
      });
      
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `DAFTAR ROSTER:\n${rosterText}`,
          color: hexToDecimal(warna),
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '(Belum Ada)', inline: true },
            { name: "📊 Status", value: `${verifiedCount} / ${players.length} Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };

      discordAPI(`/channels/${trackerChannelId}/messages/${trackerMessageId}`, 'PATCH', trackerPayload)
        .catch(err => console.error('Gagal update tracker message:', err));
    }

    // 6C. Update Warna Role Tim
    if (teamRoleId && warna && warna !== oldTeamData.warna) {
      discordAPI(
        `/guilds/${DISCORD_CONFIG.GUILD_ID}/roles/${teamRoleId}`,
        'PATCH',
        { color: hexToDecimal(warna) }
      ).catch(err => console.error(`Gagal update warna role ${teamRoleId}:`, err));
    }

    // 6D. Update Pesan Creative
    if (creativeMsgId && warna && warna !== oldTeamData.warna) {
      const currentLogo = logoTim || oldTeamData.logoTim;
      let directDownloadLogo = currentLogo;
      
      if (currentLogo && currentLogo.includes('/upload/logo/')) {
        const splitUrl = currentLogo.split('/upload/logo/');
        if (splitUrl.length > 1) {
          directDownloadLogo = `https://teamwars.web.id/logo/${splitUrl[1]}/download`;
        }
      }

      const creativePayload = {
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: hexToDecimal(warna),
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: currentLogo },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      };

      discordAPI(`/channels/${creativeChannelId}/messages/${creativeMsgId}`, 'PATCH', creativePayload)
        .catch(err => console.error('Gagal update pesan creative:', err));
    }

    // 7. Berikan Respons Berhasil (Plus catatan warning jika ada)
    return NextResponse.json({
      success: true,
      message: 'Data tim berhasil diperbarui!',
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error) {
    console.error('Error Edit Team API:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data tim' }, { status: 500 });
  }
      }
        



================================================
FILE: app/api/list-routes/route.ts
================================================
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    
    // Fungsi rekursif untuk membaca seluruh folder di app/api
    function getApiRoutes(dir: string, baseRoute = '/api'): string[] {
      let routes: string[] = [];
      if (!fs.existsSync(dir)) return routes;

      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const subDir = path.join(dir, item.name);
          const routePath = `${baseRoute}/${item.name}`;
          
          // Cek jika ada file route.ts / route.js di dalam folder tersebut
          const hasRouteFile = fs.readdirSync(subDir).some(file => /^route\.(ts|js|tsx|jsx)$/.test(file));
          if (hasRouteFile && routePath !== '/api/list-routes') {
            routes.push(routePath);
          }

          routes = routes.concat(getApiRoutes(subDir, routePath));
        }
      }

      return routes;
    }

    const detectedRoutes = getApiRoutes(apiDir);

    return NextResponse.json({
      success: true,
      routes: detectedRoutes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



================================================
FILE: app/api/pre-flight/route.ts
================================================
import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

interface ErrorDetail {
  field: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { namaTim, players, excludeSlug } = data;
    const errorList: ErrorDetail[] = [];

    // Bersihkan excludeSlug di awal agar bisa dipakai di seluruh pengecekan
    const cleanExcludeSlug = excludeSlug ? excludeSlug.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") : undefined;

    // 1. PENGECEKAN NAMA TIM (Hanya jalan kalau namaTim diisi)
    if (namaTim && namaTim.trim()) {
      const cleanNamaTim = namaTim.trim();
      const teamSlug = cleanNamaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      if ((!cleanExcludeSlug || cleanExcludeSlug !== teamSlug) && await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${cleanNamaTim}" sudah terdaftar! Gunakan nama lain.` 
        });
      }
    }

    // 2. PENGECEKAN PEMAIN (Akan selalu jalan walau namaTim kosong)
    if (players && players.length > 0) {
      let oldIgns: string[] = [];
      let oldDiscords: string[] = [];
      let oldDuelLinks: string[] = [];

      if (cleanExcludeSlug) {
        const oldData: any = await kv.hgetall(`teams:${cleanExcludeSlug}`);
        if (oldData && oldData.players) {
          const parsedOldPlayers = typeof oldData.players === "string" ? JSON.parse(oldData.players) : oldData.players;
          
          // Tambahkan trim() juga saat narik data lama untuk memastikan komparasi bersih 100%
          oldIgns = parsedOldPlayers.map((p: any) => p.ign?.trim().toLowerCase() || "");
          oldDiscords = parsedOldPlayers.map((p: any) => p.discord?.trim().toLowerCase() || "");
          oldDuelLinks = parsedOldPlayers.map((p: any) => (p.idDuelLinks || p.duelId || "").trim());
        }
      }

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        
        // 🎯 Terapkan trim pada setiap input sebelum dicek
        const cleanIgn = p.ign ? p.ign.trim() : "";
        const cleanDiscord = p.discord ? p.discord.trim() : "";
        const cleanDuelId = p.idDuelLinks ? p.idDuelLinks.trim() : "";
        
        // -----------------------------------------------------------
        // ⛔ PENGECEKAN BLACKLIST (DUEL LINKS)
        // -----------------------------------------------------------
        if (cleanDuelId) {
          // Normalisasi ke 9 angka murni
          const cleanNumbers = cleanDuelId.replace(/\D/g, '');
          if (cleanNumbers.length === 9) {
            const formattedBlacklistId = `${cleanNumbers.slice(0, 3)}-${cleanNumbers.slice(3, 6)}-${cleanNumbers.slice(6, 9)}`;
            
            // Cek apakah ID terdaftar di Redis global:blacklisted_ids
            const isBlacklisted = await kv.sismember("global:blacklisted_ids", formattedBlacklistId);
            if (isBlacklisted) {
              errorList.push({ 
                field: `players.${i}.idDuelLinks`, 
                message: `⛔ ID Duel Links ${formattedBlacklistId} berada dalam DAFTAR BLACKLIST TWI dan dilarang mendaftar!` 
              });
            }
          }
        }
        // -----------------------------------------------------------

        if (cleanIgn && !oldIgns.includes(cleanIgn.toLowerCase()) && await kv.sismember("global:ign", cleanIgn.toLowerCase())) {
          errorList.push({ field: `players.${i}.ign`, message: `IGN "${cleanIgn}" sudah terdaftar!` });
        }
        
        if (cleanDiscord && !oldDiscords.includes(cleanDiscord.toLowerCase()) && await kv.sismember("global:discord", cleanDiscord.toLowerCase())) {
          errorList.push({ field: `players.${i}.discord`, message: `Discord @${cleanDiscord} sudah terdaftar!` });
        }
        
        if (cleanDuelId && !oldDuelLinks.includes(cleanDuelId) && await kv.sismember("global:duellinks", cleanDuelId)) {
          errorList.push({ field: `players.${i}.idDuelLinks`, message: `ID Duel Links ${cleanDuelId} sudah terdaftar!` });
        }
      }
    }

    // 3. PENGEMBALIAN HASIL
    if (errorList.length > 0) {
      return NextResponse.json({ success: false, errors: errorList });
    }
    
    return NextResponse.json({ success: true, message: "Aman, silakan lanjut!" });

  } catch (error: unknown) {
    console.error("Pre-Flight Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server saat pre-flight" }, { status: 500 });
  }
            }



================================================
FILE: app/api/registration/route.ts
================================================
import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { 
  createDiscordRole, 
  createDiscordChannel, 
  createDiscordVoiceChannel, 
  autoSortTeamRoles,
  sendTeamTracker 
} from '@/lib/discord';

// Modul Discord Message Bot API
import { sendFinanceMessage } from '@/lib/discord/messages/finance';
import { sendCreativeMessage } from '@/lib/discord/messages/creative';
import { sendRosterMessage } from '@/lib/discord/messages/roster';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailSafe(params: any) {
  try {
    await resend.emails.send(params);
  } catch (error) {
    console.error(`Gagal kirim email ke ${params.to}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // 👈 TAMBAHAN: Ekstrak channelId, alias menjadi customChannelId agar tidak bentrok
    const { email, namaTim, warna, logoTim, buktiTransfer, players, channelId: customChannelId } = data; 

    if (!namaTim || typeof namaTim !== 'string') {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim wajib diisi!" }] }, { status: 400 });
    }

    const trimmedNamaTim = namaTim.trim();
    const teamSlug = trimmedNamaTim
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar!" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); 

    // Simpan ke brankas utama Redis
    await kv.hset(kvKey, {
      namaTim: trimmedNamaTim,
      warna: warna,
      email: email ? email.trim() : "",
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), 
      createdAt: timestampNow,
      statusVerifikasi: "Pending",
      editToken: editToken
    });

    await kv.set(`token:map:${editToken}`, teamSlug);
    await kv.sadd("global:teams", teamSlug);

    // Injeksi Index Sekunder
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks || p.duelId);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    
    const templateData = { 
      namaTim: trimmedNamaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players, editToken 
    };

    // Orkestrasi Background Tasks (Email & Discord)
    const emailPromise = email 
      ? sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${trimmedNamaTim} [Teamwars S7]`, 
          html: getPesertaTemplate(templateData) 
        })
      : Promise.resolve();

    const discordTasks = async () => {
      try {
        const roleId = await createDiscordRole(trimmedNamaTim, warna);
        
        let channelId = "";
        let voiceChannelId = ""; 
        let trackerMsgId = ""; 

        if (roleId) {
          channelId = await createDiscordChannel(trimmedNamaTim, roleId);
          voiceChannelId = await createDiscordVoiceChannel(trimmedNamaTim, roleId); 
          
          if (channelId) {
            trackerMsgId = await sendTeamTracker({ channelId, namaTim: trimmedNamaTim, warna, roleId, players, createdAt: timestampNow });
          }
        }
        
        // 👈 TAMBAHAN: Lempar customChannelId ke fungsi-fungsi pengirim pesan
        const [financeId, creativeId, rosterId] = await Promise.all([
          sendFinanceMessage({ namaTim: trimmedNamaTim, warna, buktiTransfer, teamSlug, channelId: customChannelId }),
          sendCreativeMessage({ namaTim: trimmedNamaTim, warna, logoTim, channelId: customChannelId }),
          sendRosterMessage({ namaTim: trimmedNamaTim, warna, ketua, wakil, players, logoTim, createdAt: timestampNow, channelId: customChannelId })
        ]);

        await kv.hset(kvKey, { 
          discordRoleId: roleId,
          discordChannelId: channelId, 
          discordVoiceChannelId: voiceChannelId, 
          trackerMsgId: trackerMsgId, 
          adminMsgId: rosterId,
          financeMsgId: financeId,
          creativeMsgId: creativeId
        });

        try { await autoSortTeamRoles(); } catch (e) { console.warn("Gagal mengurutkan otomatis."); }
      } catch (err) { console.error("Gagal tugas Discord:", err); }
    };

    await Promise.allSettled([emailPromise, discordTasks()]);
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil!" });

  } catch (error: unknown) {
    console.error("API Submit Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
  



================================================
FILE: app/api/roulette-state/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { buildRouletteLogEmbed } from '@/lib/discord/messages/roulette';

const KV_KEY_ROULETTE = 'twi:roulette_state';
const KV_KEY_LOGS = 'twi:roulette_logs';

export interface TeamItem {
  name: string;
  logo: string;
  createdAt?: string;
}

export interface LogItem {
  id: string;
  timestamp: string;
  teamName: string;
  teamLogo: string;
  targetGroup: "Group A" | "Group B";
  slotNumber: number;
  discordMessageId?: string;
}

export interface RouletteState {
  remainingTeams: TeamItem[];
  groupA: TeamItem[];
  groupB: TeamItem[];
  selectedTargetGroup?: "GROUP_A" | "GROUP_B";
  celebrationWinner?: TeamItem | null;
  resetMessageId?: string | null;
  spinEvent?: {
    winningIndex: number;
    targetAngle: number;
    startTime: number;
    durationMs: number;
    targetGroup: "Group A" | "Group B";
  } | null;
}

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    let masterTeams: TeamItem[] = [];

    if (teamKeys && teamKeys.length > 0) {
      const rawTeams = await Promise.all(
        teamKeys.map((key) => kv.hgetall<Record<string, any>>(key))
      );

      masterTeams = rawTeams
        .filter((team): team is Record<string, any> => Boolean(team))
        .map((team) => ({
          name: team?.namaTim || team?.name || 'Unknown Team',
          logo: team?.logoTim || team?.logo || '/logo.webp',
          createdAt: team?.waktuRegis || team?.createdAt || new Date(0).toISOString(),
        }))
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    }

    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);
    const logs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    if (!currentState) {
      return NextResponse.json({
        masterTeams,
        remainingTeams: masterTeams,
        groupA: [],
        groupB: [],
        selectedTargetGroup: "GROUP_A",
        logs,
        celebrationWinner: null,
        resetMessageId: null,
        spinEvent: null,
      });
    }

    return NextResponse.json({
      masterTeams,
      logs,
      ...currentState,
    });
  } catch (error) {
    console.error('Error GET Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remainingTeams, groupA, groupB, selectedTargetGroup, celebrationWinner, spinEvent, newLog } = body;

    const currentState = (await kv.get<RouletteState>(KV_KEY_ROULETTE)) || ({} as RouletteState);
    let currentResetMsgId = currentState.resetMessageId || null;
    
    if (spinEvent && currentResetMsgId) {
      await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${currentResetMsgId}`,
        'DELETE'
      ).catch(() => null);
      currentResetMsgId = null;
    }

    // 1. Simpan State Pengundian ke KV
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams,
      groupA,
      groupB,
      selectedTargetGroup: selectedTargetGroup || "GROUP_A",
      celebrationWinner: celebrationWinner || null,
      resetMessageId: currentResetMsgId,
      spinEvent: spinEvent || null,
    });

    // 2. Kirim Log Tim Terpilih Baru ke Discord
    if (newLog) {
      const embedPayload = buildRouletteLogEmbed({
        teamName: newLog.teamName,
        teamLogo: newLog.teamLogo,
        targetGroup: newLog.targetGroup,
        slotNumber: newLog.slotNumber,
      });

      const resDiscord = await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages`,
        'POST',
        embedPayload
      );

      const messageId = resDiscord?.id || undefined;
      const logWithMsgId: LogItem = { ...newLog, discordMessageId: messageId };

      const existingLogs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];
      const updatedLogs = [logWithMsgId, ...existingLogs];
      await kv.set(KV_KEY_LOGS, updatedLogs);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error POST Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const currentState = await kv.get<RouletteState>(KV_KEY_ROULETTE);
    const existingLogs = (await kv.get<LogItem[]>(KV_KEY_LOGS)) || [];

    // 1. Kumpulkan seluruh ID pesan yang perlu dihapus dari Discord
    const rawIds: string[] = [];

    for (const log of existingLogs) {
      if (log.discordMessageId) {
        rawIds.push(log.discordMessageId);
      }
    }

    if (currentState?.resetMessageId) {
      rawIds.push(currentState.resetMessageId);
    }

    const uniqueMessageIds = Array.from(new Set(rawIds));

    // 2. Eksekusi Hapus Pesan ke Discord
    if (uniqueMessageIds.length > 0) {
      if (uniqueMessageIds.length === 1) {
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${uniqueMessageIds[0]}`,
          'DELETE'
        );
      } else {
        const bulkSuccess = await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/bulk-delete`,
          'POST',
          { messages: uniqueMessageIds }
        );

        // Fallback jika Bulk Delete gagal
        if (!bulkSuccess) {
          await Promise.allSettled(
            uniqueMessageIds.map((msgId) =>
              discordAPI(
                `/channels/${DISCORD_CONFIG.CH_SHUFFLE}/messages/${msgId}`,
                'DELETE'
              )
            )
          );
        }
      }
    }

    // 3. Bersihkan/Reset State di KV Redis (TANPA KIRIM PESAN BARU)
    await kv.set(KV_KEY_ROULETTE, {
      remainingTeams: [],
      groupA: [],
      groupB: [],
      selectedTargetGroup: "GROUP_A",
      celebrationWinner: null,
      resetMessageId: null,
      spinEvent: null,
    });

    await kv.del(KV_KEY_LOGS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE Roulette State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  }



================================================
FILE: app/api/seed/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Data Pemetaan Role ID -> Message ID yang Presisi untuk 16 Tim
const MAPPING_DATA = [
  { roleId: '1524016640961020105', msgId: '1531814783811195062', fallbackName: 'asashin' },
  { roleId: '1524245016552144978', msgId: '1531853805174394901', fallbackName: 'ux' }, // Role ID Asli UX
  { roleId: '1526622236218360029', msgId: '1531899103494279241', fallbackName: 'supernova' },
  { roleId: '1526957876352913420', msgId: '1531889081485758465', fallbackName: 'playground' },
  { roleId: '1527305125297782864', msgId: '1531894069939146824', fallbackName: 'licht united' },
  { roleId: '1527599406126469151', msgId: '1531848771569451330', fallbackName: 'octagram' },
  { roleId: '1527695890436067468', msgId: '1531884002833858644', fallbackName: 'dracarys' },
  { roleId: '1527875177797517477', msgId: '1531863871369777313', fallbackName: 'xernobyl' },
  { roleId: '1528758776872697856', msgId: '1531858888721170454', fallbackName: 'kings united' },
  { roleId: '1530913037500944588', msgId: '1531873977985667273', fallbackName: 'sakurajima' },
  { roleId: '1531030239055187978', msgId: '1531843779613429861', fallbackName: 'blackrose' },
  { roleId: '1531121262972240053', msgId: '1531904181986922539', fallbackName: 'final chapter' },
  { roleId: '1531262929675096175', msgId: '1531878967609659544', fallbackName: 'fabulous' },
  { roleId: '1531568842545827961', msgId: '1531868902521442315', fallbackName: 'trust' },
  { roleId: '1532167149924388894', msgId: '1532176673104072899', fallbackName: 'darkfall' },
  { roleId: '1532353903155216536', msgId: '1532393245815078913', fallbackName: 'nova quasar' },
];

export async function GET() {
  try {
    const teamKeys = await kv.keys('teams:*');
    let updatedCount = 0;
    const details: string[] = [];

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const savedRoleId = 
        teamData.discordRoleId || 
        teamData.roleId || 
        teamData.roleTeamId || 
        teamData.roleTeam || 
        teamData.idRole || 
        '';

      const namaTim = (teamData.namaTim || key).toLowerCase();

      // Cocokkan berdasarkan Role ID atau Nama Tim (Fallback)
      const match = MAPPING_DATA.find((m) => 
        (savedRoleId && m.roleId === savedRoleId) || 
        namaTim.includes(m.fallbackName)
      );

      if (match) {
        await kv.hset(key, { editReminderMsgId: match.msgId });
        updatedCount++;
        details.push(`OK: ${teamData.namaTim || key} -> ${match.msgId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengupdate ${updatedCount} tim!`,
      details,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}



================================================
FILE: app/api/sign-cloudinary/route.ts
================================================
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { folder, public_id } = await request.json();
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // PERUBAHAN POIN 5: Folder sekarang namanya "bukti"
    const isBukti = folder === "bukti"; 

    const paramsToSign: Record<string, any> = {
      timestamp,
      folder,
      public_id,
      overwrite: true,
      // PERUBAHAN POIN 3 & 4: Paksa format dari server
      format: isBukti ? "jpg" : "png" 
    };

    if (isBukti) {
      paramsToSign.transformation = "c_limit,w_1920,h_1920,q_auto";
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign, 
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ 
      api_key: process.env.CLOUDINARY_API_KEY, 
      signature, 
      ...paramsToSign 
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat signature" }, { status: 500 });
  }
}



================================================
FILE: app/api/tournament/route.ts
================================================
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { calculateStandings } from '@/lib/tournament/calculator';

const KV_KEY_SCHEDULES = 'twi:schedules';
const KV_KEY_ROULETTE = 'twi:roulette_state';

export async function GET() {
  try {
    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};

    const rawGroupA = rouletteState.groupA || [];
    const rawGroupB = rouletteState.groupB || [];

    const groupA = rawGroupA.map((t: any) => ({ ...t, groupName: 'Group A' }));
    const groupB = rawGroupB.map((t: any) => ({ ...t, groupName: 'Group B' }));

    // Auto-generate jika jadwal belum ada
    if (schedules.length === 0) {
      schedules = generateChallongeRoundRobinSchedules(groupA, groupB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    const masterTeams = [...groupA, ...groupB];
    const standings = calculateStandings(schedules, masterTeams);

    return NextResponse.json({
      schedules,
      standings,
      groupA,
      groupB,
      masterTeams,
    });
  } catch (error) {
    console.error('Error GET Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, matchId, matchDate, scoreA, scoreB } = body;

    let schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    // 🟢 PAKSA SYNC TIM DARI ROULETTE & REGENERATE JADWAL
    if (action === 'SYNC_ROULETTE' || action === 'FORCE_RESET_SCHEDULES') {
      const rouletteState = (await kv.get<any>(KV_KEY_ROULETTE)) || {};
      const gA = (rouletteState.groupA || []).map((t: any) => ({ ...t, groupName: 'Group A' }));
      const gB = (rouletteState.groupB || []).map((t: any) => ({ ...t, groupName: 'Group B' }));

      schedules = generateChallongeRoundRobinSchedules(gA, gB);
      await kv.set(KV_KEY_SCHEDULES, schedules);
      return NextResponse.json({ success: true, schedules });
    }

    if (action === 'UPDATE_MATCH') {
      schedules = schedules.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            matchDate: matchDate ?? match.matchDate,
            scoreA: scoreA ?? match.scoreA,
            scoreB: scoreB ?? match.scoreB,
            isFinished: scoreA >= 10 || scoreB >= 10,
          };
        }
        return match;
      });
      await kv.set(KV_KEY_SCHEDULES, schedules);
    }

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('Error POST Tournament State:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateChallongeRoundRobinSchedules(groupA: any[], groupB: any[]): MatchScheduleItem[] {
  const schedules: MatchScheduleItem[] = [];
  let idCounter = 1;

  const generateRounds = (teams: any[]) => {
    const roundsList: [any, any][][] = [];
    const list = [...teams];
    if (list.length < 2) return roundsList;
    if (list.length % 2 !== 0) list.push({ name: "BYE", dummy: true });

    const numRounds = list.length - 1;
    const half = list.length / 2;

    for (let r = 0; r < numRounds; r++) {
      const roundMatches: [any, any][] = [];
      for (let i = 0; i < half; i++) {
        const team1 = list[i];
        const team2 = list[list.length - 1 - i];
        if (team1 && team2 && !team1.dummy && !team2.dummy) {
          roundMatches.push([team1, team2]);
        }
      }
      roundsList.push(roundMatches);
      list.splice(1, 0, list.pop()!);
    }
    return roundsList;
  };

  const roundsA = generateRounds(groupA);
  const roundsB = generateRounds(groupB);
  const totalRounds = Math.max(roundsA.length, roundsB.length);

  const startWednesdayUTC = new Date("2026-08-05T13:00:00.000Z");

  for (let r = 0; r < totalRounds; r++) {
    const roundMatchesA = roundsA[r] || [];
    const roundMatchesB = roundsB[r] || [];

    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const matchDate = new Date(startWednesdayUTC);
      matchDate.setDate(matchDate.getDate() + (r * 7) + dayOffset);

      if (dayOffset < roundMatchesA.length) {
        const pairA = roundMatchesA[dayOffset];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group A",
          teamAId: pairA[0].name,
          teamAName: pairA[0].name,
          teamALogo: pairA[0].logo || "/logo.webp",
          teamBId: pairA[1].name,
          teamBName: pairA[1].name,
          teamBLogo: pairA[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          streamer: "Alroy_Yuan",
        });
      }

      if (dayOffset < roundMatchesB.length) {
        const pairB = roundMatchesB[dayOffset];
        schedules.push({
          id: `match-${idCounter++}`,
          matchDate: matchDate.toISOString(),
          stage: "GROUP_STAGE",
          groupName: "Group B",
          teamAId: pairB[0].name,
          teamAName: pairB[0].name,
          teamALogo: pairB[0].logo || "/logo.webp",
          teamBId: pairB[1].name,
          teamBName: pairB[1].name,
          teamBLogo: pairB[1].logo || "/logo.webp",
          scoreA: 0,
          scoreB: 0,
          isFinished: false,
          referee: "vG®D WHY",
          streamer: "Alroy_Yuan",
        });
      }
    }
  }

  return schedules;
}



================================================
FILE: app/edit-team/[token]/page.tsx
================================================
import { kv } from "@vercel/kv";
import { CLOSE_TARGET } from "@/lib/config";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { RegistrationForm } from "@/app/registration/components/registration-form";

// Komponen Reusable untuk Pesan Error
function ErrorScreen({ message, isAdmin }: { message: string, isAdmin?: boolean }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <TopBar title={`Manajemen Tim ${isAdmin ? "(Admin)" : ""}`} showTrash={false} />
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 pb-4 sm:px-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
           <h3 className="text-xl font-bold mb-2 text-foreground">Akses Ditolak</h3>
           <p className="font-semibold text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </main>
  );
}

export default async function EditTeamPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  // 🎯 Tangkap parameter ?key= dari URL
  const resolvedSearchParams = await searchParams;
  const adminKey = resolvedSearchParams.key;

  // ==========================================
  // 1. VALIDASI MODE ADMIN
  // ==========================================
  const ADMIN_SECRET = "470212070957252618";
  const isAdminMode = adminKey === ADMIN_SECRET;

  if (adminKey && !isAdminMode) {
    return <ErrorScreen message="Key Admin tidak valid atau tidak dikenali!" isAdmin={true} />;
  }

  if (!token) {
    return <ErrorScreen message="Parameter token tidak ditemukan di URL." isAdmin={isAdminMode} />;
  }

  // ==========================================
  // 2. PENGAMBILAN DATA DATABASE
  // ==========================================
  const teamSlug = await kv.get<string>(`token:map:${token}`);
  if (!teamSlug) {
    return <ErrorScreen message={`Token "${token}" tidak terdaftar di sistem kami.`} isAdmin={isAdminMode} />;
  }

  const teamData: any = await kv.hgetall(`teams:${teamSlug}`);
  if (!teamData) {
    return <ErrorScreen message={`Data untuk tim tidak ditemukan di database.`} isAdmin={isAdminMode} />;
  }

  let parsedPlayers = [];
  try {
    parsedPlayers = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : (teamData.players || []);
  } catch (e) { parsedPlayers = []; }

  const cleanTeamData = { ...teamData, players: parsedPlayers };

  // ==========================================
  // 3. LOGIKA WAKTU (ADMIN BYPASS)
  // ==========================================
  const isClosed = Date.now() > CLOSE_TARGET;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      
      <TopBar title={`Manajemen Tim ${isAdminMode ? "(Admin Mode)" : ""}`} showTrash={false} />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        <HeroHeader />
        
        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* Banner Khusus Jika Admin Mode Aktif */}
          {isAdminMode && (
            <div className="w-full max-w-2xl mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/40 p-4 text-center shadow-sm">
               <p className="font-bold text-emerald-500 mb-1">🛡️ MODE ADMIN AKTIF</p>
               <p className="text-sm text-emerald-600/80">Anda memiliki akses penuh untuk mengubah seluruh data, dan dapat mengedit form ini meskipun waktu pendaftaran telah ditutup.</p>
            </div>
          )}

          {/* Tampilan Terkunci (Jika Waktu Habis DAN Bukan Admin) */}
          {isClosed && !isAdminMode ? (
             <div className="w-full max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center shadow-xl backdrop-blur-md">
               <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive text-3xl">🔒</div>
               <h3 className="text-xl font-bold mb-2 text-foreground">Pendaftaran Ditutup</h3>
               <p className="font-semibold text-muted-foreground text-sm">
                 Batas waktu pendaftaran dan modifikasi roster untuk TWI Season 7 telah berakhir. 
               </p>
             </div>
          ) : (
            <div className="w-full max-w-2xl">
              <RegistrationForm 
                isEditMode={true} 
                isAdminMode={isAdminMode} 
                initialData={cleanTeamData} 
                editToken={token} 
              />
            </div>
          )}
        </section>
        <Footer />
      </div>
    </main>
  );
        }



================================================
FILE: app/invite/page.tsx
================================================
import type { Metadata } from 'next'

const DISCORD_LINK = "https://discord.gg/NtBBdqUrxe"

export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Discord - Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Discord - Masuk ke server Discord resmi Team Wars Indonesia untuk mencari tim, bertanya ke panitia, dan mendapatkan info terbaru.',
    images: [
      {
        // 1. UBAH KE URL ABSOLUT
        url: 'https://teamwars.web.id/logo-dc.png', 
        width: 1200,
        height: 630,
        alt: 'Team Wars Indonesia Discord',
      },
    ],
  },
}

export default function InvitePage() {
  return (
    // 2. HAPUS TAG HTML DAN BODY
    <main className="flex h-screen items-center justify-center bg-slate-950 text-white">
      {/* Trik Meta Refresh tetap bekerja tanpa harus dibungkus tag <head> */}
      <meta httpEquiv="refresh" content={`0;url=${DISCORD_LINK}`} />
      
      <div className="text-center">
        <h1 className="text-xl font-bold">Mengalihkan ke Discord...</h1>
        <p className="mt-2 text-sm text-slate-400">
          Jika tidak dialihkan secara otomatis,{' '}
          <a href={DISCORD_LINK} className="text-blue-400 underline hover:text-blue-300">
            klik di sini
          </a>.
        </p>
      </div>
    </main>
  )
}



================================================
FILE: app/maintenance/page.tsx
================================================
import Link from "next/link";

export default function MaintenancePage() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center animate-in fade-in duration-500">
            <div className="mb-6 rounded-full bg-yellow-500/20 p-6">
                <span className="text-6xl">🛠️</span>
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Sistem Sedang Diperbaiki
            </h1>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">
                Mohon maaf, halaman Registrasi dan Edit Tim saat ini sedang ditutup sementara untuk perbaikan sistem dan pembersihan bug. Kami akan segera kembali!
            </p>
            <Link 
                href="/" 
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
                Kembali ke Beranda
            </Link>
        </div>
    )
}



================================================
FILE: app/registration/page-client.tsx
================================================
"use client";

import { useState, useEffect } from "react";
import { RegistrationForm } from "./components/registration-form";
import { TopBar, HeroHeader, Footer } from "@/components/layout-shared";
import { STORAGE_KEY } from "./utils/lib-registration";

export default function Page() {
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);
  const accountNumber = "0467897733";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks", err);
    }
  };

  const handleClearStorage = () => {
    setIsConfirmTrashOpen(true);
  };

  useEffect(() => {
    if (isConfirmTrashOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isConfirmTrashOpen]);
  
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />

      <TopBar onClearStorage={handleClearStorage} showTrash={true} title="Official Registration" />

      {/* MODAL KONFIRMASI */}
      {isConfirmTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass glow-border w-full max-w-sm rounded-2xl border bg-popover/90 p-6 shadow-2xl scale-in-95 animate-in">
            <h3 className="text-lg font-bold text-foreground">Hapus Data Pendaftaran?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus semua data pendaftaran yang tersimpan di browser ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setIsConfirmTrashOpen(false)}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-destructive/90 active:scale-[0.98]"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center px-4 pb-4 sm:px-6">
        
        <HeroHeader />

        {/* SECTION KONTEN */}
        <section className="flex w-full max-w-4xl flex-col items-center">
          
          {/* INFO PEMBAYARAN */}
          <div className="mb-8 w-full max-w-2xl">
            <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
              <div className="mb-5 border-b border-border pb-5 sm:mb-6 sm:pb-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-5 w-1 rounded-full bg-primary"></div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Pembayaran
                  </p>
                </div>
                <p className="w-full text-center text-3xl font-black text-foreground">
                  Rp 250.000
                </p>
              </div>

              <div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bank Tujuan</span>
                    <span className="font-semibold text-foreground">BCA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span className="font-semibold text-foreground">Victor Widiputra</span>
                  </div>
                </div>

                {/* Pembungkus utama menggunakan trik flex-1 agar responsif */}
                <div className="mt-5 flex min-h-[56px] w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3">
                  
                  {/* 1. Spacer Kiri (Sembunyi di HP, muncul di PC sebagai penyeimbang) */}
                  <div className="hidden flex-1 sm:block"></div>
                  
                  {/* 2. Nomor Rekening (Di HP rata kiri, di PC ditarik ke tengah) */}
                  <div className="flex sm:flex-1 sm:justify-center">
                    <span className="font-mono text-lg font-bold tracking-widest text-foreground">
                      {accountNumber}
                    </span>
                  </div>

                  {/* 3. Tombol Salin (Selalu didorong ke kanan) */}
                  <div className="flex justify-end sm:flex-1">
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95"
                      title="Salin nomor rekening"
                    >
                      {isCopied ? "Tersalin! ✓" : "Salin 📋"}
                    </button>
                  </div>

                </div>
              </div>
            </section>
          </div>

          {/* AREA FORM */}
          <div className="w-full max-w-2xl">
            <RegistrationForm />
          </div>
        </section>

        <Footer />
        
      </div>
    </main>
  );
}



================================================
FILE: app/registration/page.tsx
================================================

import type { Metadata } from 'next'
import PageClient from './page-client' // Mengimpor UI dari file sebelah

// 1. Atur metadata di sini (Server Side)
export const metadata: Metadata = {
  title: 'Team Wars Indonesia',
  description: 'Official Registration - Daftarkan tim Anda sekarang.',
  openGraph: {
    title: 'Team Wars Indonesia',
    description: 'Official Registration - Daftarkan tim Anda sekarang.',
    url: 'https://teamwars.web.id/registration',
    siteName: 'Team Wars Indonesia',
    images: [
      {
        // Sesuaikan dengan nama gambar PNG/JPG Anda di folder public/
        url: '/opengraph-image.jpg', 
        width: 1200, // Opsional, tapi disarankan
        height: 630, // Opsional, tapi disarankan
        alt: 'Team Wars Indonesia Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
}

// 2. Render komponen Client Anda
export default function Page() {
  return <PageClient />
}



================================================
FILE: app/registration/components/captcha.tsx
================================================
"use client"
import { useState, useEffect } from "react"

interface CaptchaProps {
    onValidChange: (isValid: boolean) => void;
    resetTrigger?: boolean;
}

export function Captcha({ onValidChange, resetTrigger }: CaptchaProps) {
    const [a, setA] = useState(0);
    const [b, setB] = useState(0);
    const [answer, setAnswer] = useState("");

    // Generate angka acak setiap kali komponen dimuat atau resetTrigger berubah
    useEffect(() => {
        setA(Math.floor(Math.random() * 8) + 1);
        setB(Math.floor(Math.random() * 8) + 1);
        setAnswer("");
        onValidChange(false);
    }, [resetTrigger]);

    // Validasi jawaban secara real-time
    useEffect(() => {
        const parsed = Number.parseInt(answer, 10);
        const isValid = !isNaN(parsed) && parsed === a + b;
        onValidChange(isValid);
    }, [answer, a, b]);

    return (
        <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <span className="shrink-0 font-mono text-lg font-bold">
                {a} + {b} =
            </span>
            <input
                type="number"
                min="0"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="?"
                className="w-20 rounded-md border bg-background px-3 py-1.5 text-center text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
        </div>
    );
}



================================================
FILE: app/registration/components/file-dropzone.tsx
================================================
"use client"

import { useRef, useState, type DragEvent } from "react"
import { UploadIcon, CloseIcon } from "@/components/icons"

interface FileDropzoneProps {
  id: string
  label: string
  hint?: string
  value: any | null 
  onChange: (file: any | null) => void
  error?: string
  teamName?: string 
}

export function FileDropzone({ id, label, hint, value, onChange, error, teamName = "twi-team" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setLocalError(null)

    // Validasi Format Terkunci
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLocalError("Format ditolak ngab! Cuma terima JPG, PNG, atau WEBP.")
      return
    }
    // Output Data Objek Baru
    onChange({ 
      name: file.name, 
      size: file.size, 
      url: URL.createObjectURL(file), // Preview lokal
      rawFile: file                    // File mentah untuk Canvas
    })
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (!isReading) handleFile(e.dataTransfer.files?.[0])
  }

  const shownError = error ?? localError

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200">
          <img src={value.url} alt={`Pratinjau ${label}`} className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              ✓ File Berhasil Diunggah 
            </p>
          </div>
          <button type="button" onClick={() => { onChange(null); setLocalError(null); if (inputRef.current) inputRef.current.value = "" }} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isReading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isReading) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
            dragging ? "border-primary bg-primary/10 scale-[1.02]" : 
            shownError ? "border-destructive bg-destructive/5" : 
            isReading ? "border-primary/50 bg-primary/5 opacity-80 cursor-wait" : 
            "border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {isReading ? (
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
             <UploadIcon className="h-6 w-6 text-muted-foreground" />
          )}
          
          <p className="text-sm font-medium text-foreground">
            {isReading ? (
              <span className="text-primary font-bold animate-pulse">Membaca berkas... ⏳</span>
            ) : (
              "Seret & lepas atau klik untuk unggah"
            )}
          </p>
          <p className="text-xs text-muted-foreground">{hint ?? "PNG / JPG / WEBP"}</p>
        </div>
      )}
      <input ref={inputRef} id={id} type="file" accept=".png, .jpg, .jpeg, .webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {shownError && <p className="mt-1 text-xs font-medium text-destructive">{shownError}</p>}
    </div>
  )
}



================================================
FILE: app/registration/components/registration-form.tsx
================================================
"use client"

import { useMemo, useEffect, useRef } from 'react';
import { useRoster } from "../hooks/use-roster"
import type { PlayerState } from "../hooks/types"
import { useTeamDetails } from "../hooks/use-team-details"
import { useRegistrationFlow } from "../hooks/use-registration-flow"
import { ReviewModal } from "../components/review-modal"
import { TeamIdentity } from "../components/team-identity"
import { SuccessModal } from "../components/success-modal"
import { RosterSection } from "../components/roster-section"

interface RegistrationFormProps {
  isEditMode?: boolean;
  initialData?: any; 
  editToken?: string;
  isAdminMode?: boolean; 
}

export function RegistrationForm({ 
  isEditMode = false, 
  initialData, 
  editToken = "", 
  isAdminMode = false 
}: RegistrationFormProps) {
  const team = useTeamDetails()
  const roster = useRoster()
  
  const flow = useRegistrationFlow(
    team, 
    roster, 
    isEditMode, 
    initialData?.namaTim || "", 
    editToken
  )
  const hasInitialized = useRef(false);
  const hasAutoFilled = useRef(false);

  // 1. useEffect bawaan untuk Edit Mode
  useEffect(() => {
    if (isEditMode && initialData && !hasInitialized.current) {
      team.setEmail(initialData.email || "");
      team.setNamaTim(initialData.namaTim || "");
      team.setHex(initialData.warna || "");
      
      team.setLogo({ url: initialData.logoTim, name: "logo-terkunci.png", size: 0 });
      team.setBukti({ url: initialData.buktiTransfer, name: "bukti-terkunci.jpg", size: 0 });
      
      const mappedPlayers: PlayerState[] = (initialData.players || []).map((p: any, index: number) => ({
        ...p,
        id: p.id || `player-${index}`, 
        namaLengkap: p.namaLengkap || "",
        ign: p.ign || "",
        discord: p.discord || "",
        duelId: p.duelId || p.idDuelLinks || "", 
      }));

      roster.setPlayers(mappedPlayers);
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialData]); 

  // 2. Script Auto-Fill untuk Testing via URL
  useEffect(() => {
    if (typeof window !== 'undefined' && !isEditMode && !hasAutoFilled.current) {
      const params = new URLSearchParams(window.location.search);
      
      if (params.get('test') === 'auto') {
        const randomStr = Math.floor(Math.random() * 1000);
        
        team.setEmail(`anisya2402@gmail.com`);
        team.setNamaTim(`TIM TESTER ${randomStr}`);
        team.setHex(`#FF5${randomStr}`); 
        
        team.setLogo({ url: "https://teamwars.web.id/dummy-logo.png", name: "dummy-logo.png", size: 1024 });
        team.setBukti({ url: "https://teamwars.web.id/dummy-bukti.jpg", name: "dummy-bukti.jpg", size: 1024 });
        
        roster.setPlayers([
          { 
            id: "test-1", 
            namaLengkap: "Tester Satu", 
            ign: `Tester1_${randomStr}`, 
            discord: "tsaqif.mtz", 
            duelId: `111-222-${randomStr}`, 
            role: "Ketua" 
          },
          { 
            id: "test-2", 
            namaLengkap: "Tester Dua", 
            ign: `Tester2_${randomStr}`, 
            discord: "achmadns20", 
            duelId: `222-333-${randomStr}`, 
            role: "Wakil Ketua" 
          },
          { 
            id: "test-3", 
            namaLengkap: "Tester Tiga", 
            ign: `Tester3_${randomStr}`, 
            discord: "shinryuki", 
            duelId: `333-444-${randomStr}`, 
            role: "Anggota" 
          },
          { 
            id: "test-4", 
            namaLengkap: "Tester Empat", 
            ign: `Tester4_${randomStr}`, 
            discord: "natsu_24", 
            duelId: `444-555-${randomStr}`, 
            role: "Anggota" 
          },
          { 
            id: "test-5", 
            namaLengkap: "Tester Lima", 
            ign: `Tester5_${randomStr}`, 
            discord: "haraheta1", 
            duelId: `555-666-${randomStr}`, 
            role: "Anggota" 
          },
        ]);
        hasAutoFilled.current = true; 
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // 3. Deteksi Perubahan Data Termasuk Logo & Bukti Transfer
  const hasChanges = useMemo(() => {
    if (!isEditMode || !initialData) return true; 

    const emailChanged = team.email.trim() !== (initialData.email || "").trim();
    const nameChanged = team.namaTim.trim() !== (initialData.namaTim || "").trim();
    const colorChanged = team.hex.toLowerCase() !== (initialData.warna || "").toLowerCase();

    // Cek perubahan URL logo & bukti transfer terhadap data awal
    const logoChanged = Boolean(team.logo?.url && team.logo.url !== initialData.logoTim);
    const buktiChanged = Boolean(team.bukti?.url && team.bukti.url !== initialData.buktiTransfer);

    const currentRoster = roster.players.map((p) => ({
      ign: p.ign.trim(),
      discord: p.discord.trim(),
      duelId: p.duelId.trim(),
      role: p.role
    }));

    const originalRoster = (initialData.players || []).map((p: any) => ({
      ign: (p.ign || "").trim(),
      discord: (p.discord || "").trim(),
      duelId: (p.idDuelLinks || p.duelId || "").trim(),
      role: p.role
    }));

    const rosterChanged = JSON.stringify(currentRoster) !== JSON.stringify(originalRoster);

    return nameChanged || colorChanged || rosterChanged || emailChanged || logoChanged || buktiChanged;
  }, [team.email, team.namaTim, team.hex, team.logo, team.bukti, roster.players, isEditMode, initialData]);

  const handleSyncDiscord = async () => {
    // Buat format slug tim persis seperti di backend
    const teamSlug = team.namaTim
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    const response = await fetch('/api/admin/sync-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamSlug }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Terjadi kesalahan sistem saat sinkronisasi.");
    }
  };
  
  return (
    <>
      <form 
        id="registration-form" 
        onSubmit={(e) => {
          e.preventDefault();
          flow.handleReviewClick();
        }} 
        className="flex flex-col gap-6"
      >
        <TeamIdentity 
          {...team} 
          err={flow.err} 
          markTouched={flow.markTouched} 
          isEditMode={isEditMode}
          isAdminMode={isAdminMode} 
        />

        <RosterSection 
          {...roster} 
          rosterRuleOk={flow.rosterRuleOk}
          handleSmartPaste={() => {
            roster.handleSmartPaste(flow.markTouchedMultiple)
            flow.triggerSmartPasteBypass()
          }}
          err={flow.err} 
          markTouched={flow.markTouched} 
          isEditMode={isEditMode}
          isAdminMode={isAdminMode} 
        />

        <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
          <button
            type="submit" 
            disabled={!flow.canSubmit || (isEditMode && !hasChanges)}
            className="w-full rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {flow.isChecking 
              ? "Memindai Duplikat Data..." 
              : (isEditMode ? "Simpan Perubahan" : "Konfirmasi Pendaftaran")
            }
          </button>
        </section>
      </form>

      <ReviewModal 
        open={flow.modalOpen} 
        onClose={() => flow.setModalOpen(false)} 
        form={{ 
          email: team.email, 
          namaTim: team.namaTim, 
          hex: team.hex, 
          players: roster.players 
        }} 
        logo={team.logo} 
        bukti={team.bukti} 
        submitting={flow.submitting} 
        serverError={flow.serverError} 
        onConfirm={flow.handleSubmit}
        isEditMode={isEditMode}
      />
      
      <SuccessModal 
        open={flow.success} 
        onClose={() => window.location.reload()} 
        namaTim={team.namaTim} 
        isEditMode={isEditMode}
        onSync={!isEditMode ? handleSyncDiscord : undefined} 
      />
    </>
  )
}



================================================
FILE: app/registration/components/review-modal.tsx
================================================
"use client"
import { useEffect, useState } from "react"
import { CloseIcon, AlertIcon } from "@/components/icons"
import type { FormState, UploadedFile } from "@/lib/registration"
import { Captcha } from "./captcha"
import { ZoomLightbox } from "./zoom-lightbox"

interface ReviewModalProps {
    open: boolean
    onClose: () => void
    form: FormState
    logo: UploadedFile | null
    bukti: UploadedFile | null
    submitting: boolean
    serverError: string | null
    onConfirm: () => void
    isEditMode?: boolean
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value || "—"}</span>
        </div>
    )
}

export function ReviewModal({
    open, onClose, form, logo, bukti, submitting, serverError, onConfirm, isEditMode = false
}: ReviewModalProps) {
    
    // Checkbox Persetujuan State
    const [setujuData, setSetujuData] = useState(false)
    const [setujuRules, setSetujuRules] = useState(false)
    
    // Status validasi Captcha dari komponen anak
    const [isCaptchaValid, setIsCaptchaValid] = useState(false)

    // Reset state ketika modal dibuka/ditutup
    useEffect(() => {
        if (open) {
            setSetujuData(false)
            setSetujuRules(false)
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => { document.body.style.overflow = "unset" }
    }, [open])

    // Tombol konfirmasi hanya aktif jika semua syarat terpenuhi
    const canConfirm = setujuData && setujuRules && isCaptchaValid && !submitting

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl animate-in zoom-in-95">
                
                {/* Header Modal */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-lg font-bold">Review Data Tim</h2>
                    <button onClick={onClose} disabled={submitting} className="rounded-full p-2 hover:bg-muted transition-colors">
                        <CloseIcon className="size-5" />
                    </button>
                </div>

                {/* Konten Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    
                    {serverError && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                            <AlertIcon className="size-5 shrink-0" />
                            <p>{serverError}</p>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Kolom 1: Detail Identitas */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-primary">Identitas Tim</h3>
                            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                                <Row label="Nama Tim" value={form.namaTim} />
                                <Row label="Email Perwakilan" value={form.email} />
                                <div className="flex flex-col border-b border-border/50 pb-2">
                                    <span className="text-xs text-muted-foreground">Warna Hex</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: form.hex }} />
                                        <span className="font-mono text-sm">{form.hex}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Kolom 2: Bukti File */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-primary">Berkas Lampiran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="mb-1.5 block text-xs text-muted-foreground">Logo Tim</span>
                                    {logo?.url ? (
                                        <ZoomLightbox src={logo.url} alt="Logo Tim" className="aspect-square w-full" />
                                    ) : (
                                        <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed bg-muted/50 text-xs text-muted-foreground">Kosong</div>
                                    )}
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-xs text-muted-foreground">Bukti Transfer</span>
                                    {bukti?.url ? (
                                        <ZoomLightbox src={bukti.url} alt="Bukti Transfer" className="aspect-[3/4] w-full" />
                                    ) : (
                                        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed bg-muted/50 text-xs text-muted-foreground">Kosong</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 💡 BAGIAN ROSTER PEMAIN (DIKEMBALIKAN DI SINI) 💡 */}
                    <div className="mt-6 space-y-3">
                        <h3 className="font-semibold text-primary">
                            Daftar Roster ({form.players?.length || 0} Pemain)
                        </h3>
                        <div className="divide-y rounded-xl border bg-muted/20 overflow-hidden">
                            {form.players && form.players.length > 0 ? (
                                form.players.map((player: any, index: number) => (
                                    <div key={player.id || index} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">{index + 1}. {player.namaLengkap || "—"}</span>
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
                                                {player.role || "Anggota"}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            <span>IGN: <strong className="text-foreground">{player.ign || "—"}</strong></span>
                                            <span>Discord: <strong className="text-foreground">{player.discord ? `@${player.discord.replace(/^@/, '')}` : "—"}</strong></span>
                                            <span>ID: <strong className="text-foreground">{player.duelId || player.idDuelLinks || "—"}</strong></span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">Data roster tidak ditemukan.</div>
                            )}
                        </div>
                    </div>

                    <hr className="my-6" />

                    {/* Persetujuan & Captcha */}
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={setujuData} onChange={(e) => setSetujuData(e.target.checked)} className="mt-1 size-4 rounded border-border" />
                            <span className="text-sm text-muted-foreground">Saya menjamin bahwa seluruh data pemain yang didaftarkan adalah benar, asli, dan telah diperiksa ulang.</span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={setujuRules} onChange={(e) => setSetujuRules(e.target.checked)} className="mt-1 size-4 rounded border-border" />
                            <span className="text-sm text-muted-foreground">Tim kami telah membaca dan menyetujui seluruh <a href="/rules" target="_blank" className="text-primary hover:underline">Rulebook & Guidelines</a> yang berlaku.</span>
                        </label>

                        {/* Komponen Captcha */}
                        <Captcha onValidChange={setIsCaptchaValid} resetTrigger={open} />
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="flex items-center justify-end gap-3 border-t bg-muted/10 px-6 py-4">
                    <button onClick={onClose} disabled={submitting} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                        Kembali
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={!canConfirm}
                        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Memproses..." : "Konfirmasi & Kirim"}
                    </button>
                </div>
            </div>
        </div>
    )
}



================================================
FILE: app/registration/components/roster-section.tsx
================================================
"use client"

import { TrashIcon, PlusIcon, AlertIcon, CheckIcon } from "@/components/icons"
import { formatDuelId, sanitizeRealName, sanitizeDiscord, toProperCase } from "@/lib/validators"
import { ROSTER_ROLES, MIN_PLAYERS, MAX_PLAYERS, type Player, type RosterRole } from "@/lib/registration"

interface RosterSectionProps {
  players: Player[]
  rosterRuleOk: boolean
  bulkText: string
  notification: string | null
  setBulkText: (val: string) => void
  handleSmartPaste: () => void
  updatePlayer: (id: string, patch: Partial<Player>) => void
  changeRole: (id: string, role: RosterRole) => void
  addPlayer: () => void
  removePlayer: (id: string) => void
  err: (key: string) => string | undefined
  markTouched: (key: string) => void
  isEditMode?: boolean 
  isAdminMode?: boolean // 👈 1. Tambahkan interface untuk Admin Mode
}

export const inputBase =
  "w-full rounded-lg border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"

export function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs font-medium text-destructive">{msg}</p>
}

export function RosterSection({ 
  players, 
  rosterRuleOk, 
  bulkText, 
  notification, 
  setBulkText, 
  handleSmartPaste, 
  updatePlayer, 
  changeRole, 
  addPlayer, 
  removePlayer, 
  err, 
  markTouched,
  isEditMode = false,
  isAdminMode = false // 👈 2. Default false
}: RosterSectionProps) {
  return (
    <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
          <div><h2 className="text-base font-semibold text-foreground">Roster Pemain</h2></div>
        </div>
      </div>

      {!rosterRuleOk && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Komposisi roster tidak valid</p>
            <p>Wajib memiliki tepat 1 Ketua dan 1 Wakil Ketua.</p>
          </div>
        </div>
      )}

      {/* AREA SMART PASTE (Hanya Muncul Jika BUKAN Edit Mode) */}
      {!isEditMode && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          {notification && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 animate-in fade-in slide-in-from-top-2">
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{notification}</p>
            </div>
          )}
          <div className="mb-3">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">⚡ Smart Paste (Isi Cepat)</h3>
            <p className="text-xs text-muted-foreground mt-1">Copy-paste data pemain dari Spreadsheet/Notepad ke sini. <br/> <strong>Format:</strong> Nama - Discord - IGN - ID Duel Links (Gunakan koma/strip/garis miring sebagai pemisah).</p>
          </div>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Contoh:&#10;Seto Kaiba / kaiba / BlueEyesMaster / 123-456-789&#10;Yugi Moto, yugi, KingOfGames, 987654321" className="w-full h-24 rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40 transition-all" />
          <button type="button" onClick={handleSmartPaste} disabled={!bulkText.trim()} className="mt-3 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            Ekstrak & Masukkan ke Form
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {players.map((p, index) => {
          
          const isLeadership = p.role === "Ketua" || p.role === "Wakil Ketua";
          
          // 👈 3. Tombol delete bisa digunakan admin untuk HAPUS KETUA/WAKIL sekalipun!
          const canDelete = players.length > MIN_PLAYERS && !(isEditMode && !isAdminMode && isLeadership);
          
          const roleBg = isLeadership ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-blue-100 text-blue-700 border-blue-300"
          const roleIcon = p.role === "Ketua" ? "👑" : p.role === "Wakil Ketua" ? "🌟" : "👤"

          return (
            <div key={p.id} className="rounded-xl border border-border bg-background/40 p-4 transition-all duration-300 ease-in-out">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isLeadership ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                    {index + 1}
                  </span>
                  
                  {/* 👈 4. Dropdown Role dikunci mati untuk SEMUA role JIKA isEditMode DAN bukan Admin */}
                  <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${roleBg} ${isEditMode && !isAdminMode ? 'opacity-70' : ''}`}>
                    <span>{roleIcon}</span>
                    <select disabled={isEditMode && !isAdminMode} value={p.role} onChange={(e) => changeRole(p.id, e.target.value as RosterRole)} className={`bg-transparent font-semibold outline-none ${isEditMode && !isAdminMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {ROSTER_ROLES.map((r) => <option key={r} value={r} className="text-foreground bg-background">{r}</option>)}
                    </select>
                  </div>
                </div>
                
                {/* Tombol Hapus Pemain */}
                <button type="button" onClick={() => removePlayer(p.id)} disabled={!canDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed" title={!canDelete ? "Tidak dapat dihapus" : "Hapus Pemain"}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 👈 5. Nama Lengkap & Discord dikunci HANYA untuk Ketua & Wakil saat Edit Mode, KECUALI yang akses Admin */}
                <div>
                  <input disabled={isEditMode && isLeadership && !isAdminMode} type="text" value={p.namaLengkap} onChange={(e) => updatePlayer(p.id, { namaLengkap: sanitizeRealName(e.target.value) })} onBlur={(e) => { updatePlayer(p.id, { namaLengkap: toProperCase(e.target.value) }); markTouched(`${p.id}-namaLengkap`) }} placeholder="Nama Lengkap" className={`${inputBase} ${isEditMode && isLeadership && !isAdminMode ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err(`${p.id}-namaLengkap`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-namaLengkap`)} />
                </div>
                <div>
                  <input disabled={isEditMode && isLeadership && !isAdminMode} type="text" value={p.discord} onChange={(e) => updatePlayer(p.id, { discord: sanitizeDiscord(e.target.value) })} onBlur={() => markTouched(`${p.id}-discord`)} placeholder="Discord Username" className={`${inputBase} ${isEditMode && isLeadership && !isAdminMode ? 'opacity-60 cursor-not-allowed bg-muted' : ''} ${err(`${p.id}-discord`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-discord`)} />
                </div>
                
                {/* IGN & DuelID bebas diedit oleh siapa pun */}
                <div>
                  <input type="text" value={p.ign} onChange={(e) => updatePlayer(p.id, { ign: e.target.value })} onBlur={() => markTouched(`${p.id}-ign`)} placeholder="In-Game Name (IGN)" className={`${inputBase} ${err(`${p.id}-ign`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-ign`)} />
                </div>
                <div>
                  <input type="text" inputMode="numeric" value={p.duelId} onChange={(e) => updatePlayer(p.id, { duelId: formatDuelId(e.target.value) })} onBlur={() => markTouched(`${p.id}-duelId`)} placeholder="ID Duel Links" className={`${inputBase} font-mono ${err(`${p.id}-duelId`) ? "border-destructive" : "border-border"}`} />
                  <ErrorText msg={err(`${p.id}-duelId`)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={addPlayer} disabled={players.length >= MAX_PLAYERS} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:opacity-40">
        <PlusIcon className="h-5 w-5" /> Tambah Pemain Baru
      </button>
    </section>
  )
          }



================================================
FILE: app/registration/components/success-modal.tsx
================================================
"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CloseIcon } from "@/components/icons"
// Pastikan kamu punya icon Loader/Refresh. Jika pakai lucide-react:
import { Loader2 } from "lucide-react"

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  namaTim: string
  isEditMode?: boolean
  // Tambahan Props untuk Sinkronisasi
  onSync?: () => Promise<void> 
}

export function SuccessModal({ open, onClose, namaTim, isEditMode = false, onSync }: SuccessModalProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)

  // Mengunci scroll body ketika modal aktif
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      // Reset state ketika modal baru dibuka
      setIsSyncing(false)
      setSyncSuccess(false)
    } else {
      document.body.style.overflow = "unset"
    }
    
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const handleSyncClick = async () => {
    if (!onSync) return;
    
    setIsSyncing(true);
    try {
      await onSync();
      setSyncSuccess(true);
    } catch (error) {
      console.error("Gagal sinkronisasi", error);
      // Opsional: Kamu bisa tambahkan notifikasi error (toast) di sini
    } finally {
      setIsSyncing(false);
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in">
      <div className="glow-border glass flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border bg-popover/90 p-6 text-center shadow-2xl sm:rounded-2xl animate-in zoom-in-95 duration-200">
        
        {/* Tombol Silang Close */}
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Konten Utama */}
        <div className="flex flex-col items-center justify-center my-2 px-2">
          {/* Ikon Centang Memantul Bersinar */}
          <div className="glow-border mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20 animate-bounce">
            <CheckIcon className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground">
            {isEditMode ? "Perubahan Tersimpan!" : "Pendaftaran Berhasil!"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {isEditMode ? (
              <> Data tim <span className="font-semibold text-primary">{namaTim}</span> telah berhasil diperbarui di sistem. </> 
            ) : (
              <> Tim <span className="font-semibold text-primary">{namaTim}</span> telah berhasil didaftarkan ke Team Wars Indonesia Season 7. </> 
            )}
          </p>
        </div>

        {/* Area Tombol Aksi */}
        <div className="mt-6 flex flex-col gap-3">
          {/* Tombol Sinkronisasi (Hanya muncul jika prop onSync diberikan) */}
          {onSync && !syncSuccess && (
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 py-3.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses Sinkronisasi...
                </>
              ) : (
                "Sinkronisasi Anggota ke Discord"
              )}
            </button>
          )}

          {/* Pesan Sukses Sinkronisasi */}
          {syncSuccess && (
            <div className="rounded-xl bg-emerald-500/10 py-3 text-sm font-medium text-emerald-500 border border-emerald-500/20">
              Sinkronisasi role Discord berhasil diproses!
            </div>
          )}

          {/* Tombol Selesai (Primary) */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {syncSuccess ? "Tutup" : "Selesai (Nanti Saja)"}
          </button>
        </div>
        
      </div>
    </div>
  )
          }



================================================
FILE: app/registration/components/team-identity.tsx
================================================
"use client"

import { useState, useEffect } from "react"
import Swal from "sweetalert2" 
import { FileDropzone } from "./file-dropzone"
import type { UploadedFile } from "@/lib/registration"
import { isValidHex, sanitizeTeamName, sanitizeHex } from "@/lib/validators"
import { compressAndUpload } from "@/lib/cloudinary"

interface TeamIdentityProps {
  email: string
  namaTim: string
  hex: string
  logo: UploadedFile | null
  bukti: UploadedFile | null
  setEmail: (val: string) => void
  setNamaTim: (val: string) => void
  setHex: (val: string) => void
  setLogo: (val: UploadedFile | null) => void
  setBukti: (val: UploadedFile | null) => void
  err: (key: string) => string | undefined
  markTouched: (key: string) => void
  isEditMode?: boolean 
  isAdminMode?: boolean // 👈 1. Tambahkan prop isAdminMode
}

export const inputBase =
  "w-full rounded-lg border bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"

export function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs font-medium text-destructive">{msg}</p>
}

export function TeamIdentity({ 
  email, 
  namaTim, 
  hex, 
  logo, 
  bukti, 
  setEmail, 
  setNamaTim, 
  setHex, 
  setLogo, 
  setBukti, 
  err, 
  markTouched,
  isEditMode = false,
  isAdminMode = false // 👈 2. Beri nilai default false
}: TeamIdentityProps) {
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBukti, setIsUploadingBukti] = useState(false)
  const [previewBukti, setPreviewBukti] = useState<string | null>(null)

  // 🎯 TAMBAHKAN KODE INI DI SINI
  useEffect(() => {
    if (previewBukti) {
      document.body.style.overflow = "hidden"; // Kunci scroll
    } else {
      document.body.style.overflow = "unset"; // Lepas kunci
    }
    
    // Cleanup function untuk berjaga-jaga jika komponen hilang
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [previewBukti]);
  
  async function handleFileUpload(
    actualFile: File | null, 
    folderName: "logo" | "bukti",
    setFileState: (val: UploadedFile | null) => void,
    setLoadingState: (val: boolean) => void,
    errorKey: string
  ) {
    if (!actualFile) {
      setFileState(null);
      return;
    }

    if (!namaTim || namaTim.trim() === "") {
      Swal.fire({
        title: "Tahan Dulu!",
        text: "Isi nama tim terlebih dahulu sebelum mengunggah gambar.",
        icon: "warning",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      });
      return;
    }

    setLoadingState(true);
    markTouched(errorKey);

    try {
      try {
        const dbCheckRes = await fetch(`/api/check-team?name=${encodeURIComponent(namaTim)}`);
        if (dbCheckRes.ok) {
          const dbCheckData = await dbCheckRes.json();
          if (dbCheckData && dbCheckData.available === false) {
            Swal.fire({
              title: "Nama Tim Bentrok!",
              text: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.`,
              icon: "error",
              confirmButtonColor: "#AA1348",
              background: "#121212",
              color: "#ffffff"
            });
            setLoadingState(false);
            return;
          }
        }
      } catch (checkError) {
        console.warn("API check-team bermasalah. Lanjut ke proses upload...", checkError);
      }

      const cloudinaryUrl = await compressAndUpload(actualFile, folderName, namaTim);
      
      let maskedUrl = cloudinaryUrl;
      try {
        const fileName = new URL(cloudinaryUrl).pathname.split('/').pop();
        const baseUrl = "https://teamwars.web.id"; 
        
        if (folderName === "logo") {
          maskedUrl = `${baseUrl}/logo/${fileName}`;
        } else if (folderName === "bukti") {
          maskedUrl = `${baseUrl}/bukti/${fileName}`;
        }
      } catch (error) {
        console.warn("Gagal masking URL, menggunakan fallback Cloudinary asli", error);
      }
      
      setFileState({
        url: `${maskedUrl}?t=${Date.now()}`,
        name: actualFile.name,
        size: actualFile.size
      });

    } catch (error: any) {
      console.error("Detail Error Upload:", error);
      Swal.fire({
        title: "Gagal Mengunggah!",
        text: error.message === "Failed to fetch" 
          ? "Gagal menghubungi server. Pastikan koneksi internet stabil." 
          : `Terjadi kesalahan: ${error.message}`,
        icon: "error",
        confirmButtonColor: "#AA1348",
        background: "#121212",
        color: "#ffffff"
      });
    } finally {
      setLoadingState(false);
    }
  }

  return (
    <>
      <section className="glass glow-border rounded-2xl border p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-primary" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Identitas Tim</h2>
            {/* 👈 3. Keterangan berubah dinamis sesuai status Admin */}
            {isEditMode && !isAdminMode && <p className="text-xs text-muted-foreground mt-1">Identitas utama tim dikunci dan tidak dapat diubah lagi.</p>}
            {isEditMode && isAdminMode && <p className="text-xs text-emerald-500 mt-1">Mode Admin aktif: Identitas tim dapat diedit secara bebas.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">Email Aktif Perwakilan</label>
            {/* 👈 4. Hanya dikunci jika bukan admin */}
            <input 
              disabled={isEditMode && !isAdminMode} 
              id="email" 
              type="email" 
              placeholder="registration@teamwars.web.id" 
              value={email} 
              onChange={(e) => { setEmail(e.target.value); markTouched("email"); }} 
              onBlur={() => markTouched
