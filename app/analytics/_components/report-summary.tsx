import { useMemo } from "react";
import { computeTeamSummary, GameRecord } from "./summary-helper";

interface ReportSummaryProps {
  games: GameRecord[];
  isFinished: boolean;
  scoreA: number;
  scoreB: number;
  liveInstruction: { nextGameNumber: number; stayTable: string; nextActionTeam: string } | null;
}

export function ReportSummary({
  games,
  isFinished,
  scoreA,
  scoreB,
  liveInstruction,
}: ReportSummaryProps) {
  const statA = useMemo(() => computeTeamSummary(games, true, scoreA), [games, scoreA]);
  const statB = useMemo(() => computeTeamSummary(games, false, scoreB), [games, scoreB]);

  if (!isFinished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xs space-y-1.5 text-xs">
        {liveInstruction ? (
          <>
            <div className="font-black text-amber-500 uppercase tracking-wide flex items-center justify-between text-[11px]">
              <span className="animate-pulse">Instruksi Game #{liveInstruction.nextGameNumber}</span>
              <span className="text-[9px] font-mono text-muted-foreground font-normal">
                {games.length} Game Dimainkan
              </span>
            </div>
            <div className="space-y-0.5 text-[10.5px]">
              <div className="text-foreground">• <strong>{liveInstruction.stayTable}</strong> (Stay table)</div>
              <div className="text-muted-foreground">• <strong>{liveInstruction.nextActionTeam}:</strong> (Next deck or repeat)</div>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-muted-foreground text-center">
            Pertandingan siap dimulai. Menunggu ronde pertama dari wasit.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="py-2.5 px-3 bg-muted/30 border-b border-border text-center">
        <span className="text-xs font-black uppercase tracking-wider text-foreground">
          Match Summary
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border/60 p-3 text-xs gap-x-2">
        {/* Kolom Tim A */}
        <div className="space-y-3 pr-1">
          {/* Top Player */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>⭐</span> Top Player
            </div>
            <div className="font-bold text-foreground truncate mt-0.5">
              {statA.topPlayer.ign} ({statA.topPlayer.wins}-{statA.topPlayer.losses})
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Agregat: <span className="font-semibold text-foreground/90">{statA.topPlayer.agregat > 0 ? `+${statA.topPlayer.agregat}` : statA.topPlayer.agregat}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Winrate: <span className="font-semibold text-foreground/90">{statA.topPlayer.wr}%</span>
            </div>
          </div>

          {/* Top Streak: Skill singkatan di bawah deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>🔥</span> Top Streak
            </div>
            <div className="font-bold text-foreground truncate mt-0.5">{statA.maxStreak.player}</div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
              Deck: <span className="font-semibold text-foreground/90">{statA.maxStreak.deck}</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Skill: <span className="font-semibold text-foreground/90">{statA.maxStreak.skillAbbr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {statA.maxStreak.count > 0 ? `${statA.maxStreak.count} Streak (${statA.maxStreak.range})` : "-"}
            </div>
          </div>

          {/* Agregat Tim */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>📊</span> Agregat Tim
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              Player Aktif: <span className="font-bold text-foreground">{statA.playerAktifCount}/5</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Winrate Tim: <span className="font-bold text-foreground">{statA.teamWR}%</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Player Poin: <span className="font-bold text-foreground">{statA.playerPoin}</span>
            </div>
          </div>

          {/* Most Played Deck: List singkatan skill di bawah deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>🃏</span> Most Played Deck
            </div>
            <div className="font-bold text-foreground truncate mt-0.5" title={statA.mostDeck.name}>
              {statA.mostDeck.name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5" title={statA.mostDeck.skillsList}>
              Skill: <span className="font-semibold text-foreground/90">{statA.mostDeck.skillsList}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Record: <span className="font-semibold text-foreground/90">{statA.mostDeck.recordStr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Winrate: <span className="font-semibold text-foreground/90">{statA.mostDeck.wrStr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Player: <span className="font-semibold text-foreground/90">{statA.mostDeck.users}</span>
            </div>
          </div>
        </div>

        {/* Kolom Tim B */}
        <div className="space-y-3 pl-2">
          {/* Top Player */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>⭐</span> Top Player
            </div>
            <div className="font-bold text-foreground truncate mt-0.5">
              {statB.topPlayer.ign} ({statB.topPlayer.wins}-{statB.topPlayer.losses})
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Agregat: <span className="font-semibold text-foreground/90">{statB.topPlayer.agregat > 0 ? `+${statB.topPlayer.agregat}` : statB.topPlayer.agregat}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Winrate: <span className="font-semibold text-foreground/90">{statB.topPlayer.wr}%</span>
            </div>
          </div>

          {/* Top Streak: Skill singkatan di bawah deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>🔥</span> Top Streak
            </div>
            <div className="font-bold text-foreground truncate mt-0.5">{statB.maxStreak.player}</div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
              Deck: <span className="font-semibold text-foreground/90">{statB.maxStreak.deck}</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Skill: <span className="font-semibold text-foreground/90">{statB.maxStreak.skillAbbr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {statB.maxStreak.count > 0 ? `${statB.maxStreak.count} Streak (${statB.maxStreak.range})` : "-"}
            </div>
          </div>

          {/* Agregat Tim */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>📊</span> Agregat Tim
            </div>
            <div className="text-[10.5px] text-muted-foreground mt-0.5">
              Player Aktif: <span className="font-bold text-foreground">{statB.playerAktifCount}/5</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Winrate Tim: <span className="font-bold text-foreground">{statB.teamWR}%</span>
            </div>
            <div className="text-[10.5px] text-muted-foreground">
              Player Poin: <span className="font-bold text-foreground">{statB.playerPoin}</span>
            </div>
          </div>

          {/* Most Played Deck: List singkatan skill di bawah deck */}
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <span>🃏</span> Most Played Deck
            </div>
            <div className="font-bold text-foreground truncate mt-0.5" title={statB.mostDeck.name}>
              {statB.mostDeck.name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate mt-0.5" title={statB.mostDeck.skillsList}>
              Skill: <span className="font-semibold text-foreground/90">{statB.mostDeck.skillsList}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Record: <span className="font-semibold text-foreground/90">{statB.mostDeck.recordStr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Winrate: <span className="font-semibold text-foreground/90">{statB.mostDeck.wrStr}</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              Player: <span className="font-semibold text-foreground/90">{statB.mostDeck.users}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
