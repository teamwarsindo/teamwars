'use client'

import { ShieldIcon } from '@/components/icons'
import { navItems } from '@/lib/rules-data'

export function RulebookNav() {
  function handleJump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      history.replaceState(null, '', `#${id}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-blue-500/15 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300/80">
          <ShieldIcon className="size-4 text-blue-400" aria-hidden="true" />
          <span className="hidden sm:inline">Rulebook</span>
        </span>
        <nav
          aria-label="Kategori peraturan"
          className="flex flex-1 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleJump(e, item.id)}
              className="shrink-0 rounded-full border border-blue-500/25 bg-blue-500/5 px-4 py-1.5 text-xs font-semibold text-blue-200/90 transition-colors hover:border-blue-400/60 hover:bg-blue-500/15 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
