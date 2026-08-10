"use client";

import { MatchScheduleItem } from "@/lib/types/tournament";
import { Check } from "lucide-react";

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
  const togglePlayerA = (ign: string) => {
    if (rosterA.includes(ign)) {
      setRosterA(rosterA.filter((p) => p !== ign));
    } else {
      if (rosterA.length >= 5) return;
      setRosterA([...rosterA, ign]);
    }
  };

  const togglePlayerB = (ign: string) => {
    if (rosterB.includes(ign)) {
      setRosterB(rosterB.filter((p) => p !== ign));
    } else {
      if (rosterB.length >= 5) return;
      setRosterB([...rosterB, ign]);
    }
  };

  const renderMultiSelectCard = (
    teamName: string,
    teamLogo: string,
    selectedList: string[],
    options: string[],
    onToggle: (ign: string) => void,
    isTeamA: boolean
  ) => {
    const isMax = selectedList.length >= 5;

    return (
      <div className="space-y-3 p-3.5 bg-muted/20 rounded-xl border border-border/40">
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <div className="flex items-center gap-2 font-black text-xs uppercase">
            <img src={teamLogo} alt="" className="h-4 w-4 object-contain" />
            <span className={isTeamA ? "text-primary" : "text-rose-500"}>{teamName}</span>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
              selectedList.length === 5
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-500 border-amber-500/30"
            }`}
          >
            {selectedList.length}/5 Pemain
          </span>
        </div>

        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground italic p-2">Roster tim tidak ditemukan di DB.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {options.map((ign) => {
              const isChecked = selectedList.includes(ign);
              const isDisabled = !isChecked && isMax;

              return (
                <button
                  key={ign}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onToggle(ign)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    isChecked
                      ? isTeamA
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-rose-500/15 border-rose-500 text-rose-500"
                      : isDisabled
                      ? "bg-background/40 border-border/30 text-muted-foreground/40 cursor-not-allowed"
                      : "bg-background/60 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{ign}</span>
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                      isChecked
                        ? isTeamA
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-rose-500 border-rose-500 text-white"
                        : "border-border bg-background"
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">2. Lineup Bertanding (Tepat 5 Pemain)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centang 5 pemain aktif dari roster resmi KV yang diturunkan dalam match ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {renderMultiSelectCard(
          match.teamAName,
          match.teamALogo,
          rosterA,
          availableIgnA,
          togglePlayerA,
          true
        )}
        {renderMultiSelectCard(
          match.teamBName,
          match.teamBLogo,
          rosterB,
          availableIgnB,
          togglePlayerB,
          false
        )}
      </div>
    </section>
  );
                      }
