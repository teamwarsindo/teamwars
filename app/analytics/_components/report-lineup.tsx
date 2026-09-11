interface ReportLineupProps {
  lineupA: any[];
  lineupB: any[];
}

export function ReportLineup({ lineupA, lineupB }: ReportLineupProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs space-y-2.5">
      <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        Lineup Duelist
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/60 text-xs">
        {/* Kolom Kubu A */}
        <div className="space-y-2 pr-2 sm:pr-4">
          {lineupA.map((p, idx) => (
            <div key={idx} className="min-w-0">
              {p ? (
                <div>
                  <div className="font-bold text-foreground truncate text-[11px] sm:text-xs">
                    {idx + 1}. {p.ign}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate pl-3">
                    {p.idDuelLinks || "-"}
                  </div>
                </div>
              ) : (
                <div className="font-medium text-muted-foreground/60 italic truncate text-[10px] sm:text-[11px]">
                  {idx + 1}. 🔒 Menunggu giliran
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Kolom Kubu B */}
        <div className="space-y-2 pl-2 sm:pl-4">
          {lineupB.map((p, idx) => (
            <div key={idx} className="min-w-0">
              {p ? (
                <div>
                  <div className="font-bold text-foreground truncate text-[11px] sm:text-xs">
                    {idx + 1}. {p.ign}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate pl-3">
                    {p.idDuelLinks || "-"}
                  </div>
                </div>
              ) : (
                <div className="font-medium text-muted-foreground/60 italic truncate text-[10px] sm:text-[11px]">
                  {idx + 1}. 🔒 Menunggu giliran
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
