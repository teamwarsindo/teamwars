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
