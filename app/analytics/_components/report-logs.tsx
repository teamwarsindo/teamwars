interface ReportLogsProps {
  games: any[];
}

export function ReportLogs({ games }: ReportLogsProps) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="py-2 px-3 bg-muted/30 border-b border-border text-center">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Match History
        </span>
      </div>

      {games.length === 0 ? (
        <div className="p-6 text-center text-xs italic text-muted-foreground">
          Belum ada ronde duel yang diselesaikan.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {games.map((g: any, idx: number) => {
            const isAWin = g.winner === "teamA";
            const pA = g.playerA || {};
            const pB = g.playerB || {};

            const isTeamADeckloss = g.isDeckloss && (g.decklossTeam === "teamA" || !isAWin);
            const isTeamBDeckloss = g.isDeckloss && (g.decklossTeam === "teamB" || isAWin);

            const skillA = pA.skillAbbr || pA.skill || "-";
            const skillB = pB.skillAbbr || pB.skill || "-";

            return (
              /* py-1.5 sangat ramping dan hemat ruang vertikal */
              <div key={idx} className="py-1.5 px-2 hover:bg-muted/15 transition">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                  
                  {/* Pemain A (Rata Tengah) */}
                  <div className="flex flex-col items-center text-center min-w-0 leading-tight">
                    <div className="font-bold text-[11px] text-foreground truncate w-full">
                      {pA.ign || "-"}
                    </div>
                    <div className="text-[9.5px] font-medium text-foreground/85 truncate w-full">
                      {pA.archetype || "-"}
                    </div>
                    <div className="text-[8.5px] font-mono text-muted-foreground/75 truncate w-full">
                      {skillA}
                    </div>
                  </div>

                  {/* Area Skor Tengah: R di Atas, W vs L di Tengah, TL di Bawah */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    {/* Baris Atas: R & Ronde */}
                    <div className="flex items-center justify-between w-full min-h-[12px] px-0.5">
                      <div className="w-3.5 flex justify-center">
                        {pA.isRepeat && (
                          <span className="text-[7.5px] leading-none font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-0.5 py-0.2 rounded">
                            R
                          </span>
                        )}
                      </div>
                      <span className="text-[7.5px] font-mono text-muted-foreground/60 leading-none">
                        G{idx + 1}
                      </span>
                      <div className="w-3.5 flex justify-center">
                        {pB.isRepeat && (
                          <span className="text-[7.5px] leading-none font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-0.5 py-0.2 rounded">
                            R
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Baris Tengah: [ W ] vs [ L ] */}
                    <div className="flex items-center gap-1.5 my-0.2">
                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded-md font-mono text-[9px] font-black shadow-2xs ${
                          isAWin
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {isAWin ? "W" : "L"}
                      </span>
                      
                      <span className="text-[8px] font-mono font-bold text-muted-foreground/40">
                        vs
                      </span>

                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded-md font-mono text-[9px] font-black shadow-2xs ${
                          !isAWin
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {!isAWin ? "W" : "L"}
                      </span>
                    </div>

                    {/* Baris Bawah: TL */}
                    <div className="flex items-center justify-between w-full min-h-[12px] px-0.5">
                      <div className="w-3.5 flex justify-center">
                        {isTeamADeckloss && (
                          <span className="text-[7.5px] leading-none font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-0.5 py-0.2 rounded">
                            TL
                          </span>
                        )}
                      </div>
                      <div className="w-3.5" />
                      <div className="w-3.5 flex justify-center">
                        {isTeamBDeckloss && (
                          <span className="text-[7.5px] leading-none font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-0.5 py-0.2 rounded">
                            TL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pemain B (Rata Tengah) */}
                  <div className="flex flex-col items-center text-center min-w-0 leading-tight">
                    <div className="font-bold text-[11px] text-foreground truncate w-full">
                      {pB.ign || "-"}
                    </div>
                    <div className="text-[9.5px] font-medium text-foreground/85 truncate w-full">
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

      {/* Footer Simbol: Rata Tengah Murni Tanpa Race to 10 */}
      <div className="py-2 px-3 bg-muted/20 border-t border-border/60 text-center text-[10px] text-muted-foreground">
        Keterangan: <span className="font-bold text-amber-500">[R]</span> Repeat • <span className="font-bold text-rose-500">[TL]</span> Technical Lose
      </div>
    </div>
  );
                  }
