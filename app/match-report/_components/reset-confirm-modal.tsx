"use client";

import { Trash2 } from "lucide-react";

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResetConfirmModal({ isOpen, onClose, onConfirm }: ResetConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass glow-border relative w-full max-w-sm rounded-3xl border border-border/80 bg-background/90 p-6 shadow-2xl scale-in-95 animate-in space-y-4">
        <div className="flex items-center gap-3 border-b border-border/50 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">Reset Draf Laporan?</h3>
            <p className="text-[11px] font-medium text-muted-foreground">Match Report System</p>
          </div>
        </div>

        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          Apakah Anda yakin ingin mengosongkan formulir? Seluruh catatan dan file upload gambar yang belum dikirim akan{" "}
          <strong className="text-foreground">dihapus dari draf browser</strong>.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background/50 py-2.5 text-xs font-bold hover:bg-muted transition cursor-pointer active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-destructive/90 cursor-pointer active:scale-[0.98]"
          >
            Ya, Hapus Draf
          </button>
        </div>
      </div>
    </div>
  );
}
