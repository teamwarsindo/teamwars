import { ShieldIcon } from '@/components/icons' // Menggunakan ShieldIcon kustom yang sudah ada
import { CopyLinkButton } from '@/components/copy-link-button'

export function RulebookHero() {
  return (
    <header className="relative overflow-hidden px-4 pb-2 pt-10 text-center">
      {/* ambient blue glow behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/25 blur-3xl"
      />

      <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
        <ShieldIcon className="size-4 text-blue-400" aria-hidden="true" />
        Official Rulebook
      </p>

      <h1
        className="mt-6 text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl"
        style={{
          textShadow:
            '0 0 18px rgba(59,130,246,0.65), 0 0 40px rgba(37,99,235,0.45)',
        }}
      >
        TEAM WARS INDONESIA
      </h1>

      <div className="mt-5 flex justify-center">
        <span className="inline-flex items-center rounded-full border border-blue-500/50 bg-blue-500/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
          Season 7 — Duel Links
        </span>
      </div>

      <p className="mx-auto mt-6 max-w-md text-pretty text-sm leading-relaxed text-slate-400">
        Peraturan resmi turnamen. Gunakan navigasi di atas untuk melompat antar
        kategori, lalu salin tautan bagian mana pun untuk dibagikan ke tim Anda.
      </p>

      <div className="mt-5 flex justify-center">
        <CopyLinkButton
          anchor=""
          label="halaman rulebook"
          variant="solid"
        />
      </div>
    </header>
  )
}
