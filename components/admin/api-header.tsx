"use client"

export function ApiHeader({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-background/50 p-4 sm:p-6 backdrop-blur-md flex justify-between items-center">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          📡 API Scanner
        </h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
          Deteksi otomatis endpoint API.
        </p>
      </div>
      <div className="text-right">
        <span className="text-xl sm:text-2xl font-bold">{count}</span>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Endpoints</p>
      </div>
    </div>
  )
}
