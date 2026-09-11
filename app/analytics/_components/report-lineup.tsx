interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
}

export function ReportLineup({ lineupA, lineupB }: ReportLineupProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs space-y-2.5">
      {/* Judul di Tengah */}
      <div className="text-center font-black text-xs uppercase tracking-wider text-muted-foreground">
        Lineup Duelist
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Kolom Kubu A */}
        <div className="space-y-1.5">
          {lineupA.map((p, idx) => (
            <div
              key={idx}
              className={`px-2.5 py-1.5 rounded-lg border text-center transition min-w-0 ${
                idx % 2 === 0
                  ? "bg-muted/40 border-border/60"
                  : "bg-background/80 border-border/30"
              }`}
            >
              {p ? (
                <div className="font-bold text-foreground truncate text-[11px] sm:text-xs">
                  {p.ign}
                </div>
              ) : (
                <div className="font-medium text-muted-foreground/40 italic truncate text-[10px] sm:text-[11px]">
                  🔒 Menunggu giliran
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Kolom Kubu B */}
        <div className="space-y-1.5">
          {lineupB.map((p, idx) => (
            <div
              key={idx}
              className={`px-2.5 py-1.5 rounded-lg border text-center transition min-w-0 ${
                idx % 2 === 0
                  ? "bg-muted/40 border-border/60"
                  : "bg-background/80 border-border/30"
              }`}
            >
              {p ? (
                <div className="font-bold text-foreground truncate text-[11px] sm:text-xs">
                  {p.ign}
                </div>
              ) : (
                <div className="font-medium text-muted-foreground/40 italic truncate text-[10px] sm:text-[11px]">
                  🔒 Menunggu giliran
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
