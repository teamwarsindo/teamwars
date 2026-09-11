interface ReportLogsProps {
  games: any[];
  isFinished: boolean;
  scoreA: number;
  scoreB: number;
  teamAName: string;
  teamBName: string;
  mvpData: { ign: string; wins: number; team: string } | null;
  liveInstruction: { nextGameNumber: number; stayTable: string; nextActionTeam: string } | null;
}

export function ReportLogs({
  games,
  isFinished,
  scoreA,
  scoreB,
  teamAName,
  teamBName,
  mvpData,
  liveInstruction,
}: ReportLogsProps) {
  return (
    <div className="space-y-4">
      {/* Riwayat Duel */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {/* Judul di Tengah Singkat */}
        <div className="p-2.5 bg-muted/30 border-b border-border text-center">
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Game Logs
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

              return (
                <div key={idx} className="p-2.5 sm:p-3 hover:bg-muted/15 transition">
                  {/* Grid 3 Bagian: Kubu A (Rata Tengah) | Skor + Spacer Tetap | Kubu B (Rata Tengah) */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
                    
                    {/* Kubu Kiri: 3 Baris Rata Tengah */}
                    <div className="flex flex-col items-center text-center min-w-0">
                      <div className={`text-[11px] sm:text-xs leading-tight line-clamp-1 w-full break-words ${isAWin ? "font-black text-foreground" : "font-medium text-muted-foreground"}`}>
                        {pA.ign || "-"}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-medium text-foreground/80 leading-tight line-clamp-2 w-full break-words mt-0.5">
                        {pA.archetype || "-"}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2 w-full break-words">
                        {pA.skill && pA.skill !== "-" ? pA.skill : "-"}
                      </div>
                    </div>

                    {/* Area Tengah: Fixed Slot Status (w-9) + Skor Tegak Lurus + Fixed Slot Status (w-9) */}
                    <div className="flex items-center justify-center shrink-0 px-1">
                      {/* Fixed Spacer Kiri Kubu A */}
                      <div className="w-9 flex items-center justify-end gap-0.5 shrink-0">
                        {pA.isRepeat && (
                          <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                            R
                          </span>
                        )}
                        {isTeamADeckloss && (
                          <span className="text-[9px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-1 py-0.2 rounded shrink-0">
                            TL
                          </span>
                        )}
                      </div>

                      {/* Skor W / L Badge (Posisi Selalu Center Rapi Tegak Lurus) */}
                      <div className="flex items-center gap-1 mx-1 shrink-0">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-md font-mono text-[10px] font-black shadow-2xs ${
                            isAWin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isAWin ? "W" : "L"}
                        </span>
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-md font-mono text-[10px] font-black shadow-2xs ${
                            !isAWin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {!isAWin ? "W" : "L"}
                        </span>
                      </div>

                      {/* Fixed Spacer Kanan Kubu B */}
                      <div className="w-9 flex items-center justify-start gap-0.5 shrink-0">
                        {isTeamBDeckloss && (
                          <span className="text-[9px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-1 py-0.2 rounded shrink-0">
                            TL
                          </span>
                        )}
                        {pB.isRepeat && (
                          <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                            R
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kubu Kanan: 3 Baris Rata Tengah */}
                    <div className="flex flex-col items-center text-center min-w-0">
                      <div className={`text-[11px] sm:text-xs leading-tight line-clamp-1 w-full break-words ${!isAWin ? "font-black text-foreground" : "font-medium text-muted-foreground"}`}>
                        {pB.ign || "-"}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-medium text-foreground/80 leading-tight line-clamp-2 w-full break-words mt-0.5">
                        {pB.archetype || "-"}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2 w-full break-words">
                        {pB.skill && pB.skill !== "-" ? pB.skill : "-"}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Gabungan (Analisa Duel + Keterangan Simbol) */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-2.5 text-xs">
        {isFinished ? (
          <>
            <div className="font-black text-foreground uppercase tracking-wide flex items-center justify-between">
              <span>Match Summary</span>
              <span className="text-[10px] font-mono text-muted-foreground font-normal">
                Total {games.length} Game
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              {mvpData && (
                <div className="text-foreground font-semibold">
                  • <strong>MVP Match:</strong> {mvpData.ign} ({mvpData.wins} Kemenangan) — Kontributor poin terbanyak bagi {mvpData.team}.
                </div>
              )}
              <div className="text-muted-foreground">
                • <strong>Hasil Akhir:</strong> Kemenangan resmi diraih oleh <strong>{scoreA > scoreB ? teamAName : teamBName}</strong> ({Math.max(scoreA, scoreB)} - {Math.min(scoreA, scoreB)}).
              </div>
            </div>
          </>
        ) : liveInstruction ? (
          <>
            <div className="font-black text-amber-500 uppercase tracking-wide flex items-center justify-between">
              <span className="animate-pulse">Instruksi Game #{liveInstruction.nextGameNumber}</span>
              <span className="text-[10px] font-mono text-muted-foreground font-normal">
                {games.length} Game Dimainkan
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="text-foreground">• <strong>{liveInstruction.stayTable}</strong> (Stay table)</div>
              <div className="text-muted-foreground">• <strong>{liveInstruction.nextActionTeam}:</strong> (Next deck or repeat)</div>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Pertandingan siap dimulai. Menunggu input ronde pertama dari wasit.
          </div>
        )}

        {/* Keterangan Simbol Disatukan ke Dalam Summary */}
        <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground/80 flex items-center justify-between flex-wrap gap-2">
          <div>Keterangan: <strong>[R]</strong> Repeat • <strong>[TL]</strong> Time Loss / Deckloss</div>
          <div className="font-mono">Race to 10</div>
        </div>
      </div>
    </div>
  );
                            }
