"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";

export function RosterLineupBlock({
  match,
  rosterA,
  setRosterA,
  rosterB,
  setRosterB,
  availableIgnA,
  availableIgnB,
}: {
  match: MatchScheduleItem;
  rosterA: string[];
  setRosterA: (v: string[]) => void;
  rosterB: string[];
  setRosterB: (v: string[]) => void;
  availableIgnA: string[];
  availableIgnB: string[];
}) {
  const selectBase =
    "w-full rounded-lg border border-border bg-background/60 p-2 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer";

  const renderSlotSelect = (
    currentList: string[],
    setList: (v: string[]) => void,
    options: string[],
    index: number
  ) => (
    <div className="flex items-center gap-2">
      <span className="w-4 text-center text-xs font-bold text-primary">{index + 1}.</span>
      <select
        value={currentList[index] || ""}
        onChange={(e) => {
          const updated = [...currentList];
          updated[index] = e.target.value;
          setList(updated);
        }}
        className={selectBase}
      >
        <option value="">-- Pilih Pemain Roster DB --</option>
        {options.map((ign) => (
          <option key={ign} value={ign}>
            {ign}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">2. Lineup Bertanding (Tepat 5 Pemain)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilih 5 pemain aktif dari roster resmi KV yang diturunkan dalam match ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* TIM A */}
        <div className="space-y-2.5 p-3.5 bg-muted/20 rounded-xl border border-border/40">
          <div className="flex items-center gap-2 font-black text-xs text-primary uppercase pb-1 border-b border-border/30">
            <img src={match.teamALogo} alt="" className="h-4 w-4 object-contain" />
            <span>{match.teamAName}</span>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>{renderSlotSelect(rosterA, setRosterA, availableIgnA, i)}</div>
          ))}
        </div>

        {/* TIM B */}
        <div className="space-y-2.5 p-3.5 bg-muted/20 rounded-xl border border-border/40">
          <div className="flex items-center gap-2 font-black text-xs text-primary uppercase pb-1 border-b border-border/30">
            <img src={match.teamBLogo} alt="" className="h-4 w-4 object-contain" />
            <span>{match.teamBName}</span>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>{renderSlotSelect(rosterB, setRosterB, availableIgnB, i)}</div>
          ))}
        </div>
      </div>
    </section>
  );
}