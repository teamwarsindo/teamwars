import Image from "next/image";

interface ReportScoreboardProps {
  teamA: any;
  teamB: any;
  scoreA: number;
  scoreB: number;
  teamALogo?: string;
  teamBLogo?: string;
}

export function ReportScoreboard({
  teamA,
  teamB,
  scoreA,
  scoreB,
  teamALogo,
  teamBLogo,
}: ReportScoreboardProps) {
  return (
    <div className="sticky top-0 z-30 -mx-1 px-1 py-1">
      <div className="rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 p-3 sm:p-4 shadow-md">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Kubu A */}
          <div className="flex items-center gap-2 truncate">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/60 border border-border/80 shrink-0 overflow-hidden flex items-center justify-center">
              {teamALogo ? (
                <Image src={teamALogo} alt={teamA.name || "Tim A"} fill sizes="48px" className="object-contain p-1" />
              ) : (
                <span className="font-black text-xs text-primary">{teamA.name?.slice(0, 3).toUpperCase()}</span>
              )}
            </div>
            <div className="truncate">
              <div className="font-black text-xs sm:text-base text-foreground truncate">{teamA.name || "Tim A"}</div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                R: {teamA.repeatsUsed ?? 0}/2 • W: {teamA.warningsUsed ?? 0}/2
              </div>
            </div>
          </div>

          {/* Skor */}
          <div className="text-center px-2 shrink-0">
            <div className="text-2xl sm:text-4xl font-black tracking-tight leading-none flex items-center justify-center gap-1.5 font-mono">
              <span className={scoreA > scoreB ? "text-primary" : "text-foreground"}>{scoreA}</span>
              <span className="text-muted-foreground/40 text-lg sm:text-2xl font-sans">—</span>
              <span className={scoreB > scoreA ? "text-primary" : "text-foreground"}>{scoreB}</span>
            </div>
          </div>

          {/* Kubu B */}
          <div className="flex items-center justify-end gap-2 truncate text-right">
            <div className="truncate">
              <div className="font-black text-xs sm:text-base text-foreground truncate">{teamB.name || "Tim B"}</div>
              <div className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">
                R: {teamB.repeatsUsed ?? 0}/2 • W: {teamB.warningsUsed ?? 0}/2
              </div>
            </div>
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/60 border border-border/80 shrink-0 overflow-hidden flex items-center justify-center">
              {teamBLogo ? (
                <Image src={teamBLogo} alt={teamB.name || "Tim B"} fill sizes="48px" className="object-contain p-1" />
              ) : (
                <span className="font-black text-xs text-rose-500">{teamB.name?.slice(0, 3).toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
