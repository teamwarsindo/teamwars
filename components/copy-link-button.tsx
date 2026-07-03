'use client'

import { useState } from 'react'
import { CheckIcon, LinkIcon } from '@/components/icons' // Ganti dari lucide-react
import { cn } from '@/lib/utils'

type CopyLinkButtonProps = {
  /** anchor hash to copy, e.g. "#syarat-sah-pendaftaran" */
  anchor: string
  /** accessible label describing what is being copied */
  label: string
  /** visual variant: icon-only ghost or solid "Salin" pill */
  variant?: 'icon' | 'solid'
  className?: string
}

export function CopyLinkButton({
  anchor,
  label,
  variant = 'icon',
  className,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}${anchor}`
        : anchor
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API can fail in restricted contexts; ignore silently.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (variant === 'solid') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Salin tautan ${label}`}
        className={cn(
          'inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_-4px_rgba(59,130,246,0.7)] transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          className,
        )}
      >
        {copied ? (
          <>
            <CheckIcon className="size-4" aria-hidden="true" />
            Tersalin
          </>
        ) : (
          <>
            Salin
            <LinkIcon className="size-4" aria-hidden="true" />
          </>
        )}
      </button>
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        handleCopy()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          handleCopy()
        }
      }}
      aria-label={`Salin tautan ke bagian ${label}`}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 transition-colors hover:border-blue-400/60 hover:bg-blue-500/20 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="size-4" aria-hidden="true" />
      ) : (
        <LinkIcon className="size-4" aria-hidden="true" />
      )}    
    </span>
  )
}
