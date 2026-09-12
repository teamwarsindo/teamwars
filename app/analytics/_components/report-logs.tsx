interface ReportLogsProps {
  games: any[];
}

export function ReportLogs({ games }: ReportLogsProps) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="py-2.5 px-3 bg-muted/30 border-b border-border text-center">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Match History
        </span>
      </div>

      {games.length === 0 ? (
        <div className="p-8 text-center text-xs italic text-muted-foreground">
          Belum ada ronde duel yang diselesaikan.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {games.map((g: any, idx: number) => {
            const isAWin = g.winner === "teamA";
            const pA = g.playerA || {};
            const pB = g.playerB || {};

            const isTeamADeckloss = g.isDeckloss && (g.decklossTeam === "teamA" || !isAWin);
            const isTeamBDeckloss = g.isDeckloss && (g.decklossTeam === "teamB" || isAWin);

            const skillA = pA.skillAbbr || pA.skill || "-";
            const skillB = pB.skillAbbr || pB.skill || "-";

            return (
              <div key={idx} className="py-2 px-3 hover:bg-muted/15 transition">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                  
                  {/* Sisi Tim A */}
                  <div className="flex flex-col items-center text-center min-w-0">
                    <div className="font-bold text-xs text-foreground truncate w-full">
                      {pA.ign || "-"}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground truncate w-full mt-0.5 leading-tight">
                      {pA.archetype || "-"}
                    </div>
                    <div className="text-[8.5px] font-mono text-muted-foreground/75 truncate w-full">
                      {skillA}
                    </div>
                  </div>

                  {/* Sisi Tengah: Kotak Simetris untuk R di Atas, W/L di Tengah, TL di Bawah */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    {/* Baris Atas: R & Ronde */}
                    <div className="flex items-center justify-between w-full h-[14px] px-0.5">
                      <div className="w-4 flex justify-center">
                        {pA.isRepeat && (
                          <span className="text-[8px] leading-none font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 rounded">
                            R
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-muted-foreground/60 leading-none">
                        G{idx + 1}
                      </span>
                      <div className="w-4 flex justify-center">
                        {pB.isRepeat && (
                          <span className="text-[8px] leading-none font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 rounded">
                            R
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Baris Tengah: [ W ] vs [ L ] Bentuk Kotak Rounded */}
                    <div className="flex items-center gap-1.5 my-1">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded font-mono text-[10px] font-black shadow-2xs ${
                          isAWin
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {isAWin ? "W" : "L"}
                      </span>
                      
                      <span className="text-[9px] font-mono font-bold text-muted-foreground/40">
                        vs
                      </span>

                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded font-mono text-[10px] font-black shadow-2xs ${
                          !isAWin
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {!isAWin ? "W" : "L"}
                      </span>
                    </div>

                    {/* Baris Bawah: TL */}
                    <div className="flex items-center justify-between w-full h-[14px] px-0.5">
                      <div className="w-4 flex justify-center">
                        {isTeamADeckloss && (
                          <span className="text-[8px] leading-none font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1 py-0.5 rounded">
                            TL
                          </span>
                        )}
                      </div>
                      <div className="w-4" />
                      <div className="w-4 flex justify-center">
                        {isTeamBDeckloss && (
                          <span className="text-[8px] leading-none font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1 py-0.5 rounded">
                            TL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sisi Tim B */}
                  <div className="flex flex-col items-center text-center min-w-0">
                    <div className="font-bold text-xs text-foreground truncate w-full">
                      {pB.ign || "-"}
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground truncate w-full mt-0.5 leading-tight">
                      {pB.archetype || "-"}
                    </div>
                    <div className="text-[8.5px] font-mono text-muted-foreground/75 truncate w-full">
                      {skillB}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Simbol: Rata Kiri & Kanan di Tengah Tanpa Kata Keterangan */}
      <div className="py-2 px-4 bg-muted/20 border-t border-border/60 grid grid-cols-2 text-xs">
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded leading-none">
            R
          </span>
          <span className="font-medium">Repeat</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-muted-foreground border-l border-border/50">
          <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded leading-none">
            TL
          </span>
          <span className="font-medium">Technical Lose</span>
        </div>
      </div>
    </div>
  );
              }
              
