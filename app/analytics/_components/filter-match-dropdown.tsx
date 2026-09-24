"use client";

import { AnalyticsFilterMatchItem } from "./analytics-filter";

interface FilterMatchDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  matchesInView: AnalyticsFilterMatchItem[];
  selectedMatchId?: string;
  onSelectMatch: (matchId: string) => void;
}

export function FilterMatchDropdown({
  isOpen,
  onToggle,
  matchesInView,
  selectedMatchId = "",
  onSelectMatch,
}: FilterMatchDropdownProps) {
  const activeMatch = matchesInView.find((m) => m.id === selectedMatchId);

  const renderScore = (sA?: number, sB?: number) => {
    if (sA === undefined || sB === undefined) return null;
    const aWin = sA >= 10;
    const bWin = sB >= 10;

    return (
      <span className="font-mono text-[10px] bg-muted/70 px-1.5 py-0.5 rounded-md border border-border/60 shrink-0">
        <span className={aWin ? "text-emerald-500 font-bold" : bWin ? "text-rose-500 font-bold" : "text-foreground/80 font-medium"}>
          {sA}
        </span>
        <span className="mx-0.5 text-muted-foreground/40">-</span>
        <span className={bWin ? "text-emerald-500 font-bold" : aWin ? "text-rose-500 font-bold" : "text-foreground/80 font-medium"}>
          {sB}
        </span>
      </span>
    );
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        disabled={matchesInView.length === 0}
        className={`w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold transition focus:outline-none cursor-pointer ${
          matchesInView.length === 0 ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-foreground"
        }`}
      >
        <span className="truncate flex items-center gap-1.5">
          {activeMatch ? (
            <>
              <span className="truncate">
                {activeMatch.teamAName} vs {activeMatch.teamBName}
              </span>
              {activeMatch.isFinished && renderScore(activeMatch.scoreA, activeMatch.scoreB)}
            </>
          ) : matchesInView.length === 0 ? (
            "Tidak ada jadwal yang cocok"
          ) : (
            "-- Pilih Pertandingan --"
          )}
        </span>
        <span className={`text-[10px] text-muted-foreground transition-transform ml-1 shrink-0 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && matchesInView.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl space-y-0.5">
          {matchesInView.map((m) => {
            const isSelected = m.id === selectedMatchId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMatch(m.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs text-left transition cursor-pointer ${
                  isSelected ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{m.teamAName}</span>
                    <span className="text-muted-foreground text-[10px] mx-1">vs</span>
                    <span className="font-medium text-foreground">{m.teamBName}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {m.isFinished && renderScore(m.scoreA, m.scoreB)}
                  {isSelected && <span className="text-primary font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
