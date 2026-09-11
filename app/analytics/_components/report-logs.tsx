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
        <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">
            Riwayat Duel ({games.length} Ronde Selesai)
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">Race to 10</span>
        </div>

        {games.length === 0 ? (
          <div className="p-8 text-center text-xs italic text-muted-foreground">
            Belum ada ronde duel yang diselesaikan.
          </div>
        ) : (
          <div className="divide-y divide-border/60 text-xs">
            {games.map((g: any, idx: number) => {
              const isAWin = g.winner === "teamA";
              const pA = g.playerA || {};
              const pB = g.playerB || {};

              const isTeamADeckloss = g.isDeckloss && (g.decklossTeam === "teamA" || !isAWin);
              const isTeamBDeckloss = g.isDeckloss && (g.decklossTeam === "teamB" || isAWin);

              return (
                <div key={idx} className="p-3 hover:bg-muted/20 transition space-y-1">
                  {/* Baris Nama Skor Nama */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-bold truncate text-[11px] sm:text-xs ${isAWin ? "text-foreground font-black" : "text-muted-foreground"}`}>
                        {pA.ign || "-"}
                      </span>
                      {pA.isRepeat && (
                        <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1 rounded shrink-0">
                          R
                        </span>
                      )}
                      {isTeamADeckloss && (
                        <span className="text-[9px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-1 rounded shrink-0">
                          TL
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono font-black text-xs shrink-0 px-1">
                      <span className={`w-5 text-center ${isAWin ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {isAWin ? "W" : "L"}
                      </span>
                      <span className="text-muted-foreground/30 font-sans">—</span>
                      <span className={`w-5 text-center ${!isAWin ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {!isAWin ? "W" : "L"}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 truncate text-right">
                      {isTeamBDeckloss && (
                        <span className="text-[9px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-1 rounded shrink-0">
                          TL
                        </span>
                      )}
                      {pB.isRepeat && (
                        <span className="text-[9px] font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-1 rounded shrink-0">
                          R
                        </span>
                      )}
                      <span className={`font-bold truncate text-[11px] sm:text-xs ${!isAWin ? "text-foreground font-black" : "text-muted-foreground"}`}>
                        {pB.ign || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Baris Deck & Skill */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="truncate">
                      <span>{pA.archetype || "-"}</span>
                      {pA.skill && pA.skill !== "-" && <span className="text-muted-foreground/70"> • {pA.skill}</span>}
                    </div>
                    <div className="text-[8px] font-bold text-muted-foreground/20 px-1">vs</div>
                    <div className="truncate text-right">
                      <span>{pB.archetype || "-"}</span>
                      {pB.skill && pB.skill !== "-" && <span className="text-muted-foreground/70"> • {pB.skill}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2.5 bg-muted/20 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div>Keterangan: <strong>[R]</strong> Repeat • <strong>[TL]</strong> Time Loss / Deckloss</div>
          <div className="font-mono">Total {games.length} Game</div>
        </div>
      </div>

      {/* Summary / Petunjuk Berikutnya */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-1.5 text-xs">
        {isFinished ? (
          <>
            <div className="font-black text-foreground uppercase tracking-wide">Match Summary</div>
            {mvpData && (
              <div className="text-[11px] text-foreground font-semibold">
                • <strong>MVP Match:</strong> {mvpData.ign} ({mvpData.wins} Kemenangan) — Kontributor poin terbanyak bagi {mvpData.team}.
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              • Selamat kepada <strong>{scoreA > scoreB ? teamAName : teamBName}</strong> atas kemenangannya!
            </div>
          </>
        ) : liveInstruction ? (
          <>
            <div className="font-black text-amber-500 uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
              <span>Instruksi Game #{liveInstruction.nextGameNumber}</span>
            </div>
            <div className="text-[11px] text-foreground">• <strong>{liveInstruction.stayTable}</strong> (Stay table)</div>
            <div className="text-[11px] text-muted-foreground">• <strong>{liveInstruction.nextActionTeam}:</strong> (Next deck or repeat)</div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Pertandingan siap dimulai. Menunggu input ronde pertama dari wasit.
          </div>
        )}
      </div>
    </div>
  );
      }
                                                                                    
