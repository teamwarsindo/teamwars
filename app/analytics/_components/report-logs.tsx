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
          <div className="divide-y divide-border/60">
            {games.map((g: any, idx: number) => {
              const isAWin = g.winner === 'teamA';
              const pA = g.playerA || {};
              const pB = g.playerB || {};

              const isTeamADeckloss = g.isDeckloss && (g.decklossTeam === 'teamA' || !isAWin);
              const isTeamBDeckloss = g.isDeckloss && (g.decklossTeam === 'teamB' || isAWin);

              const skillA = pA.skillAbbr || pA.skill;
              const skillB = pB.skillAbbr || pB.skill;

              return (
                <div key={idx} className="p-2.5 sm:p-3 hover:bg-muted/20 transition">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
                    {/* Kubu Kiri: Nama & Deck (Rata Kanan ke Arah Skor) */}
                    <div className="flex flex-col items-end text-right min-w-0">
                      <div className={`text-[11px] sm:text-xs truncate max-w-full ${isAWin ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {pA.ign || '-'}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground/80 truncate max-w-full">
                        {pA.archetype || '-'}
                        {skillA && skillA !== '-' && (
                          <span className="font-semibold text-muted-foreground"> • {skillA}</span>
                        )}
                      </div>
                    </div>

                    {/* Area Tengah: R/TL Kiri + Skor W/L + R/TL Kanan */}
                    <div className="flex items-center justify-center gap-1 shrink-0 px-1">
                      {/* Indikator Status Kubu A */}
                      <div className="flex items-center gap-0.5">
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

                      {/* Skor W / L Badge */}
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-md font-mono text-[10px] font-black shadow-2xs ${
                          isAWin
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isAWin ? 'W' : 'L'}
                      </span>
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-md font-mono text-[10px] font-black shadow-2xs ${
                          !isAWin
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {!isAWin ? 'W' : 'L'}
                      </span>

                      {/* Indikator Status Kubu B */}
                      <div className="flex items-center gap-0.5">
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

                    {/* Kubu Kanan: Nama & Deck (Rata Kiri ke Arah Skor) */}
                    <div className="flex flex-col items-start text-left min-w-0">
                      <div className={`text-[11px] sm:text-xs truncate max-w-full ${!isAWin ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {pB.ign || '-'}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground/80 truncate max-w-full">
                        {pB.archetype || '-'}
                        {skillB && skillB !== '-' && (
                          <span className="font-semibold text-muted-foreground"> • {skillB}</span>
                        )}
                      </div>
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

      {/* Summary / Instruksi Pertandingan */}
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
