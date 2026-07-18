"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export function SettingsTab() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Pengaturan Turnamen */}
      <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Sistem Registrasi</h3>
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <p className="font-semibold">Manual Override (Force Close)</p>
            <p className="text-xs text-muted-foreground">Tutup pendaftaran secara paksa meskipun waktu hitung mundur belum habis.</p>
          </div>
          <button className={cn(buttonVariants({ variant: "outline" }), "border-red-500/50 text-red-500 hover:bg-red-500/10")}>
            Aktifkan
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-red-500">Danger Zone</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-red-400">Hapus Semua Data Peserta</p>
            <p className="text-xs text-muted-foreground">Tindakan ini tidak bisa dibatalkan. Pastikan kamu sudah melakukan export data.</p>
          </div>
          <button className={cn(buttonVariants(), "bg-red-600 text-white hover:bg-red-700 whitespace-nowrap")}>
            Reset Database
          </button>
        </div>
      </div>

    </div>
  )
            }
