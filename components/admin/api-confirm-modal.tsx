"use client"

interface ApiConfirmModalProps {
  route: string
  onCancel: () => void
  onConfirm: () => void
}

export function ApiConfirmModal({ route, onCancel, onConfirm }: ApiConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-primary/30 w-full max-w-sm rounded-2xl shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)] overflow-hidden">
        <div className="p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold mb-2">Peringatan Eksekusi</h3>
          <p className="text-sm text-muted-foreground">Kamu akan menjalankan request ke endpoint:</p>
          <div className="mt-2 bg-muted/50 text-primary font-mono text-xs p-2 rounded border border-border/50 break-all">
            {route}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border/50 divide-x divide-border/50">
          <button onClick={onCancel} className="p-3 text-sm font-semibold hover:bg-muted/50 transition-colors">Batal</button>
          <button onClick={onConfirm} className="p-3 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors">Eksekusi</button>
        </div>
      </div>
    </div>
  )
}
