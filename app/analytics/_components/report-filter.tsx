"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";

export interface ReportFilterMatchItem {
  id: string;
  weekNumber: number;
  teamAName: string;
  teamBName: string;
}

export interface ReportFilterProps {
  selectedWeek: number | "";
  onWeekChange: (week: number) => void;
  availableWeeks: number[];
  selectedMatchId: string;
  onMatchChange: (matchId: string) => void;
  matchesInView: ReportFilterMatchItem[];
  isFilterActive: boolean;
  onReset: () => void;
}

export function ReportFilter({
  selectedWeek,
  onWeekChange,
  availableWeeks,
  selectedMatchId,
  onMatchChange,
  matchesInView,
  isFilterActive,
  onReset,
}: ReportFilterProps) {
  const [isWeekOpen, setIsWeekOpen] = useState(false);
  const [isMatchOpen, setIsMatchOpen] = useState(false);

  const weekRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (weekRef.current && !weekRef.current.contains(e.target as Node)) setIsWeekOpen(false);
      if (matchRef.current && !matchRef.current.contains(e.target as Node)) setIsMatchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeMatch = matchesInView.find((m) => m.id === selectedMatchId);

  return (
    <div className="bg-card border border-border p-3 rounded-2xl shadow-xs space-y-2.5">
      {/* BARIS 1: WEEK DROPDOWN & RESET (DIVISI DIHAPUS) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1" ref={weekRef}>
          <button
            type="button"
            onClick={() => {
              setIsWeekOpen(!isWeekOpen);
              setIsMatchOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span>{selectedWeek ? `Week ${selectedWeek}` : "Pilih Week"}</span>
            <ChevronDown className={`h-4 w-4 text-primary transition-transform shrink-0 ${isWeekOpen ? "rotate-180" : ""}`} />
          </button>

          {isWeekOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md">
              {availableWeeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    onWeekChange(w);
                    setIsWeekOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer ${
                    selectedWeek === w ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span>Week {w}</span>
                  {selectedWeek === w && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!isFilterActive}
          title="Reset Filter"
          className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl transition flex items-center justify-center ${
            isFilterActive
              ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600 cursor-pointer"
              : "bg-muted/20 text-muted-foreground/30 border border-border/30 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* BARIS 2: MATCH DROPDOWN FULL-WIDTH */}
      <div className="relative w-full" ref={matchRef}>
        <button
          type="button"
          disabled={!selectedWeek}
          onClick={() => {
            if (selectedWeek) {
              setIsMatchOpen(!isMatchOpen);
              setIsWeekOpen(false);
            }
          }}
          className={`w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold flex items-center justify-between transition shadow-2xs ${
            !selectedWeek
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "cursor-pointer hover:border-primary text-foreground"
          }`}
        >
          <span className="truncate">
            {activeMatch
              ? `${activeMatch.teamAName} vs ${activeMatch.teamBName}`
              : selectedWeek
              ? "Pilih Pertandingan..."
              : "Pilih Week Terlebih Dahulu"}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isMatchOpen ? "rotate-180" : ""}`} />
        </button>

        {isMatchOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md">
            {matchesInView.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Tidak ada match untuk Week ini
              </div>
            ) : (
              matchesInView.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onMatchChange(m.id);
                    setIsMatchOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition cursor-pointer text-left ${
                    selectedMatchId === m.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <span className="truncate">{m.teamAName} vs {m.teamBName}</span>
                  {selectedMatchId === m.id && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
      }
        
