'use client';

interface DuelistEntry {
  ign: string;
  archetype?: string;
  skill?: string;
  skillAbbr?: string;
}

export interface GameRecord {
  winner: 'teamA' | 'teamB';
  playerA?: DuelistEntry;
  playerB?: DuelistEntry;
  isRepeatA?: boolean;
  isRepeatB?: boolean;
  isDeckloss?: boolean;
  decklossTeam?: 'teamA' | 'teamB';
  note?: string;
}

interface ReportLogsProps {
  games: GameRecord[];
}

export function ReportLogs({ games }: ReportLogsProps) {
  if (!games || games.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="py-2.5 px-3 bg-muted/30 border-b border-border text-center">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Match History
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {games.map((g, idx) => {
          const isWinnerA = g.winner === 'teamA';
          const isWinnerB = g.winner === 'teamB';

          return (
            <div key={idx} className="p-2.5 sm:p-3 hover:bg-muted/20 transition">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* Sisi Kiri: Tim A */}
                <div className="flex flex-col items-start min-w-0 pr-1">
                  <div className="font-bold text-xs text-foreground truncate w-full">
                    {g.playerA?.ign || 'Unknown'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full">
                    {g.playerA?.archetype || '-'}
                  </div>
                  {g.playerA?.skillAbbr && (
                    <div className="text-[9px] text-muted-foreground/70 truncate w-full">
                      {g.playerA.skillAbbr}
                    </div>
                  )}
                </div>

                {/* Bagian Tengah: Ronde, Repeat, & Badge W vs L (Font Sans Seragam) */}
                <div className="flex flex-col items-center justify-center shrink-0 px-1 min-w-[72px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] text-muted-foreground/60 font-sans">
                      G{idx + 1}
                    </span>
                    {g.isRepeatA && (
                      <span className="px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-bold">
                        R
                      </span>
                    )}
                    {g.isRepeatB && (
                      <span className="px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-bold">
                        R
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 font-sans">
                    <span
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                        isWinnerA
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWinnerA ? 'W' : 'L'}
                    </span>

                    <span className="text-[9px] text-muted-foreground/40 font-sans px-0.5">
                      vs
                    </span>

                    <span
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                        isWinnerB
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isWinnerB ? 'W' : 'L'}
                    </span>
                  </div>
                </div>

                {/* Sisi Kanan: Tim B */}
                <div className="flex flex-col items-end text-right min-w-0 pl-1">
                  <div className="font-bold text-xs text-foreground truncate w-full">
                    {g.playerB?.ign || 'Unknown'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full">
                    {g.playerB?.archetype || '-'}
                  </div>
                  {g.playerB?.skillAbbr && (
                    <div className="text-[9px] text-muted-foreground/70 truncate w-full">
                      {g.playerB.skillAbbr}
                    </div>
                  )}
                </div>
              </div>

              {/* Keterangan Catatan Ronde / Deckloss jika ada */}
              {(g.note || g.isDeckloss) && (
                <div className="mt-1.5 pt-1 border-t border-border/40 text-center text-[9px] text-muted-foreground font-sans">
                  {g.isDeckloss && (
                    <span className="text-rose-500 font-semibold mr-1.5">
                      [Deckloss {g.decklossTeam === 'teamA' ? 'Tim A' : 'Tim B'}]
                    </span>
                  )}
                  {g.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
