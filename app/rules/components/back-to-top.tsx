'use client'

import { useEffect, useState } from 'react'
import { ChevronUpIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas"
      className={cn(
        'fixed bottom-6 right-6 z-50 inline-flex size-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_0_25px_-4px_rgba(59,130,246,0.9)] transition-all duration-300 hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <ChevronUpIcon className="size-5" aria-hidden="true" />
    </button>
  )
}
