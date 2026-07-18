"use client"

export function OverviewTab() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 3 Kotak Statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tim Terdaftar</h3>
          <p className="mt-2 text-3xl font-bold">24</p>
          <p className="text-xs text-muted-foreground mt-1">+3 dari hari kemarin</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kapasitas Slot</h3>
          <p className="mt-2 text-3xl font-bold">24 <span className="text-lg text-muted-foreground">/ 32</span></p>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "75%" }} />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Pendaftaran</h3>
          <p className="mt-2 text-xl font-bold text-green-500">OPEN</p>
          <p className="text-xs text-muted-foreground mt-1">Ditutup dalam 5 hari</p>
        </div>
      </div>

      {/* Log Aktivitas Terakhir */}
      <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-primary">Pendaftar Terakhir</h3>
        <div className="space-y-3">
          {/* Dummy data */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 p-3 text-sm">
              <div>
                <p className="font-semibold">Team Kuli Bangunan {i}</p>
                <p className="text-xs text-muted-foreground">Kapten: TukangBatu#{i}000</p>
              </div>
              <span className="text-xs text-muted-foreground">10 Menit lalu</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
