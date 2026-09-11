"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check, RotateCcw } from "lucide-react";

export interface ReportFilterMatchItem {
  id: string;
  weekNumber: number;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  teamALogo?: string;
  teamBLogo?: string;
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
    /* z-50 memastikan seluruh komponen filter berada di atas sticky scoreboard */
    <div className="relative z-50 bg-card border border-border p-3 rounded-2xl shadow-xs space-y-2">
      {/* Baris 1: Filter Week & Reset */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1" ref={weekRef}>
          <button
            type="button"
            onClick={() => {
              setIsWeekOpen(!isWeekOpen);
              setIsMatchOpen(false);
            }}
            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-primary flex items-center justify-between transition hover:border-primary cursor-pointer shadow-2xs"
          >
            <span>{selectedWeek ? `Week ${selectedWeek}` : "Pilih Week"}</span>
            <ChevronDown className={`h-4 w-4 text-primary transition-transform shrink-0 ${isWeekOpen ? "rotate-180" : ""}`} />
          </button>

          {isWeekOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[60] max-h-48 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md">
              {availableWeeks.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    onWeekChange(w);
                    setIsWeekOpen(false);
                  }}
                  className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
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
          className={`h-9 w-9 shrink-0 rounded-xl transition flex items-center justify-center ${
            isFilterActive
              ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600 cursor-pointer"
              : "bg-muted/20 text-muted-foreground/30 border border-border/30 cursor-not-allowed"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Baris 2: Pemilih Match - Tepat Terkunci 4 Item (max-h-[144px]) */}
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
          className={`w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-between transition shadow-2xs ${
            !selectedWeek
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "cursor-pointer hover:border-primary text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {activeMatch ? (
              <>
                <span className="font-bold truncate">{activeMatch.teamAName}</span>
                <span className="text-muted-foreground/50 text-[11px] shrink-0">vs</span>
                <span className="font-bold truncate">{activeMatch.teamBName}</span>
              </>
            ) : selectedWeek ? (
              <span className="text-muted-foreground font-normal">Pilih Pertandingan...</span>
            ) : (
              <span className="text-muted-foreground font-normal">Pilih Week Terlebih Dahulu</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ml-1.5 ${isMatchOpen ? "rotate-180" : ""}`} />
        </button>

        {isMatchOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[60] max-h-[144px] overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md">
            {matchesInView.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-muted-foreground">
                Tidak ada pertandingan untuk Week ini
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
                  className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                    selectedMatchId === m.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-popover-foreground hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{m.teamAName}</span>
                    <span className="text-muted-foreground/50 text-[10px] shrink-0">vs</span>
                    <span className="truncate">{m.teamBName}</span>
                  </div>
                  {selectedMatchId === m.id && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
            }
