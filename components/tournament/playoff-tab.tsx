"use client";

export function PlayoffTab() {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6 overflow-x-auto shadow-xl">
      <div className="border-b border-border pb-3 text-center sm:text-left">
        <h3 className="text-xs font-black uppercase text-primary tracking-wider">
          🏆 Playoff Bracket
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Top 2 Group A & B dan Top 8 Global Standing.
        </p>
      </div>
      
      {/* BRACKET TREE WITH SIKU CONNECTOR LINES */}
      <div className="min-w-[850px] grid grid-cols-4 gap-8 text-xs py-4 relative px-2">
        
        {/* ROUND 1 (PLAY-INS) */}
        <div className="flex flex-col justify-around gap-8 relative">
          <span className="font-extrabold text-[10px] text-sky-400 uppercase tracking-widest border-b border-sky-500/30 pb-1 text-center">
            ROUND 1 (PLAY-INS)
          </span>

          {/* Match 1 & 2 Group Pair 1 */}
          <div className="flex flex-col gap-6 relative">
            <div className="relative">
              <BracketCard p1="Wildcard Seed 1" p2="Wildcard Seed 8" label="Play-Ins #1" />
              {/* Garis Horizontal ke Kanan */}
              <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-sky-500/60" />
            </div>

            <div className="relative">
              <BracketCard p1="Wildcard Seed 4" p2="Wildcard Seed 5" label="Play-Ins #2" />
              <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-sky-500/60" />
            </div>

            {/* Garis Vertikal Siku Penghubung Ke QF #1 & QF #2 */}
            <div className="absolute -right-4 top-[25%] bottom-[25%] w-[2px] bg-sky-500/60" />
            <div className="absolute -right-8 top-1/2 w-4 h-[2px] bg-sky-500/60" />
          </div>

          {/* Match 3 & 4 Group Pair 2 */}
          <div className="flex flex-col gap-6 relative">
            <div className="relative">
              <BracketCard p1="Wildcard Seed 2" p2="Wildcard Seed 7" label="Play-Ins #3" />
              <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-sky-500/60" />
            </div>

            <div className="relative">
              <BracketCard p1="Wildcard Seed 3" p2="Wildcard Seed 6" label="Play-Ins #4" />
              <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-sky-500/60" />
            </div>

            <div className="absolute -right-4 top-[25%] bottom-[25%] w-[2px] bg-sky-500/60" />
            <div className="absolute -right-8 top-1/2 w-4 h-[2px] bg-sky-500/60" />
          </div>
        </div>

        {/* QUARTER-FINAL */}
        <div className="flex flex-col justify-around gap-8 my-auto relative">
          <span className="font-extrabold text-[10px] text-amber-400 uppercase tracking-widest border-b border-amber-500/30 pb-1 text-center">
            QUARTER-FINAL
          </span>

          <div className="relative">
            <BracketCard p1="Top 1 Group A" p2="Winner Play-Ins #1" label="QF #1" isDirect />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-amber-500/60" />
          </div>

          <div className="relative">
            <BracketCard p1="Top 2 Group B" p2="Winner Play-Ins #2" label="QF #2" isDirect />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-amber-500/60" />
            {/* Siku ke SF #1 */}
            <div className="absolute -right-4 -top-[70%] bottom-[50%] w-[2px] bg-amber-500/60" />
            <div className="absolute -right-8 -top-[10%] w-4 h-[2px] bg-amber-500/60" />
          </div>

          <div className="relative">
            <BracketCard p1="Top 1 Group B" p2="Winner Play-Ins #3" label="QF #3" isDirect />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-amber-500/60" />
          </div>

          <div className="relative">
            <BracketCard p1="Top 2 Group A" p2="Winner Play-Ins #4" label="QF #4" isDirect />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-amber-500/60" />
            {/* Siku ke SF #2 */}
            <div className="absolute -right-4 -top-[70%] bottom-[50%] w-[2px] bg-amber-500/60" />
            <div className="absolute -right-8 -top-[10%] w-4 h-[2px] bg-amber-500/60" />
          </div>
        </div>

        {/* SEMI-FINAL */}
        <div className="flex flex-col justify-around gap-16 my-auto relative">
          <span className="font-extrabold text-[10px] text-emerald-400 uppercase tracking-widest border-b border-emerald-500/30 pb-1 text-center">
            SEMI-FINAL
          </span>

          <div className="relative">
            <BracketCard p1="Winner QF #1" p2="Winner QF #2" label="SF #1" />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-emerald-500/60" />
          </div>

          <div className="relative">
            <BracketCard p1="Winner QF #3" p2="Winner QF #4" label="SF #2" />
            <div className="absolute -right-4 top-1/2 w-4 h-[2px] bg-emerald-500/60" />
            {/* Siku ke Grand Final */}
            <div className="absolute -right-4 -top-[80%] bottom-[50%] w-[2px] bg-emerald-500/60" />
            <div className="absolute -right-8 -top-[15%] w-4 h-[2px] bg-emerald-500/60" />
          </div>
        </div>

        {/* GRAND FINAL */}
        <div className="flex flex-col justify-center my-auto">
          <span className="font-extrabold text-[10px] text-purple-400 uppercase tracking-widest border-b border-purple-500/30 pb-1 mb-3 text-center">
            GRAND FINAL
          </span>
          <div className="rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 p-4 text-center shadow-lg relative">
            <p className="font-black text-purple-300 text-xs uppercase tracking-widest">CHAMPIONSHIP</p>
            <div className="my-2 border-t border-purple-500/30" />
            <p className="text-[11px] font-bold text-slate-200">Winner SF #1</p>
            <p className="text-[10px] text-amber-400 font-extrabold my-0.5">VS</p>
            <p className="text-[11px] font-bold text-slate-200">Winner SF #2</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function BracketCard({ p1, p2, label, isDirect }: { p1: string; p2: string; label?: string; isDirect?: boolean }) {
  return (
    <div className={`rounded-xl border bg-background p-2.5 flex flex-col gap-1.5 shadow-sm transition hover:scale-[1.02] ${isDirect ? "border-amber-500/40 bg-amber-950/20" : "border-border"}`}>
      {label && <span className="text-[9px] font-black text-muted-foreground uppercase">{label}</span>}
      <div className="flex items-center justify-between font-bold text-[11px]">
        <span className={`truncate ${p1.startsWith("Top") ? "text-amber-400 font-extrabold" : ""}`}>{p1}</span>
        <span className="text-sky-400">0</span>
      </div>
      <div className="border-t border-border/40" />
      <div className="flex items-center justify-between font-bold text-[11px]">
        <span className="truncate">{p2}</span>
        <span className="text-sky-400">0</span>
      </div>
    </div>
  );
        }
