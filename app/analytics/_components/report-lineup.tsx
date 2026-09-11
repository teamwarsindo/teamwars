interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
}

export function ReportLineup({ lineupA, lineupB }: ReportLineupProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs">
      <div className="grid grid-cols-2 divide-x divide-border/60 text-xs gap-x-2">
        {/* Kolom Kubu A: Rata Kiri */}
        <div className="space-y-2 pr-1 sm:pr-2">
          {lineupA.map((p, idx) => (
            <div key={idx} className="min-w-0">
              {p ? (
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                    {p.ign}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70 font-mono shrink-0">
                    ({p.idDuelLinks || '-'})
                  </span>
                </div>
              ) : (
                <div className="font-medium text-muted-foreground/40 italic truncate text-[10px] sm:text-[11px]">
                  🔒 Menunggu giliran
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Kolom Kubu B: Rata Kanan */}
        <div className="space-y-2 pl-2 sm:pl-3 text-right">
          {lineupB.map((p, idx) => (
            <div key={idx} className="min-w-0">
              {p ? (
                <div className="flex items-baseline justify-end gap-1.5 truncate">
                  <span className="text-[9px] text-muted-foreground/70 font-mono shrink-0">
                    ({p.idDuelLinks || '-'})
                  </span>
                  <span className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                    {p.ign}
                  </span>
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
