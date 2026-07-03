"use client"

import { CheckIcon, CloseIcon } from "@/components/icons"

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  namaTim: string
}

export function SuccessModal({ open, onClose, namaTim }: SuccessModalProps) {
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
          
          <h2 className="text-xl font-bold text-foreground">Pendaftaran Berhasil!</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Tim <span className="font-semibold text-primary">{namaTim}</span> telah berhasil didaftarkan ke Team Wars Indonesia Season 7.
          </p>
        </div>

        {/* Tombol Selesai */}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Selesai
        </button>
        
      </div>
    </div>
  )
}
